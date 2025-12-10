import { Router, Request, Response } from 'express';
import { Device, DoseLog, MedicationPlan } from '../models';
import { authDevice } from '../middleware/authDevice';

const hardwareRouter = Router();

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
        slot: log.slotIndex + 1,
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
 * Query doses with "pending" status scheduled for now or in the future.
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

    // Query DoseLog for upcoming pending doses
    const doseLogs = await DoseLog.find({
      deviceId: device._id,
      status: 'pending',
      scheduledAt: { $gte: now },
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
        slot: log.slotIndex + 1,
      };
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error in /upcoming endpoint:', error);
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
        slot: log.slotIndex + 1,
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
 *     wifiStrength?: number
 *   }
 * 
 * Response: { ok: true }
 */
hardwareRouter.post('/heartbeat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId, batteryLevel, wifiStrength } = req.body;

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

    await Device.findByIdAndUpdate(device._id, updateData, { new: true });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in /heartbeat endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default hardwareRouter;
