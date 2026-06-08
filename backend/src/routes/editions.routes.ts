import { Router } from 'express';
import { 
  createEdition, 
  getCurrentEdition, 
  getAllEditions,
  joinEdition,
  startEdition,
  finishEdition 
} from '../controllers/editions.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas de Lectura
router.get('/current', verifyToken, getCurrentEdition);
router.get('/', verifyToken, requireAdmin, getAllEditions);

// Creación de Edición
router.post('/', verifyToken, requireAdmin, createEdition);

// Acciones sobre una edición específica (Fíjate en el parámetro :id)
router.post('/:id/join', verifyToken, joinEdition); // Cualquiera con token puede unirse
router.post('/:id/start', verifyToken, requireAdmin, startEdition); // Solo Admin
router.post('/:id/finish', verifyToken, requireAdmin, finishEdition); // Solo Admin

export default router;