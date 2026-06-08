import { Router } from 'express';
import { getMissions, createMission, createMissionsBulk } from '../controllers/missions.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Cualquier usuario logueado puede ver el banco de misiones (opcional, podrías restringirlo también a admin)
router.get('/', verifyToken, requireAdmin, getMissions);

// Endpoint masivo (Bulk)
router.post('/bulk', verifyToken, requireAdmin, createMissionsBulk);

// SOLO un administrador puede crear nuevas misiones
router.post('/', verifyToken, requireAdmin, createMission);

export default router;