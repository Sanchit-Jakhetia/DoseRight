import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Types } from 'mongoose';
import { DoseLog, MedicationPlan, Patient, User, Device, type IDoseLog } from '../models';

export const getCaretakerOverview = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const caretakerId = req.userId;
    const patients = await Patient.find({
      'caretakers.userId': caretakerId,
      'caretakers.approved': true,
    })
      .populate({ path: 'userId', select: 'name' })
      .lean()
      .exec();

    if (!patients.length) {
      res.status(200).json({
        patients: [],
        schedule: [],
        refillAlerts: [],
        activity: [],
        summary: {
          patientCount: 0,
          dosesToday: 0,
          pendingToday: 0,
          avgAdherence: 0,
        },
      });
      return;
    }

    const patientIds = patients.map((p) => p._id);
    const patientNameMap = new Map<string, string>();
    for (const p of patients) {
      const user = p.userId as unknown as { name?: string } | null;
      patientNameMap.set(p._id.toString(), user?.name || 'Patient');
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const dayOfWeek = todayStart.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = await DoseLog.find({
      patientId: { $in: patientIds },
      scheduledAt: { $gte: sevenDaysAgo },
    })
      .populate({ path: 'medicationPlanId', select: 'medicationName medicationStrength medicationForm' })
      .sort({ scheduledAt: -1 })
      .lean()
      .exec();

    const adherenceByPatient = new Map<string, { taken: number; missed: number }>();
    for (const log of recentLogs as any[]) {
      const key = log.patientId.toString();
      const entry = adherenceByPatient.get(key) || { taken: 0, missed: 0 };
      if (log.status === 'taken') entry.taken += 1;
      if (log.status === 'missed' || log.status === 'skipped') entry.missed += 1;
      adherenceByPatient.set(key, entry);
    }

    const medicationPlans = await MedicationPlan.find({
      patientId: { $in: patientIds },
      active: true,
    }).lean();

    const todayDoseLogs = await DoseLog.find({
      patientId: { $in: patientIds },
      scheduledAt: { $gte: todayStart, $lt: todayEnd },
    })
      .populate({ path: 'medicationPlanId', select: 'medicationName medicationStrength medicationForm' })
      .lean();

    const doseLogMap = new Map<string, any>();
    for (const log of todayDoseLogs as any[]) {
      const key = `${log.patientId.toString()}_${log.medicationPlanId?.toString?.() || log.medicationPlanId}_${new Date(log.scheduledAt).getTime()}`;
      doseLogMap.set(key, log);
    }

    const scheduleAll: Array<{ patientId: string; scheduledAt: Date; status: string; medName: string }> = [];

    for (const plan of medicationPlans as any[]) {
      const times = Array.isArray(plan.times) ? plan.times : [];
      const daysOfWeek = Array.isArray(plan.daysOfWeek) ? plan.daysOfWeek.map((d: any) => Number(d)).filter((d: number) => !Number.isNaN(d)) : [];

      if (times.length === 0 || daysOfWeek.length === 0) {
        scheduleAll.push({
          patientId: plan.patientId.toString(),
          scheduledAt: todayStart,
          status: 'pending',
          medName: plan.medicationName || 'Unknown',
        });
        continue;
      }

      if (!daysOfWeek.includes(adjustedDay)) {
        continue;
      }

      for (const time of times) {
        const [hours, minutes] = String(time).split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) {
          continue;
        }

        const scheduledAt = new Date(todayStart);
        scheduledAt.setHours(hours, minutes, 0, 0);
        const key = `${plan.patientId.toString()}_${plan._id.toString()}_${scheduledAt.getTime()}`;
        const log = doseLogMap.get(key);
        scheduleAll.push({
          patientId: plan.patientId.toString(),
          scheduledAt,
          status: log?.status || 'pending',
          medName: plan.medicationName || 'Unknown',
        });
      }
    }

    scheduleAll.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    const nextDoseMap = new Map<string, any>();
    for (const item of scheduleAll) {
      if (item.status !== 'pending') continue;
      if (!nextDoseMap.has(item.patientId)) {
        nextDoseMap.set(item.patientId, {
          time: item.scheduledAt,
          medicine: item.medName,
        });
      }
    }

    const schedule = scheduleAll
      .slice(0, 20)
      .map((item) => ({
        id: `${item.patientId}_${item.scheduledAt.getTime()}`,
        patient: patientNameMap.get(item.patientId) || 'Patient',
        time: item.scheduledAt,
        med: item.medName,
        status: item.status,
      }));

    const refillThreshold = 5;
    const refillPlans = await MedicationPlan.find({
      patientId: { $in: patientIds },
      active: true,
      'stock.remaining': { $lte: refillThreshold },
    })
      .lean()
      .exec();

    const refillAlerts = refillPlans.map((plan) => {
      const remaining = plan.stock?.remaining ?? 0;
      return {
        id: plan._id.toString(),
        name: `${plan.medicationName} ${plan.medicationStrength || ''}`.trim(),
        patient: patientNameMap.get(plan.patientId.toString()) || 'Patient',
        remaining,
        severity: remaining <= 2 ? 'high' : 'medium',
      };
    });

    const activity = recentLogs.slice(0, 10).map((log: any) => {
      const plan = log.medicationPlanId as any;
      const patientName = patientNameMap.get(log.patientId.toString()) || 'Patient';
      const statusLabel = log.status === 'taken' ? 'took' : log.status === 'missed' || log.status === 'skipped' ? 'missed' : log.status;
      return {
        id: log._id.toString(),
        time: log.scheduledAt,
        text: `${patientName} ${statusLabel} ${plan?.medicationName || 'medicine'}`,
      };
    });

    let adherenceTotal = 0;
    let adherenceCount = 0;
    const patientsSummary = patients.map((p) => {
      const key = p._id.toString();
      const adherence = adherenceByPatient.get(key) || { taken: 0, missed: 0 };
      const total = adherence.taken + adherence.missed;
      const rate = total > 0 ? Math.round((adherence.taken / total) * 100) : 0;
      adherenceTotal += rate;
      adherenceCount += 1;

      const nextDose = nextDoseMap.get(key);
      return {
        id: key,
        name: patientNameMap.get(key) || 'Patient',
        nextDoseTime: nextDose?.time || null,
        nextDoseMedicine: nextDose?.medicine || null,
        adherence: rate,
        status: rate >= 85 ? 'On Track' : 'Needs Attention',
        alerts: adherence.missed > 0 ? 1 : 0,
      };
    });

    const avgAdherence = adherenceCount > 0 ? Math.round(adherenceTotal / adherenceCount) : 0;

    res.status(200).json({
      patients: patientsSummary,
      schedule,
      refillAlerts,
      activity,
      summary: {
        patientCount: patientsSummary.length,
        dosesToday: scheduleAll.length,
        pendingToday: scheduleAll.filter((item) => item.status === 'pending').length,
        avgAdherence,
      },
    });
  } catch (error) {
    console.error('Caretaker overview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDoctorOverview = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.userId;
    const patients = await Patient.find({ doctors: doctorId })
      .populate({ path: 'userId', select: 'name' })
      .lean()
      .exec();

    if (!patients.length) {
      res.status(200).json({
        patients: [],
        clinicalTasks: [],
        refillAlerts: [],
        activity: [],
        summary: {
          patientCount: 0,
          dosesToday: 0,
          avgAdherence: 0,
        },
      });
      return;
    }

    const patientIds = patients.map((p) => p._id);
    const patientNameMap = new Map<string, string>();
    for (const p of patients) {
      const user = p.userId as unknown as { name?: string } | null;
      patientNameMap.set(p._id.toString(), user?.name || 'Patient');
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = await DoseLog.find({
      patientId: { $in: patientIds },
      scheduledAt: { $gte: sevenDaysAgo },
    })
      .populate({ path: 'medicationPlanId', select: 'medicationName medicationStrength' })
      .sort({ scheduledAt: -1 })
      .lean()
      .exec();

    const adherenceByPatient = new Map<string, { taken: number; missed: number }>();
    for (const log of recentLogs as any[]) {
      const key = log.patientId.toString();
      const entry = adherenceByPatient.get(key) || { taken: 0, missed: 0 };
      if (log.status === 'taken') entry.taken += 1;
      if (log.status === 'missed' || log.status === 'skipped') entry.missed += 1;
      adherenceByPatient.set(key, entry);
    }

    const todayLogs = recentLogs.filter((log: any) => {
      const time = new Date(log.scheduledAt);
      return time >= todayStart && time < todayEnd;
    });

    const patientsSummary = patients.map((p) => {
      const key = p._id.toString();
      const adherence = adherenceByPatient.get(key) || { taken: 0, missed: 0 };
      const total = adherence.taken + adherence.missed;
      const rate = total > 0 ? Math.round((adherence.taken / total) * 100) : 0;
      const diagnosis = p.medicalProfile?.illnesses?.[0]?.name || '—';
      return {
        id: key,
        name: patientNameMap.get(key) || 'Patient',
        diagnosis,
        lastVisit: null,
        nextVisit: null,
        adherence: rate,
      };
    });

    const refillThreshold = 5;
    const refillPlans = await MedicationPlan.find({
      patientId: { $in: patientIds },
      active: true,
      'stock.remaining': { $lte: refillThreshold },
    })
      .lean()
      .exec();

    const refillAlerts = refillPlans.map((plan) => {
      const remaining = plan.stock?.remaining ?? 0;
      return {
        id: plan._id.toString(),
        name: `${plan.medicationName} ${plan.medicationStrength || ''}`.trim(),
        patient: patientNameMap.get(plan.patientId.toString()) || 'Patient',
        remaining,
        severity: remaining <= 2 ? 'high' : 'medium',
      };
    });

    const clinicalTasks = recentLogs
      .filter((log: any) => log.status === 'missed' || log.status === 'skipped')
      .slice(0, 6)
      .map((log: any) => {
        const plan = log.medicationPlanId as any;
        const patientName = patientNameMap.get(log.patientId.toString()) || 'Patient';
        const task = `Review missed dose for ${plan?.medicationName || 'medicine'}`;
        const isToday = new Date(log.scheduledAt) >= todayStart;
        return {
          id: log._id.toString(),
          patient: patientName,
          task,
          due: isToday ? 'Today' : 'Upcoming',
          priority: isToday ? 'high' : 'medium',
        };
      });

    const activity = recentLogs.slice(0, 10).map((log: any) => {
      const plan = log.medicationPlanId as any;
      const patientName = patientNameMap.get(log.patientId.toString()) || 'Patient';
      const statusLabel = log.status === 'taken' ? 'took' : log.status === 'missed' || log.status === 'skipped' ? 'missed' : log.status;
      return {
        id: log._id.toString(),
        time: log.scheduledAt,
        text: `${patientName} ${statusLabel} ${plan?.medicationName || 'medicine'}`,
      };
    });

    const adherenceTotal = patientsSummary.reduce((sum, p) => sum + p.adherence, 0);
    const avgAdherence = patientsSummary.length > 0 ? Math.round(adherenceTotal / patientsSummary.length) : 0;

    res.status(200).json({
      patients: patientsSummary,
      clinicalTasks,
      refillAlerts,
      activity,
      summary: {
        patientCount: patientsSummary.length,
        dosesToday: todayLogs.length,
        avgAdherence,
      },
    });
  } catch (error) {
    console.error('Doctor overview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMedicines = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Find patient by userId
    const patient = await Patient.findOne({ userId: req.userId });
    if (!patient) {
      res.status(404).json({ message: 'Patient profile not found' });
      return;
    }

    const medicationPlans = await MedicationPlan.find({
      patientId: patient._id,
      active: true,
    });
    res.status(200).json(medicationPlans);
  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addMedicine = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      medicationName,
      medicationStrength,
      medicationForm,
      dosagePerIntake,
      slotIndex,
      times,
      daysOfWeek,
      startDate,
      endDate,
      stock,
    } = req.body;

    // Validate required fields
    if (!medicationName || !dosagePerIntake || !times || !daysOfWeek || slotIndex === undefined) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // Find patient by userId
    const patient = await Patient.findOne({ userId: req.userId });
    if (!patient) {
      res.status(404).json({ message: 'Patient profile not found' });
      return;
    }

    // Verify patient has a device configured
    if (!patient.deviceId) {
      res.status(400).json({ message: 'Patient device not configured' });
      return;
    }

    const device = await Device.findById(patient.deviceId).lean().exec();
    if (!device) {
      res.status(400).json({ message: 'Patient device not found' });
      return;
    }

    const slotNumber = Number(slotIndex);
    if (!Number.isFinite(slotNumber) || slotNumber < 1 || slotNumber > device.slotCount) {
      res.status(400).json({ message: `slotIndex must be between 1 and ${device.slotCount}` });
      return;
    }

    const existingSlot = await MedicationPlan.findOne({
      patientId: patient._id,
      slotIndex: slotNumber,
      active: true,
    }).lean();
    if (existingSlot) {
      res.status(409).json({ message: 'Slot already assigned to another active medicine' });
      return;
    }

    // Create new medication plan
    const medicationPlan = new MedicationPlan({
      patientId: patient._id,
      deviceId: patient.deviceId,
      slotIndex: slotNumber,
      medicationName,
      medicationStrength,
      medicationForm: medicationForm || 'tablet',
      dosagePerIntake,
      times: Array.isArray(times) ? times : [times],
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      active: true,
      stock: stock || {
        remaining: 0,
        totalLoaded: 0,
      },
    });

    await medicationPlan.save();

    res.status(201).json({
      message: 'Medicine added successfully',
      medicationPlan,
    });
  } catch (error) {
    console.error('Add medicine error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateMedicine = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { medicationId } = req.params;
    const {
      medicationName,
      medicationStrength,
      medicationForm,
      dosagePerIntake,
      slotIndex,
      times,
      daysOfWeek,
      startDate,
      endDate,
      active,
      stockRemaining,
    } = req.body;

    if (!medicationId) {
      res.status(400).json({ message: 'Medication ID is required' });
      return;
    }

    const patient = await Patient.findOne({ userId: req.userId });
    if (!patient) {
      res.status(404).json({ message: 'Patient profile not found' });
      return;
    }

    const medicationPlan = await MedicationPlan.findOne({ _id: medicationId, patientId: patient._id });

    if (!medicationPlan) {
      res.status(404).json({ message: 'Medication not found' });
      return;
    }

    const nextSlotIndex = slotIndex !== undefined ? Number(slotIndex) : medicationPlan.slotIndex;
    const nextActive = active !== undefined ? Boolean(active) : medicationPlan.active;

    if (slotIndex !== undefined) {
      const device = await Device.findById(patient.deviceId).lean().exec();
      if (!device) {
        res.status(400).json({ message: 'Patient device not found' });
        return;
      }

      if (!Number.isFinite(nextSlotIndex) || nextSlotIndex < 1 || nextSlotIndex > device.slotCount) {
        res.status(400).json({ message: `slotIndex must be between 1 and ${device.slotCount}` });
        return;
      }
    }

    if (nextActive) {
      const existingSlot = await MedicationPlan.findOne({
        patientId: patient._id,
        slotIndex: nextSlotIndex,
        active: true,
        _id: { $ne: medicationId },
      }).lean();
      if (existingSlot) {
        res.status(409).json({ message: 'Slot already assigned to another active medicine' });
        return;
      }
    }

    const update: any = {};
    if (medicationName !== undefined) update.medicationName = medicationName;
    if (medicationStrength !== undefined) update.medicationStrength = medicationStrength;
    if (medicationForm !== undefined) update.medicationForm = medicationForm;
    if (dosagePerIntake !== undefined) update.dosagePerIntake = Number(dosagePerIntake);
    if (slotIndex !== undefined) update.slotIndex = nextSlotIndex;
    if (times !== undefined) update.times = Array.isArray(times) ? times : [times];
    if (daysOfWeek !== undefined) update.daysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek : [daysOfWeek];
    if (startDate !== undefined) update.startDate = startDate ? new Date(startDate) : new Date();
    if (endDate !== undefined) update.endDate = endDate ? new Date(endDate) : null;
    if (active !== undefined) update.active = nextActive;

    if (stockRemaining !== undefined) {
      const remaining = Number(stockRemaining);
      const existingTotal = medicationPlan.stock?.totalLoaded || 0;
      update.stock = {
        remaining,
        totalLoaded: Math.max(existingTotal, remaining),
        lastRefilledAt: medicationPlan.stock?.lastRefilledAt,
      };
    }

    Object.assign(medicationPlan, update);
    await medicationPlan.save();

    res.status(200).json({
      message: 'Medication updated successfully',
      medicationPlan,
    });
  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getScheduleToday = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Find patient by userId
    const patient = await Patient.findOne({ userId: req.userId });
    if (!patient) {
      res.status(404).json({ message: 'Patient profile not found' });
      return;
    }

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Convert to 1-7 format (1 = Monday, ..., 7 = Sunday)
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Get all active medications for this patient (includes scheduled and pending)
    const medications = await MedicationPlan.find({
      patientId: patient._id,
      active: true,
    });

    // Generate schedule for today from medications
    const scheduleMap = new Map<string, any>();

    for (const med of medications) {
      // Check if medication should be taken on today (coerce string values to numbers)
      const normalizedDays = Array.isArray(med.daysOfWeek)
        ? med.daysOfWeek.map((d: any) => Number(d)).filter((d: number) => !Number.isNaN(d))
        : [];
      if (!normalizedDays.includes(adjustedDay)) {
        continue;
      }

      // For each time in the medication schedule
      for (const time of med.times) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledAt = new Date(today);
        scheduledAt.setHours(hours, minutes, 0, 0);

        const key = `${scheduledAt.getTime()}`;

        // Check if there's already a DoseLog for this
        const existingDose = await DoseLog.findOne({
          patientId: patient._id,
          medicationPlanId: med._id,
          scheduledAt: new Date(scheduledAt),
        }).populate('medicationPlanId');

        if (existingDose) {
          scheduleMap.set(key, existingDose.toObject());
        } else {
          // Create a synthetic dose object for medicines that don't have DoseLog yet
          scheduleMap.set(key, {
            _id: `${med._id}_${scheduledAt.getTime()}`,
            patientId: patient._id,
            medicationPlanId: med.toObject(),
            scheduledAt,
            status: 'pending',
            takenAt: null,
          });
        }
      }
    }

    // Also get all medications that are active but don't have daysOfWeek/times set (pending medicines)
    const allActiveMeds = await MedicationPlan.find({
      patientId: patient._id,
      active: true,
    });

    for (const med of allActiveMeds) {
      // If no times are set (pending medicine) or no daysOfWeek, add as pending for today
      if (!med.times || med.times.length === 0 || !med.daysOfWeek || med.daysOfWeek.length === 0) {
        const key = `pending_${med._id}`;
        
        // Only add if not already in schedule
        if (!scheduleMap.has(key)) {
          scheduleMap.set(key, {
            _id: key,
            patientId: patient._id,
            medicationPlanId: med.toObject(),
            scheduledAt: today,
            status: 'pending',
            isPendingMedicine: true, // Flag to indicate this is a pending medicine without schedule
            takenAt: null,
          });
        }
      }
    }

    // Convert map to sorted array by scheduled time
    const schedules = Array.from(scheduleMap.values()).sort((a, b) => {
      // Pending medicines without schedules go to the end
      const aTime = a.isPendingMedicine ? Infinity : new Date(a.scheduledAt).getTime();
      const bTime = b.isPendingMedicine ? Infinity : new Date(b.scheduledAt).getTime();
      return aTime - bTime;
    });

    res.status(200).json(schedules);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdherence = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Find patient by userId
    const patient = await Patient.findOne({ userId: req.userId });
    if (!patient) {
      res.status(404).json({ message: 'Patient profile not found' });
      return;
    }

    const allSchedules: IDoseLog[] = await DoseLog.find({ patientId: patient._id });

    const taken = allSchedules.filter((s: IDoseLog) => s.status === 'taken').length;
    const missed = allSchedules.filter((s: IDoseLog) => s.status === 'missed' || s.status === 'skipped').length;
    const total = taken + missed;

    const rate = total > 0 ? (taken / total) * 100 : 0;

    res.status(200).json({
      taken,
      missed,
      rate: parseFloat(rate.toFixed(2)),
      takenPercent: Math.round(rate),
    });
  } catch (error) {
    console.error('Get adherence error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Find patient by userId
    const patient = await Patient.findOne({ userId: req.userId });
    if (!patient) {
      res.status(404).json({ message: 'Patient profile not found' });
      return;
    }

    const activeMedicines = await MedicationPlan.countDocuments({
      patientId: patient._id,
      active: true,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySchedules: IDoseLog[] = await DoseLog.find({
      patientId: patient._id,
      scheduledAt: { $gte: today, $lt: tomorrow },
    });

    const dosesTaken = todaySchedules.filter((s: IDoseLog) => s.status === 'taken').length;
    const dosesMissed = todaySchedules.filter((s: IDoseLog) => s.status === 'missed').length;

    res.status(200).json({
      activeMedicines,
      dosesTaken,
      dosesMissed,
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Find patient by userId
    const patient = await Patient.findOne({ userId: req.userId });
    if (!patient) {
      res.status(404).json({ message: 'Patient profile not found' });
      return;
    }

    // Get all dose logs for the patient
    const allLogs = await DoseLog.find({
      patientId: patient._id,
    }).populate('medicationPlanId').sort({ scheduledAt: -1 });

    // Calculate summary stats
    const totalTaken = allLogs.filter(log => log.status === 'taken').length;
    const totalMissed = allLogs.filter(log => log.status === 'missed').length;
    const total = totalTaken + totalMissed;
    const adherenceRate = total > 0 ? Math.round((totalTaken / total) * 100) : 0;

    // Calculate current streak (consecutive days with all doses taken)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const nextDay = new Date(checkDate);
      nextDay.setDate(checkDate.getDate() + 1);
      
      const dayLogs = allLogs.filter(log => {
        const logDate = new Date(log.scheduledAt);
        return logDate >= checkDate && logDate < nextDay;
      });
      
      if (dayLogs.length === 0) break;
      
      const allTaken = dayLogs.every(log => log.status === 'taken');
      if (!allTaken) break;
      
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Weekly trend (last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      const dayLogs = allLogs.filter(log => {
        const logDate = new Date(log.scheduledAt);
        return logDate >= date && logDate < nextDay;
      });
      
      const taken = dayLogs.filter(log => log.status === 'taken').length;
      const total = dayLogs.length;
      
      weeklyTrend.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toISOString(),
        taken,
        total,
      });
    }

    // History by medicine
    const medications = await MedicationPlan.find({
      patientId: patient._id,
      active: true,
    });

    const byMedicine = medications.map(med => {
      const medLogs = allLogs.filter(log => 
        log.medicationPlanId && log.medicationPlanId._id.toString() === med._id.toString()
      );
      
      const taken = medLogs.filter(log => log.status === 'taken').length;
      const total = medLogs.length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
      
      return {
        medicationName: med.medicationName,
        medicationStrength: med.medicationStrength,
        medicationForm: med.medicationForm,
        taken,
        total,
        adherenceRate,
      };
    });

    // Recent logs (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const recentLogs = allLogs
      .filter(log => new Date(log.scheduledAt) >= thirtyDaysAgo)
      .slice(0, 50);

    res.status(200).json({
      summary: {
        totalTaken,
        totalMissed,
        adherenceRate,
        currentStreak,
      },
      weeklyTrend,
      byMedicine,
      recentLogs,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Find user by userId
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Find patient profile
    const patient = await Patient.findOne({ userId: req.userId }).populate('deviceId');

    // Return user and patient data
    res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      patient: patient ? {
        medicalProfile: patient.medicalProfile,
        caretakers: patient.caretakers,
        doctors: patient.doctors,
      } : null,
      device: patient?.deviceId ? {
        deviceId: (patient.deviceId as any).deviceId,
        slotCount: (patient.deviceId as any).slotCount,
        timezone: (patient.deviceId as any).timezone,
        batteryLevel: (patient.deviceId as any).batteryLevel,
        wifiStrength: (patient.deviceId as any).wifiStrength,
        wifiConnected: (patient.deviceId as any).wifiConnected,
        lastStatus: (patient.deviceId as any).lastStatus,
        lastHeartbeatAt: (patient.deviceId as any).lastHeartbeatAt,
        firmwareVersion: (patient.deviceId as any).firmwareVersion,
        uptimeSeconds: (patient.deviceId as any).uptimeSeconds,
        storageFreeKb: (patient.deviceId as any).storageFreeKb,
        temperatureC: (patient.deviceId as any).temperatureC,
        lastError: (patient.deviceId as any).lastError,
      } : null,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, phone, allergies, illnesses, otherNotes } = req.body;

    // Update user information
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let userUpdated = false;
    if (name) {
      user.name = name;
      userUpdated = true;
    }
    if (phone !== undefined) {
      user.phone = phone;
      userUpdated = true;
    }
    
    if (userUpdated) {
      await user.save();
    }

    // Update or create patient medical profile
    let patient = await Patient.findOne({ userId: req.userId });
    
    if (!patient) {
      // Create patient profile if it doesn't exist
      patient = new Patient({
        userId: req.userId,
        medicalProfile: {
          allergies: [],
          illnesses: [],
          otherNotes: '',
        },
      });
    }

    // Ensure medicalProfile exists
    if (!patient.medicalProfile) {
      patient.medicalProfile = {
        allergies: [],
        illnesses: [],
        otherNotes: '',
      };
    }

    // Update medical profile fields
    let profileUpdated = false;
    if (allergies !== undefined) {
      patient.medicalProfile.allergies = allergies;
      profileUpdated = true;
    }
    
    if (illnesses !== undefined) {
      // Convert illness names to illness objects
      patient.medicalProfile.illnesses = illnesses.map((name: string) => ({
        name,
        status: 'ongoing',
      }));
      profileUpdated = true;
    }
    
    if (otherNotes !== undefined) {
      patient.medicalProfile.otherNotes = otherNotes;
      profileUpdated = true;
    }

    if (profileUpdated) {
      await patient.save();
    }

    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markDoseTaken = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { doseId } = req.params;

    let dose = null;

    if (doseId.includes('_')) {
      const [planId, timeMs] = doseId.split('_');
      if (!Types.ObjectId.isValid(planId) || !timeMs) {
        res.status(400).json({ message: 'Invalid doseId' });
        return;
      }

      const patient = await Patient.findOne({ userId: req.userId });
      if (!patient) {
        res.status(404).json({ message: 'Patient profile not found' });
        return;
      }

      const scheduledAt = new Date(Number(timeMs));
      if (Number.isNaN(scheduledAt.getTime())) {
        res.status(400).json({ message: 'Invalid scheduled time' });
        return;
      }

      dose = await DoseLog.findOne({
        patientId: patient._id,
        medicationPlanId: planId,
        scheduledAt,
      });

      if (!dose) {
        const plan = await MedicationPlan.findById(planId);
        if (!plan) {
          res.status(404).json({ message: 'Medication not found' });
          return;
        }

        dose = new DoseLog({
          patientId: patient._id,
          deviceId: patient.deviceId,
          medicationPlanId: plan._id,
          slotIndex: plan.slotIndex,
          scheduledAt,
          status: 'pending',
        });
      }
    } else {
      dose = await DoseLog.findById(doseId);
    }

    if (!dose) {
      res.status(404).json({ message: 'Dose not found' });
      return;
    }

    dose.status = 'taken';
    dose.takenAt = new Date();
    await dose.save();

    res.status(200).json({ message: 'Dose marked as taken', dose });
  } catch (error) {
    console.error('Mark dose error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markDoseMissed = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { doseId } = req.params;

    let dose = null;

    if (doseId.includes('_')) {
      const [planId, timeMs] = doseId.split('_');
      if (!Types.ObjectId.isValid(planId) || !timeMs) {
        res.status(400).json({ message: 'Invalid doseId' });
        return;
      }

      const patient = await Patient.findOne({ userId: req.userId });
      if (!patient) {
        res.status(404).json({ message: 'Patient profile not found' });
        return;
      }

      const scheduledAt = new Date(Number(timeMs));
      if (Number.isNaN(scheduledAt.getTime())) {
        res.status(400).json({ message: 'Invalid scheduled time' });
        return;
      }

      dose = await DoseLog.findOne({
        patientId: patient._id,
        medicationPlanId: planId,
        scheduledAt,
      });

      if (!dose) {
        const plan = await MedicationPlan.findById(planId);
        if (!plan) {
          res.status(404).json({ message: 'Medication not found' });
          return;
        }

        dose = new DoseLog({
          patientId: patient._id,
          deviceId: patient.deviceId,
          medicationPlanId: plan._id,
          slotIndex: plan.slotIndex,
          scheduledAt,
          status: 'pending',
        });
      }
    } else {
      dose = await DoseLog.findById(doseId);
    }

    if (!dose) {
      res.status(404).json({ message: 'Dose not found' });
      return;
    }

    dose.status = 'missed';
    await dose.save();

    res.status(200).json({ message: 'Dose marked as missed', dose });
  } catch (error) {
    console.error('Mark dose missed error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refillMedication = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { medicationId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Invalid refill amount' });
      return;
    }

    const medication = await MedicationPlan.findById(medicationId);
    if (!medication) {
      res.status(404).json({ message: 'Medication not found' });
      return;
    }

    // Initialize stock if not exists
    if (!medication.stock) {
      medication.stock = {
        totalLoaded: 0,
        remaining: 0,
      };
    }

    // Update stock
    medication.stock.remaining += amount;
    medication.stock.totalLoaded += amount;
    medication.stock.lastRefilledAt = new Date();
    await medication.save();

    res.status(200).json({ message: 'Medication refilled successfully', medication });
  } catch (error) {
    console.error('Refill medication error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDevice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { deviceId, timezone, slotCount } = req.body;

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      res.status(400).json({ message: 'Device ID is required and must be a valid string' });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // First, ensure patient exists for this user
    let patient = await Patient.findOne({ userId: req.userId });
    
    if (!patient) {
      // Create patient profile if it doesn't exist
      patient = new Patient({
        userId: req.userId,
        medicalProfile: {
          allergies: [],
          illnesses: [],
          otherNotes: '',
        },
      });
      await patient.save();
    }

    // Now find or create device with the patient ID
    let device = await Device.findOne({ deviceId: deviceId.trim() });
    
    if (!device) {
      device = new Device({
        deviceId: deviceId.trim(),
        patientId: patient._id,
        timezone: timezone || 'UTC',
        slotCount: parseInt(slotCount) || 4,
        batteryLevel: 100,
        wifiConnected: false,
      });
      await device.save();
    } else {
      // If device already exists, link it to the patient if not already linked
      if (!device.patientId || device.patientId.toString() !== patient._id.toString()) {
        device.patientId = patient._id;
        await device.save();
      }
    }

    // Link device to patient
    patient.deviceId = device._id;
    await patient.save();

    res.status(200).json({
      message: 'Device created/linked successfully',
      device: {
        id: device._id,
        deviceId: device.deviceId,
        timezone: device.timezone,
        slotCount: device.slotCount,
      },
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ message: 'Failed to create/link device. Please try again.' });
  }
};

