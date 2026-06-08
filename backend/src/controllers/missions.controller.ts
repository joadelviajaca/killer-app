import { Request, Response } from 'express';
import db from '../db.js';

export const getMissions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtenemos todas las misiones de la base de datos
    const missions = await db('missions').select('*');
    res.json(missions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el banco de misiones' });
  }
};

export const createMission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { description, difficulty } = req.body;

    if (!description) {
      res.status(400).json({ error: 'La descripción de la misión es obligatoria' });
      return;
    }

    // Insertamos la nueva misión. Si no envían dificultad, por defecto será 'MEDIUM'
    const [id] = await db('missions').insert({
      description,
      difficulty: difficulty || 'MEDIUM',
      is_active: true
    });

    res.status(201).json({ 
      message: 'Misión añadida al banco con éxito', 
      mission: { id, description, difficulty: difficulty || 'MEDIUM' } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la misión' });
  }
};

export const createMissionsBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const missionsArray = req.body;

    // 1. Validar que nos han enviado un Array
    if (!Array.isArray(missionsArray) || missionsArray.length === 0) {
      res.status(400).json({ error: 'Debes enviar un array JSON válido y no vacío.' });
      return;
    }

    // 2. Filtrar y formatear los datos por seguridad
    // Nos aseguramos de que solo pasen los objetos que tengan 'description'
    const validMissions = missionsArray
      .filter((m: any) => m.description && typeof m.description === 'string')
      .map((m: any) => ({
        description: m.description.trim(),
        difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(m.difficulty) ? m.difficulty : 'MEDIUM',
        is_active: true
      }));

    if (validMissions.length === 0) {
      res.status(400).json({ error: 'El array no contenía misiones con un formato válido.' });
      return;
    }

    // 3. Inserción masiva en Knex (¡Mucha magia en una sola línea!)
    await db('missions').insert(validMissions);

    res.status(201).json({ 
      message: 'Importación masiva completada', 
      count: validMissions.length 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al importar las misiones' });
  }
};
