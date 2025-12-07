import { Router } from 'express';
import { signup, login, listUsers } from '../controllers/authController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/users', listUsers);

export default router;
