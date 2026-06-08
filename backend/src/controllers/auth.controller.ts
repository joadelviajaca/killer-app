import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const SECRET = process.env.JWT_SECRET || 'clave_fallback_insegura';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // 1. Verificar si el usuario ya existe
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      res.status(400).json({ error: 'El email ya está registrado' });
      return;
    }

    // 2. Encriptar la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Guardar en la base de datos
    const [id] = await db('users').insert({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: 'Usuario registrado con éxito', userId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 0. Validar que se recibieron email y password
    if (!email || !password) {
      res.status(400).json({ error: 'Falta el email o la contraseña en la petición' });
      return;
    }

    // 1. Buscar al usuario
    const user = await db('users').where({ email }).first();
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // 2. Comprobar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // 3. Generar el Token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.is_admin },
      SECRET,
      { expiresIn: '7d' } // El usuario no tendrá que hacer login en una semana
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, name: user.name, isAdmin: user.is_admin }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};