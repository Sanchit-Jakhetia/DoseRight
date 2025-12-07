import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DoseLog, MedicationPlan, Patient, type IDoseLog } from '../models';

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

    // Get all active medications for this patient
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

    // Convert map to sorted array by scheduled time
    const schedules = Array.from(scheduleMap.values()).sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

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
