import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getMedicines,
  getScheduleToday,
  getAdherence,
  getSummary,
  markDoseTaken,
  markDoseMissed,
  refillMedication,
  addMedicine,
} from '../controllers/dashboardController';

const router = Router();

// All dashboard routes require authentication
router.use(authMiddleware);

router.get('/medicines', getMedicines);
router.post('/medicines', addMedicine);
router.get('/schedule', getScheduleToday);
router.get('/adherence', getAdherence);
router.get('/summary', getSummary);
router.patch('/doses/:doseId/mark-taken', markDoseTaken);
router.patch('/doses/:doseId/mark-missed', markDoseMissed);
router.patch('/medications/:medicationId/refill', refillMedication);

export default router;
