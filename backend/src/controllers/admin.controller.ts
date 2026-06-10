import { Request, Response } from 'express';
import db from '../db.js';
import { sendEmail } from '../services/email.service.js';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await db('users')
      .select('id', 'name', 'email', 'avatar', 'is_admin')
      .orderBy('id', 'desc');
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la lista de agentes.' });
  }
};

// NUEVO: Actualizar los datos de un usuario
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, avatar } = req.body;

    await db('users').where({ id }).update({
      name,
      email,
      avatar
    });

    res.json({ message: 'Datos del agente actualizados correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el agente.' });
  }
};

// NUEVO: Eliminar un usuario
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Medida de seguridad básica: Opcional, evitar que se borre a sí mismo si fuera necesario, 
    // pero como admin puedes borrar a quien quieras.
    await db('users').where({ id }).del();

    res.json({ message: 'Agente eliminado del sistema.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el agente. Es posible que esté vinculado a una edición activa.' });
  }
};

export const testEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Debes proporcionar un email destino para la prueba.' });
      return;
    }

    const success = await sendEmail(
      email,
      '🛠️ The Killer: Prueba de Sistema',
      `<h2>¡Sistema Operativo!</h2>
       <p>Si estás leyendo esto, la configuración de Nodemailer de tu servidor funciona perfectamente.</p>
       <p>El motor de The Killer está listo para enviar notificaciones de muerte.</p>`
    );

    if (success) {
      res.json({ message: 'Correo de prueba enviado. Revisa tu bandeja de entrada (y la carpeta de SPAM).' });
    } else {
      res.status(500).json({ error: 'Fallo al enviar el correo. Revisa los logs del servidor (docker logs) y tus credenciales SMTP.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al intentar usar el servicio de correo.' });
  }
};