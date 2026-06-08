import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'clave_fallback_insegura';

// 1. Extendemos la interfaz Request de Express para poder inyectarle nuestro usuario
export interface AuthRequest extends Request {
  user?: any; // Aquí guardaremos los datos del token desencriptado
}

// 2. Guardián Básico: Comprueba si el usuario está logueado
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // El estándar es enviar el token en la cabecera así: "Bearer eyJhbGci..."
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(403).json({ error: 'Acceso denegado. No se proporcionó un token válido.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Desencriptamos el token. Si es inválido o caducó, esto lanzará un error y saltará al catch
    const decoded = jwt.verify(token, SECRET);
    
    // Inyectamos los datos del usuario (id, email, isAdmin) en la petición
    req.user = decoded; 
    
    // Todo en orden, dejamos pasar la petición al controlador
    next(); 
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado. Vuelve a iniciar sesión.' });
  }
};

// 3. Guardián VIP: Comprueba si además es administrador
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Primero debe haber pasado por verifyToken, así que req.user ya debería existir
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de administrador.' });
    return;
  }
  
  next();
};