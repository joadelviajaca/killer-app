import { Request, Response } from 'express';
import db from '../db.js';

export const getUsers = async (req: Request, res: Response) => {
  try {
    // Obtenemos todos los usuarios, pero no enviamos las contraseñas
    const users = await db('users')
      .select('id', 'name', 'email', 'avatar', 'is_admin')
      .orderBy('id', 'desc');
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la lista de agentes.' });
  }
};