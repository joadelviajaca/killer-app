import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js'; // Importamos la conexión (fíjate en la extensión .js)
import { startCronJobs } from './services/cron.service.js';

// Importamos nuestras rutas
import authRoutes from './routes/auth.routes.js'; // Ruta para autenticación
import missionsRoutes from './routes/missions.routes.js';
import editionsRoutes from './routes/editions.routes.js';
import participantsRoutes from './routes/participants.routes.js';
import socialRoutes from './routes/social.routes.js';

// Cargamos las variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares básicos
app.use(cors()); // Permite que el frontend de React haga peticiones a esta API
app.use(express.json()); // Permite recibir datos en formato JSON en el body de las peticiones

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/editions', editionsRoutes);
app.use('/api/particpants', participantsRoutes);
app.use('/api/social', socialRoutes);

// Encender el motor de tareas automáticas
startCronJobs();

// Ruta de prueba para verificar el estado del servidor y la base de datos
app.get('/', async (req: Request, res: Response) => {
  try {
    // Hacemos una consulta muy simple a MySQL para verificar la conexión
    await db.raw('SELECT 1');
    
    res.json({
      status: '¡Vivo!',
      message: 'El backend de The Killer está funcionando correctamente 🗡️',
      database: 'Conectado a MySQL con éxito a través de Knex'
    });
  } catch (error) {
    console.error('Error crítico al conectar con la base de datos:', error);
    res.status(500).json({ 
      status: 'Error',
      message: 'El servidor funciona, pero la base de datos no responde',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});


// Iniciamos el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});