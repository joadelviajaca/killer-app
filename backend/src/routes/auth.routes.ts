import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';

const router = Router();

// Endpoint: POST /api/auth/register
router.post('/register', register);

// Endpoint: POST /api/auth/login
router.post('/login', login);

export default router;