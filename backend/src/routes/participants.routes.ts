import { Router } from 'express';
import { getMyStatus, confirmDeath, counterAttack, suicide, reportKill, getSuspects } from '../controllers/participants.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de participantes requieren estar logueado
router.use(verifyToken);

// Ver mi estado
router.get('/me', getMyStatus);

// Acciones de juego
router.get('/suspects', getSuspects);
router.post('/report-kill', reportKill);
router.post('/confirm-death', confirmDeath);
router.post('/counterattack', counterAttack);
router.post('/suicide', suicide);

export default router;