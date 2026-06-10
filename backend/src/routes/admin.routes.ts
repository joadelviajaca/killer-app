import { Router } from 'express';
import { getUsers } from '../controllers/admin.controller';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Ruta protegida por DOBLE middleware: tienes que estar logueado Y ser admin
router.get('/users', verifyToken, requireAdmin, getUsers);

export default router;