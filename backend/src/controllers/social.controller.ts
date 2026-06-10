import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import db from '../db.js';

// --- 1. OBTENER EL RANKING (Blindado contra trampas) ---
export const getRanking = async (req: Request, res: Response): Promise<void> => {
  try {
    const edition = await db('editions')
      .whereIn('status', ['ACTIVE', 'FINISHED'])
      .orderBy('id', 'desc')
      .first();

    if (!edition) {
      res.json([]);
      return;
    }

    const ranking = await db('participants')
      .join('users', 'participants.user_id', 'users.id')
      .where('participants.edition_id', edition.id)
      .select(
        'users.avatar', // SOLAMENTE enviamos el avatar (o alias), NUNCA el nombre real
        'participants.status', 
        'participants.score', 
        'participants.death_reason'
      )
      .orderBy('participants.score', 'desc');

    res.json(ranking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el ranking' });
  }
};

// --- 2. OBTENER EL FEED (Muro de Muertes Blindado) ---
export const getFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const edition = await db('editions')
      .whereIn('status', ['ACTIVE', 'FINISHED'])
      .orderBy('id', 'desc')
      .first();

    if (!edition) {
      res.json([]);
      return;
    }

    const feed = await db('kills_log')
      .join('participants as killer_p', 'kills_log.killer_id', 'killer_p.id')
      .join('users as killer_u', 'killer_p.user_id', 'killer_u.id')
      .join('participants as victim_p', 'kills_log.victim_id', 'victim_p.id')
      .join('users as victim_u', 'victim_p.user_id', 'victim_u.id')
      .join('missions', 'kills_log.mission_id', 'missions.id')
      .where('kills_log.edition_id', edition.id)
      .select(
        'kills_log.id',
        'killer_u.id as killer_user_id',
        'killer_u.avatar as killer_avatar', // El asesino sigue en el anonimato
        'victim_u.name as victim_name',     // La víctima sí se publica con su nombre real
        'missions.description as mission',
        'kills_log.story',
        'kills_log.likes_count',
        'kills_log.created_at'
      )
      .orderBy('kills_log.created_at', 'desc');

    res.json(feed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el muro de muertes' });
  }
};

// --- 3. DAR LIKE A UNA MUERTE ---
export const likeKill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Incremento atómico directo en la base de datos
    await db('kills_log').where({ id }).increment('likes_count', 1);
    
    res.json({ message: 'Like registrado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el like' });
  }
};