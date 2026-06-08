import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import db from '../db.js';

// Crear una nueva edición (Solo Admin)
export const createEdition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, start_date, end_date } = req.body;

    if (!title) {
      res.status(400).json({ error: 'El título de la edición es obligatorio (ej. "Killer Halloween")' });
      return;
    }

    // Insertamos la edición. Por defecto en nuestra BD el status es 'CREATING'
    const [id] = await db('editions').insert({
      title,
      start_date: start_date || null,
      end_date: end_date || null,
    });

    res.status(201).json({ 
      message: 'Edición creada con éxito. Abierta para inscripciones.', 
      edition: { id, title, status: 'CREATING' } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la edición' });
  }
};

// Obtener la edición actual para que los usuarios puedan unirse (Cualquier usuario)
export const getCurrentEdition = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscamos la edición más reciente que esté en fase de inscripción o activa
    const edition = await db('editions')
      .whereIn('status', ['CREATING', 'ACTIVE'])
      .orderBy('id', 'desc')
      .first();

    if (!edition) {
      res.json({ message: 'No hay ninguna edición activa en este momento', edition: null });
      return;
    }

    res.json({ edition });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la edición actual' });
  }
};

// Obtener el historial completo de ediciones (Solo Admin)
export const getAllEditions = async (req: Request, res: Response): Promise<void> => {
  try {
    const editions = await db('editions').select('*').orderBy('id', 'desc');
    res.json(editions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial de ediciones' });
  }
};

// --- 1. UNIRSE A UNA EDICIÓN ---
export const joinEdition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id: editionId } = req.params;

    // Comprobar que la edición existe y está en fase de creación
    const edition = await db('editions').where({ id: editionId }).first();
    if (!edition || edition.status !== 'CREATING') {
      res.status(400).json({ error: 'La edición no existe o ya no admite inscripciones.' });
      return;
    }

    // Insertar al participante
    await db('participants').insert({
      user_id: userId,
      edition_id: editionId,
      status: 'ALIVE'
    });

    res.status(201).json({ message: 'Te has inscrito a la edición con éxito.' });
  } catch (error: any) {
    // Capturamos el error de clave única si el usuario intenta unirse dos veces
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Ya estás inscrito en esta edición.' });
    } else {
      res.status(500).json({ error: 'Error al inscribirse.' });
    }
  }
};

// --- 2. ARRANCAR EL JUEGO (Crear el círculo) ---
export const startEdition = async (req: Request, res: Response): Promise<void> => {
  const { id: editionId } = req.params;

  try {
    // Iniciamos una transacción: o se guarda todo, o no se guarda nada
    await db.transaction(async (trx) => {
      // 1. Obtener participantes vivos de esta edición
      const participants = await trx('participants')
        .where({ edition_id: editionId, status: 'ALIVE' })
        .select('id');

      if (participants.length < 3) {
        throw new Error('Se necesitan al menos 3 jugadores para empezar.');
      }

      // 2. Obtener todas las misiones activas
      const missions = await trx('missions').where({ is_active: true }).select('id');
      if (missions.length === 0) {
        throw new Error('No hay misiones en la base de datos.');
      }

      // 3. Algoritmo Fisher-Yates para barajar a los participantes de forma aleatoria
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }

      // 4. Asignar objetivos y misiones
      for (let i = 0; i < participants.length; i++) {
        // El objetivo es la siguiente persona en el array (y el último apunta al primero)
        const target = participants[(i + 1) % participants.length];
        
        // Elegir una misión aleatoria
        const randomMission = missions[Math.floor(Math.random() * missions.length)];

        await trx('participants')
          .where({ id: participants[i].id })
          .update({
            target_id: target.id,
            mission_id: randomMission.id
          });
      }

      // 5. Cambiar el estado de la edición a ACTIVE
      await trx('editions').where({ id: editionId }).update({ status: 'ACTIVE' });
    }); // Fin de la transacción

    res.json({ message: '¡El juego ha comenzado! Objetivos y misiones asignados.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al iniciar la edición.' });
  }
};

// --- 3. FINALIZAR LA EDICIÓN ---
export const finishEdition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: editionId } = req.params;
    
    await db('editions')
      .where({ id: editionId })
      .update({ status: 'FINISHED' });

    res.json({ message: 'La edición ha finalizado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al finalizar la edición.' });
  }
};