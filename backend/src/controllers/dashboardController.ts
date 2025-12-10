import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DoseLog, MedicationPlan, Patient, User, Device, type IDoseLog } from '../models';

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

    // Create new medication plan
    const medicationPlan = new MedicationPlan({
      patientId: patient._id,
      deviceId: patient.deviceId,
      slotIndex: Number(slotIndex),
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
      // Check if medication should be taken on today
      if (!med.daysOfWeek.includes(adjustedDay)) {
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
    const missed = allSchedules.filter((s: IDoseLog) => s.status === 'missed').length;
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
        wifiConnected: (patient.deviceId as any).wifiConnected,
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

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    await user.save();

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
    if (allergies !== undefined) {
      patient.medicalProfile.allergies = allergies;
    }
    
    if (illnesses !== undefined) {
      // Convert illness names to illness objects
      patient.medicalProfile.illnesses = illnesses.map((name: string) => ({
        name,
        status: 'ongoing',
      }));
    }
    
    if (otherNotes !== undefined) {
      patient.medicalProfile.otherNotes = otherNotes;
    }

    await patient.save();

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

    const dose = await DoseLog.findById(doseId);
    if (!dose) {
      res.status(404).json({ message: 'Dose not found' });
      return;
    }

    // Update dose status
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

    const dose = await DoseLog.findById(doseId);
    if (!dose) {
      res.status(404).json({ message: 'Dose not found' });
      return;
    }

    // Update dose status
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

    if (!deviceId) {
      res.status(400).json({ message: 'Device ID is required' });
      return;
    }

    // Find or create device
    let device = await Device.findOne({ deviceId });
    
    if (!device) {
      device = new Device({
        deviceId,
        timezone: timezone || 'UTC',
        slotCount: slotCount || 4,
        batteryLevel: 100,
        wifiConnected: true,
      });
      await device.save();
    }

    // Link device to patient
    const patient = await Patient.findOne({ userId: req.userId });
    
    if (patient) {
      patient.deviceId = device._id;
      await patient.save();
    } else {
      // Create patient with device if doesn't exist
      const newPatient = new Patient({
        userId: req.userId,
        deviceId: device._id,
        medicalProfile: {
          allergies: [],
          illnesses: [],
          otherNotes: '',
        },
      });
      await newPatient.save();
    }

    res.status(200).json({
      message: 'Device created/linked successfully',
      device: {
        deviceId: device.deviceId,
        timezone: device.timezone,
        slotCount: device.slotCount,
      },
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

