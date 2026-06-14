import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import db from '../db.js';
import { sendEmail } from '../services/email.service.js';

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

    try {
      // 1. Obtenemos a todos los participantes con sus datos, misiones y el nombre de su objetivo
      const playersToNotify = await db('participants')
        .join('users', 'participants.user_id', 'users.id')
        // Unimos de nuevo con participants para sacar el usuario que es el objetivo
        .join('participants as p_target', 'participants.target_id', 'p_target.id')
        .join('users as target_user', 'p_target.user_id', 'target_user.id')
        .join('missions', 'participants.mission_id', 'missions.id')
        .where('participants.edition_id', id)
        .select(
          'users.email',
          'users.name as killer_name',
          'target_user.name as target_name',
          'missions.description as mission'
        );

      // 2. Preparamos y enviamos todos los correos en paralelo
      const emailPromises = playersToNotify.map(player => {
        const subject = '🎯 THE KILLER: Tienes un nuevo contrato';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; color: #f3f4f6; padding: 20px; border-radius: 10px;">
            <h2 style="color: #ef4444; border-bottom: 1px solid #374151; padding-bottom: 10px;">EL JUEGO HA COMENZADO</h2>
            <p>Agente <strong>${player.killer_name}</strong>, la central te ha asignado un objetivo. Tu contrato es oficial.</p>
            
            <div style="background-color: #7f1d1d; color: white; padding: 15px; border-radius: 5px; margin: 25px 0; border: 1px solid #ef4444;">
              <h3 style="margin-top: 0; color: #fca5a5; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Tu objetivo clasificado:</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">🎯 ${player.target_name}</p>
              
              <h3 style="margin-top: 20px; color: #fca5a5; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Arma / Método autorizado:</h3>
              <p style="font-size: 18px; font-style: italic; margin-bottom: 0;">"${player.mission}"</p>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px;"><strong>Recuerda:</strong> Discreción absoluta. Si tu objetivo descubre tu identidad y te acusa usando la Defensa Activa, serás eliminado inmediatamente.</p>
            <p style="color: #9ca3af; font-size: 14px;">Entra en la <a href="https://killer.intranetjacaranda.es" style="color: #60a5fa;">Intranet de The Killer</a> para acceder a tu panel de control, reportar tu asesinato o ver el Muro Social.</p>
            
            <p style="margin-top: 30px; font-weight: bold; color: #ef4444;">Buena caza.</p>
          </div>
        `;
        
        return sendEmail(player.email, subject, html);
      });

      // Usamos allSettled para que si falla un correo (ej. email falso) no bloquee el resto
      await Promise.allSettled(emailPromises);
      console.log(`Se enviaron los correos de inicio a ${playersToNotify.length} agentes.`);

    } catch (emailError) {
      // Atrapamos el error silenciosamente. 
      // El juego ya se ha creado bien en la BD, no queremos devolver un error 500 por culpa del correo.
      console.error('Error al enviar los correos masivos de inicio de partida:', emailError);
    }
    
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

// NUEVA: Obtener los participantes inscritos en una edición
export const getEditionParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const participants = await db('participants')
      .join('users', 'participants.user_id', 'users.id')
      .where({ 'participants.edition_id': id })
      .select(
        'participants.id as participant_id', 
        'users.id as user_id', 
        'users.name', 
        'users.email', 
        'users.avatar', 
        'participants.status'
      )
      .orderBy('users.name', 'asc');
      
    res.json(participants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los participantes.' });
  }
};

// NUEVA: Expulsar a un participante ANTES de arrancar el juego
export const removeParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: editionId, participantId } = req.params;

    const edition = await db('editions').where({ id: editionId }).first();
    
    // Medida de seguridad: Proteger el círculo
    if (edition.status !== 'CREATING') {
      res.status(400).json({ error: 'El juego ya ha comenzado. El jugador debe abandonar usando la opción de Suicidio en su panel.' });
      return;
    }

    await db('participants').where({ id: participantId, edition_id: editionId }).del();
    
    res.json({ message: 'Participante expulsado de la edición.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al expulsar al participante.' });
  }
};