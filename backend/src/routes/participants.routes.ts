import { Router } from 'express';
import { getMyStatus, confirmDeath, counterAttack, suicide, reportKill, getSuspects, disputeDeath, getPendingClaims, resolveClaim } from '../controllers/participants.controller.js';
import { requireAdmin, verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de participantes requieren estar logueado
router.use(verifyToken);

// Ver mi estado
router.get('/me', getMyStatus);

// Acciones de juego
router.get('/suspects', getSuspects);
router.post('/report-kill', reportKill);
router.post('/confirm-death', confirmDeath);
router.post('/dispute-death', disputeDeath);
router.post('/counterattack', counterAttack);
router.post('/suicide', suicide);


// Rutas de Admin
router.get('/claims', requireAdmin, getPendingClaims); // <-- NUEVA
router.post('/claims/:claimId/resolve', requireAdmin, resolveClaim); // <-- NUEVA


export default router;