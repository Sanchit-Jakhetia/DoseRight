import { Router, Request, Response } from 'express';
import { Device, Patient } from '../models';
import { authDevice } from '../middleware/authDevice';

const deviceRouter = Router();

const isHardwareTestMode = process.env.HARDWARE_TEST_MODE === 'true';

// Apply device authentication to all routes
deviceRouter.use(authDevice);

/**
 * GET /api/device/:deviceId/profile
 * 
 * Read-only device + patient profile for hardware.
 */
deviceRouter.get('/:deviceId/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    if (isHardwareTestMode) {
      res.status(200).json({
        success: true,
        device: {
          deviceId: 'DR-ESP32-001',
          name: 'Main Pill Dispenser',
          status: 'online',
          batteryLevel: 85,
          wifiStrength: -45,
          lastHeartbeat: new Date().toISOString(),
        },
        patient: {
          displayName: 'Patient',
          timezone: 'Asia/Kolkata',
          medicalProfile: {
            illnesses: ['Type 2 Diabetes', 'Hypertension'],
            allergies: ['Penicillin', 'Sulfa drugs'],
            notes: 'Avoid NSAIDs due to kidney concerns',
          },
        },
        support: {
          caretaker: {
            name: 'Daughter',
            relationship: 'Primary Caretaker',
          },
        },
        meta: {
          syncedAt: new Date().toISOString(),
          apiVersion: '1.0',
        },
      });
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
    const approvedCaretaker = patient.caretakers?.find((c) => c.approved);
    const caretakerUser = approvedCaretaker?.userId as unknown as { name?: string } | null;

    const illnesses = patient.medicalProfile?.illnesses?.map((illness) => illness.name) || [];
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
    console.error('Error in /device/:deviceId/profile endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default deviceRouter;