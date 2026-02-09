import { Router, Request, Response } from 'express';
import { Device, DoseLog, MedicationPlan, Patient } from '../models';
import { authDevice } from '../middleware/authDevice';

const hardwareRouter = Router();

const isHardwareTestMode = process.env.HARDWARE_TEST_MODE === 'true';
const DISPENSED_RETRY_MINUTES = 5;
const UPCOMING_GRACE_MINUTES = 30;

// Apply device authentication to all routes
hardwareRouter.use(authDevice);

/**
 * Shared helper: Format dosage as "<dosagePerIntake> x <medicationStrength>"
 */
function formatDosage(dosagePerIntake: number, medicationStrength?: string): string {
  if (medicationStrength) {
    return `${dosagePerIntake} x ${medicationStrength}`;
  }
  return `${dosagePerIntake} unit`;
}

/**
 * Shared helper: Format time as HH:MM (24-hour format)
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Shared helper: Format time as hh:MM (12-hour format)
 */
function formatTime12(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * GET /api/hardware/time
 * 
 * Get server time for device sync.
 * 
 * Query params:
 *   - deviceId (optional): The device identifier
 * 
 * Response:
 *   {
 *     deviceId: string | null,
 *     iso: string,
 *     epochMs: number,
 *     epochSeconds: number,
 *     tzOffsetMinutes: number,
 *     timezone: string | null,
 *     localTime24: string,
 *     localTime12: string
 *   }
 */
hardwareRouter.get('/time', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
    let timezone: string | undefined;

    if (deviceId) {
      const device = await Device.findOne({ deviceId }).lean().exec();
      timezone = device?.timezone;
    }

    const responsePayload = {
      deviceId: deviceId || null,
      iso: now.toISOString(),
      epochMs: now.getTime(),
      epochSeconds: Math.floor(now.getTime() / 1000),
      tzOffsetMinutes: now.getTimezoneOffset(),
      timezone: timezone || null,
      localTime24: formatTime(now),
      localTime12: formatTime12(now),
    };

    if (isHardwareTestMode) {
      res.status(200).json({
        ...responsePayload,
        mocked: true,
      });
      return;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error in /time endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/hardware/profile
 * 
 * Query params:
 *   - deviceId (required): The device identifier
 */
hardwareRouter.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    const device = await Device.findOne({ deviceId }).lean().exec();
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    const patient = await Patient.findOne({ deviceId: device._id })
      .populate({ path: 'userId', select: 'name' })
      .populate({ path: 'caretakers.userId', select: 'name role' })
      .lean()
      .exec();

    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const patientUser = patient.userId as unknown as { name?: string } | null;
    const approvedCaretaker = patient.caretakers?.find((c: { approved?: boolean }) => c.approved);
    const caretakerUser = approvedCaretaker?.userId as unknown as { name?: string } | null;

    const illnesses = patient.medicalProfile?.illnesses?.map((illness: { name?: string }) => illness.name) || [];
    const allergies = patient.medicalProfile?.allergies || [];

    res.status(200).json({
      success: true,
      device: {
        deviceId: device.deviceId,
        name: device.name || 'Device',
        status: device.lastStatus || 'offline',
        batteryLevel: device.batteryLevel ?? null,
        wifiStrength: device.wifiStrength ?? null,
        lastHeartbeat: device.lastHeartbeatAt ? device.lastHeartbeatAt.toISOString() : null,
      },
      patient: {
        displayName: patientUser?.name || 'Patient',
        timezone: device.timezone || 'Asia/Kolkata',
        medicalProfile: {
          illnesses,
          allergies,
          notes: patient.medicalProfile?.otherNotes || '',
        },
      },
      support: {
        caretaker: approvedCaretaker
          ? {
              name: caretakerUser?.name || 'Caretaker',
              relationship: approvedCaretaker.relationship || 'Caretaker',
            }
          : null,
      },
      meta: {
        syncedAt: new Date().toISOString(),
        apiVersion: '1.0',
      },
    });
  } catch (error) {
    console.error('Error in /profile endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/hardware/taken
 * 
 * Query doses marked as "taken" within the last 7 days.
 * 
 * Query params:
 *   - deviceId (required): The device identifier
 * 
 * Response: { data: [...] }
 */
hardwareRouter.get('/taken', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.query;

    // Validate deviceId parameter
    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    // Find device by deviceId
    const device = await Device.findOne({ deviceId });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Calculate date range: last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Query DoseLog for taken doses
    const doseLogs = await DoseLog.find({
      deviceId: device._id,
      status: 'taken',
      scheduledAt: { $gte: sevenDaysAgo },
    })
      .populate('medicationPlanId')
      .lean()
      .exec();

    // Transform to response format
    const data = doseLogs.map((log: any) => {
      const plan = log.medicationPlanId as any;
      return {
        medicineName: plan?.medicationName || 'Unknown',
        dosage: formatDosage(plan?.dosagePerIntake, plan?.medicationStrength),
        scheduledTime: formatTime(new Date(log.scheduledAt)),
        status: log.status,
        slot: log.slotIndex,
      };
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error in /taken endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/hardware/upcoming
 * 
 * Query all upcoming doses ordered by time.
 * Doses remain visible until marked as "skipped" or "taken" by the device.
 * After the scheduled time passes, keep the dose visible for 5 minutes if no update is received.
 * If a dose was "dispensed" and there is no response for 5 minutes, it is set back to "pending".
 * 
 * Query params:
 *   - deviceId (required): The device identifier
 * 
 * Response: { data: [...] }
 */
hardwareRouter.get('/upcoming', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.query;

    // Validate deviceId parameter
    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    // Find device by deviceId
    const device = await Device.findOne({ deviceId });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const dispensedRetryAt = new Date(now.getTime() - DISPENSED_RETRY_MINUTES * 60 * 1000);
    const graceWindowStart = new Date(now.getTime() - UPCOMING_GRACE_MINUTES * 60 * 1000);

    await DoseLog.updateMany(
      {
        deviceId: device._id,
        status: 'dispensed',
        dispensedAt: { $lte: dispensedRetryAt },
      },
      {
        $set: { status: 'pending', dispensedAt: null },
      }
    ).exec();

    await DoseLog.updateMany(
      {
        deviceId: device._id,
        status: { $in: ['pending', 'dispensed'] },
        scheduledAt: { $lte: graceWindowStart },
      },
      {
        $set: { status: 'missed' },
      }
    ).exec();


    const patient = await Patient.findOne({ deviceId: device._id }).lean().exec();
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    // Query DoseLogs in the window to avoid duplicates and include doseId
    const doseLogs = await DoseLog.find({
      deviceId: device._id,
      scheduledAt: { $gte: graceWindowStart, $lt: windowEnd },
    })
      .populate('medicationPlanId')
      .lean()
      .exec();

    const doseLogKeySet = new Set<string>();
    const upcomingItems: Array<{ scheduledAt: Date; data: any }> = [];

    for (const log of doseLogs as any[]) {
      const plan = log.medicationPlanId as any;
      const scheduledAt = new Date(log.scheduledAt);
      if (scheduledAt < graceWindowStart) {
        continue;
      }
      const key = `${plan?._id?.toString() || 'unknown'}_${scheduledAt.getTime()}`;
      doseLogKeySet.add(key);

      if (log.status === 'pending' || log.status === 'dispensed') {
        upcomingItems.push({
          scheduledAt,
          data: {
            doseId: log._id?.toString?.() || String(log._id),
            medicineName: plan?.medicationName || 'Unknown',
            dosage: formatDosage(plan?.dosagePerIntake, plan?.medicationStrength),
            scheduledTime: formatTime(scheduledAt),
            status: log.status,
            slot: log.slotIndex,
          },
        });
      }
    }

    // Fallback to medication plans when DoseLogs are not yet created
    const medicationPlans = await MedicationPlan.find({
      deviceId: device._id,
      active: true,
    })
      .lean()
      .exec();

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    const tomorrowDay = tomorrow.getDay();
    const adjustedTomorrow = tomorrowDay === 0 ? 7 : tomorrowDay;

    for (const plan of medicationPlans as any[]) {
      const times = Array.isArray(plan.times) ? plan.times : [];
      const daysOfWeek = Array.isArray(plan.daysOfWeek) ? plan.daysOfWeek : [];

      const scheduleDays = [
        { date: today, day: adjustedDay },
        { date: tomorrow, day: adjustedTomorrow },
      ];

      for (const schedule of scheduleDays) {
        if (!daysOfWeek.includes(schedule.day)) {
          continue;
        }

        for (const time of times) {
          const [hours, minutes] = time.split(':').map(Number);
          if (Number.isNaN(hours) || Number.isNaN(minutes)) {
            continue;
          }

          const scheduledAt = new Date(schedule.date);
          scheduledAt.setHours(hours, minutes, 0, 0);

          if (scheduledAt >= windowEnd || scheduledAt < graceWindowStart) {
            continue;
          }

          const key = `${plan._id.toString()}_${scheduledAt.getTime()}`;
          if (doseLogKeySet.has(key)) {
            continue;
          }

          const newDose = await DoseLog.create({
            patientId: patient._id,
            deviceId: device._id,
            medicationPlanId: plan._id,
            slotIndex: plan.slotIndex ?? 0,
            scheduledAt,
            status: 'pending',
          });

          upcomingItems.push({
            scheduledAt,
            data: {
              doseId: newDose._id?.toString?.() || String(newDose._id),
              medicineName: plan.medicationName || 'Unknown',
              dosage: formatDosage(plan.dosagePerIntake, plan.medicationStrength),
              scheduledTime: formatTime(scheduledAt),
              status: 'pending',
              slot: plan.slotIndex ?? 0,
            },
          });
        }
      }
    }

    const data = upcomingItems
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .map((item) => item.data);

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error in /upcoming endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/hardware/doses/:doseId/mark-taken
 * 
 * Mark a dose as taken by the device.
 * 
 * Body:
 *   {
 *     deviceId: string (required)
 *   }
 */
hardwareRouter.patch('/doses/:doseId/mark-taken', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doseId } = req.params;
    const { deviceId } = req.body;

    if (!doseId) {
      res.status(400).json({ message: 'doseId is required' });
      return;
    }

    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    const device = await Device.findOne({ deviceId }).lean().exec();
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    const dose = await DoseLog.findOneAndUpdate(
      { _id: doseId, deviceId: device._id },
      { $set: { status: 'taken', takenAt: new Date() } },
      { new: true }
    ).exec();

    if (!dose) {
      res.status(404).json({ message: 'Dose not found' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in /doses/:doseId/mark-taken endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/hardware/doses/:doseId/mark-skipped
 * 
 * Mark a dose as missed by the device.
 * 
 * Body:
 *   {
 *     deviceId: string (required)
 *   }
 */
hardwareRouter.patch('/doses/:doseId/mark-skipped', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doseId } = req.params;
    const { deviceId } = req.body;

    if (!doseId) {
      res.status(400).json({ message: 'doseId is required' });
      return;
    }

    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    const device = await Device.findOne({ deviceId }).lean().exec();
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    const dose = await DoseLog.findOneAndUpdate(
      { _id: doseId, deviceId: device._id },
      { $set: { status: 'missed' } },
      { new: true }
    ).exec();

    if (!dose) {
      res.status(404).json({ message: 'Dose not found' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in /doses/:doseId/mark-skipped endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/hardware/missed
 * 
 * Query doses marked as "missed" within the last 7 days.
 * 
 * Query params:
 *   - deviceId (required): The device identifier
 * 
 * Response: { data: [...] }
 */
hardwareRouter.get('/missed', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.query;

    // Validate deviceId parameter
    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    // Find device by deviceId
    const device = await Device.findOne({ deviceId });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Calculate date range: last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Query DoseLog for missed doses
    const doseLogs = await DoseLog.find({
      deviceId: device._id,
      status: 'missed',
      scheduledAt: { $gte: sevenDaysAgo },
    })
      .populate('medicationPlanId')
      .lean()
      .exec();

    // Transform to response format
    const data = doseLogs.map((log: any) => {
      const plan = log.medicationPlanId as any;
      return {
        medicineName: plan?.medicationName || 'Unknown',
        dosage: formatDosage(plan?.dosagePerIntake, plan?.medicationStrength),
        scheduledTime: formatTime(new Date(log.scheduledAt)),
        status: log.status,
        slot: log.slotIndex,
      };
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error in /missed endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/hardware/heartbeat
 * 
 * Receive device heartbeat and update device status.
 * 
 * Body:
 *   {
 *     deviceId: string (required),
 *     batteryLevel?: number (0-100),
 *     wifiStrength?: number,
 *     wifiConnected?: boolean,
 *     firmwareVersion?: string,
 *     uptimeSeconds?: number,
 *     storageFreeKb?: number,
 *     temperatureC?: number,
 *     lastError?: string | null
 *   }
 * 
 * Response: { ok: true }
 */
hardwareRouter.post('/heartbeat', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      deviceId,
      batteryLevel,
      wifiStrength,
      wifiConnected,
      firmwareVersion,
      uptimeSeconds,
      storageFreeKb,
      temperatureC,
      lastError,
    } = req.body;

    // Validate deviceId
    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    // Find device by deviceId
    const device = await Device.findOne({ deviceId });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Update device with new heartbeat info
    const updateData: any = {
      lastHeartbeatAt: new Date(),
      lastStatus: 'online',
    };

    // Add optional fields if provided
    if (typeof batteryLevel === 'number') {
      updateData.batteryLevel = batteryLevel;
    }
    if (typeof wifiStrength === 'number') {
      updateData.wifiStrength = wifiStrength;
    }
    if (typeof wifiConnected === 'boolean') {
      updateData.wifiConnected = wifiConnected;
    }
    if (typeof firmwareVersion === 'string' && firmwareVersion.trim()) {
      updateData.firmwareVersion = firmwareVersion.trim();
    }
    if (typeof uptimeSeconds === 'number' && uptimeSeconds >= 0) {
      updateData.uptimeSeconds = uptimeSeconds;
    }
    if (typeof storageFreeKb === 'number' && storageFreeKb >= 0) {
      updateData.storageFreeKb = storageFreeKb;
    }
    if (typeof temperatureC === 'number') {
      updateData.temperatureC = temperatureC;
    }
    if (lastError === null || typeof lastError === 'string') {
      updateData.lastError = lastError;
    }

    await Device.findByIdAndUpdate(device._id, updateData, { new: true });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in /heartbeat endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default hardwareRouter;
