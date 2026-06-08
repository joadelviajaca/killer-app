import { Router } from 'express';
import { getRanking, getFeed, likeKill } from '../controllers/social.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las consultas sociales requieren estar logueado en el juego
router.use(verifyToken);

router.get('/ranking', getRanking);
router.get('/feed', getFeed);
router.post('/feed/:id/like', likeKill);

export default router;