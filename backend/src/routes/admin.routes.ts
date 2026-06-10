import { Router } from 'express';
import { getUsers, updateUser, deleteUser, testEmailConfig } from '../controllers/admin.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Aplicamos el middleware a todas las rutas de este archivo
router.use(verifyToken, requireAdmin);

router.get('/users', getUsers);
router.put('/users/:id', updateUser); // NUEVA
router.delete('/users/:id', deleteUser); // NUEVA
router.post('/test-email', testEmailConfig);

export default router;