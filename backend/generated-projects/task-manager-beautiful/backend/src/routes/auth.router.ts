
import { Router } from 'express';
import { DefaultController } from '../controllers/default.controller';

const router = Router();
const authController = new DefaultController();

router.post('/login', authController.login);
router.post('/register', authController.register);

export default router;
