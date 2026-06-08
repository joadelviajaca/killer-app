import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { sendEmail } from '../services/email.service.js';
import db from '../db.js';

// --- 1. VER MI OBJETIVO Y MISIÓN ---
export const getMyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Buscamos la edición activa
    const edition = await db('editions').where({ status: 'ACTIVE' }).first();
    if (!edition) {
      res.json({ message: 'No hay ninguna partida activa.', status: 'WAITING' });
      return;
    }

    // Buscamos al participante
    const me = await db('participants')
      .where({ user_id: userId, edition_id: edition.id })
      .first();

    if (!me || me.status !== 'ALIVE') {
      res.json({ message: 'Estás muerto o no participas.', status: me?.status || 'NOT_FOUND' });
      return;
    }

    // Obtenemos los datos legibles del objetivo y la misión
    const target = await db('participants')
      .join('users', 'participants.user_id', 'users.id')
      .where('participants.id', me.target_id)
      .select('users.name', 'users.avatar')
      .first();

    const mission = await db('missions').where({ id: me.mission_id }).first();

    res.json({
      status: 'ALIVE',
      score: me.score,
      target: target?.name,
      targetAvatar: target?.avatar,
      mission: mission?.description
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tu estado' });
  }
};

// --- 2. CONFIRMAR MI MUERTE (El Asesinato) ---
export const confirmDeath = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { story } = req.body;

    const edition = await db('editions').where({ status: 'ACTIVE' }).first();
    if (!edition) {
      res.status(400).json({ error: 'No hay partida activa.' });
      return;
    }

    await db.transaction(async (trx) => {
      // 1. Identificar víctima y asesino
      const victim = await trx('participants').where({ user_id: userId, edition_id: edition.id, status: 'ALIVE' }).first();
      if (!victim) throw new Error('No estás vivo en esta partida.');

      const killer = await trx('participants').where({ target_id: victim.id, edition_id: edition.id }).first();
      if (!killer) throw new Error('Error de integridad: Nadie te estaba cazando.');

      // --- NUEVO: CÁLCULO DE PUNTOS AVANZADO ---
      let pointsEarned = 100; // Puntos base por asesinato

      // A) Comprobar "First Blood" (¿Es el primer asesinato de la edición?)
      const totalKillsQuery = await trx('kills_log').where({ edition_id: edition.id }).count('id as count').first();
      const isFirstBlood = Number(totalKillsQuery?.count) === 0;
      if (isFirstBlood) {
        pointsEarned += 50;
      }

      // B) Comprobar Racha (¿Ha matado a alguien en las últimas 24 horas?)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentKill = await trx('kills_log')
        .where({ killer_id: killer.id, edition_id: edition.id })
        .andWhere('created_at', '>=', yesterday)
        .first();
      
      if (recentKill) {
        pointsEarned += 20;
      }
      // -----------------------------------------

      // 3. Buscar nueva misión para el asesino
      const [newMission] = await trx.raw('SELECT id FROM missions WHERE id != ? ORDER BY RAND() LIMIT 1', [killer.mission_id || 0]);

      // 4. Actualizar Asesino con los puntos calculados
      await trx('participants').where({ id: killer.id }).update({
        target_id: victim.target_id,
        mission_id: newMission ? newMission.id : killer.mission_id,
        score: killer.score + pointsEarned
      });

      // 5. Actualizar Víctima
      await trx('participants').where({ id: victim.id }).update({
        status: 'DEAD',
        target_id: null,
        mission_id: null,
        death_reason: story || 'Asesinado en las sombras'
      });

      // 6. Registrar en el Log
      await trx('kills_log').insert({
        edition_id: edition.id,
        killer_id: killer.id,
        victim_id: victim.id,
        mission_id: killer.mission_id,
        story: story || ''
      });
    });

    res.json({ message: 'Has confirmado tu muerte. Descanse en paz.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al procesar la muerte' });
  }
};

// --- 2.5 REPORTAR ASESINATO (Avisar a la víctima) ---
export const reportKill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const edition = await db('editions').where({ status: 'ACTIVE' }).first();
    if (!edition) {
      res.status(400).json({ error: 'No hay partida activa.' });
      return;
    }

    // Buscamos al asesino
    const killer = await db('participants')
      .where({ user_id: userId, edition_id: edition.id, status: 'ALIVE' })
      .first();

    if (!killer) throw new Error('No estás vivo en esta partida.');

    // Buscamos los datos de la víctima a través de su target_id
    const victimUser = await db('users')
      .join('participants', 'users.id', 'participants.user_id')
      .where('participants.id', killer.target_id)
      .select('users.email', 'users.name')
      .first();

    // Enviamos el correo de notificación
    if (victimUser && victimUser.email) {
      const subject = '🗡️ The Killer: ¿Has sido eliminado?';
      const html = `
        <h2>¡Cuidado, ${victimUser.name}!</h2>
        <p>Alguien acaba de reportar en la aplicación que ha logrado eliminarte.</p>
        <p>Si es cierto, por favor entra en la plataforma y pulsa el botón de <strong>"Confirmar Muerte"</strong> para que el juego pueda continuar y tu asesino reciba sus puntos.</p>
        <p>Si es mentira y sigues vivo... ignora este mensaje y mantén los ojos abiertos.</p>
      `;
      sendEmail(victimUser.email, subject, html);
    }

    res.json({ message: 'Se ha enviado un aviso a tu objetivo para que confirme su muerte.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al reportar el asesinato' });
  }
};

// --- 3. CONTRAATAQUE (Cazar al indiscreto) ---
export const counterAttack = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { accusedUserId } = req.body; 

    if (!accusedUserId) {
      res.status(400).json({ error: 'Debes indicar a quién estás acusando.' });
      return;
    }

    const edition = await db('editions').where({ status: 'ACTIVE' }).first();
    if (!edition) throw new Error('No hay partida activa.');

    // Variables para almacenar los datos de los correos y enviarlos al final
    let clumsyKillerEmail = '';
    let clumsyKillerName = '';
    let hunterEmail = '';
    let hunterName = '';
    let defenderName = '';

    await db.transaction(async (trx) => {
      // 1. La "víctima" que se defiende (Hacemos JOIN para tener su nombre para el correo)
      const defender = await trx('participants')
        .join('users', 'participants.user_id', 'users.id')
        .where({ 'participants.user_id': userId, 'participants.edition_id': edition.id, 'participants.status': 'ALIVE' })
        .select('participants.*', 'users.name as user_name')
        .first();

      if (!defender) throw new Error('No estás vivo.');
      defenderName = defender.user_name;

      // 2. Comprobamos quién es su asesino REAL (JOIN para tener su correo)
      const actualKiller = await trx('participants')
        .join('users', 'participants.user_id', 'users.id')
        .where({ 'participants.target_id': defender.id, 'participants.edition_id': edition.id })
        .select('participants.*', 'users.email', 'users.name as user_name')
        .first();
      
      // 3. LA LÓGICA DE LA PARANOIA (Falsa alarma)
      if (actualKiller.user_id !== accusedUserId) {
        await trx('participants').where({ id: defender.id }).update({
          score: defender.score - 20
        });
        throw new Error('¡Falsa alarma! Esa persona NO era tu asesino. Has perdido 20 puntos por paranoico.');
      }

      // Guardamos los datos del asesino torpe para su correo
      clumsyKillerEmail = actualKiller.email;
      clumsyKillerName = actualKiller.user_name;

      // 4. SI ACIERTA: La persona que estaba cazando al asesino torpe
      const hunterOfKiller = await trx('participants')
        .join('users', 'participants.user_id', 'users.id')
        .where({ 'participants.target_id': actualKiller.id, 'participants.edition_id': edition.id })
        .select('participants.*', 'users.email', 'users.name as user_name')
        .first();

      // Reparar el círculo
      if (hunterOfKiller) {
        hunterEmail = hunterOfKiller.email;
        hunterName = hunterOfKiller.user_name;

        await trx('participants').where({ id: hunterOfKiller.id }).update({
          target_id: actualKiller.target_id
        });
      }

      // Actualizar puntos del defensor
      await trx('participants').where({ id: defender.id }).update({
        score: defender.score + 50
      });

      // El asesino torpe muere y pierde puntos
      await trx('participants').where({ id: actualKiller.id }).update({
        status: 'DEAD',
        target_id: null,
        mission_id: null,
        score: actualKiller.score - 50,
        death_reason: 'Descubierto in fraganti por su víctima en un contraataque.'
      });
    });

    // --- ENVÍO DE CORREOS (Fuera de la transacción para no bloquear) ---
    
    // 1. Aviso al asesino torpe
    if (clumsyKillerEmail) {
      sendEmail(
        clumsyKillerEmail,
        '🗡️ The Killer: Has sido descubierto',
        `<h2>¡Fin del juego, ${clumsyKillerName}!</h2>
         <p>Has sido demasiado evidente. <strong>${defenderName}</strong> se ha dado cuenta de tus intenciones y te ha acusado in fraganti usando la Defensa Activa.</p>
         <p>Has sido eliminado por indiscreto y has perdido puntos. En este juego, la sutileza es clave.</p>
         <p>Puedes seguir entrando a la App para ver el Muro de Muertes y el Ranking.</p>`
      );
    }

    // 2. Aviso al cazador que ha perdido a su presa
    if (hunterEmail) {
      sendEmail(
        hunterEmail,
        '🗡️ Novedades en The Killer: Cambio de objetivo',
        `<h2>¡Atención, ${hunterName}!</h2>
         <p>Tu objetivo anterior (${clumsyKillerName}) acaba de ser eliminado por torpe antes de que pudieras alcanzarle.</p>
         <p>Pero tu contrato sigue activo. Entra de inmediato en la aplicación para descubrir la identidad de tu <strong>nuevo objetivo</strong>.</p>
         <p>Tu arma (misión) no ha cambiado. Sé más sigiloso que tu predecesor.</p>`
      );
    }

    res.json({ message: '¡Contraataque exitoso! Tu asesino ha sido eliminado por indiscreto y todos han sido notificados.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error en el contraataque' });
  }
};


// --- 4. ABANDONAR EL JUEGO (Suicidio) ---
export const suicide = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const edition = await db('editions').where({ status: 'ACTIVE' }).first();
    if (!edition) {
      res.status(400).json({ error: 'No hay partida activa para abandonar.' });
      return;
    }

    await db.transaction(async (trx) => {
      // 1. Identificar al participante que abandona (Quitter)
      const quitter = await trx('participants').where({ user_id: userId, edition_id: edition.id, status: 'ALIVE' }).first();
      if (!quitter) throw new Error('No estás vivo en esta partida o ya has sido eliminado.');

      // 2. Identificar a quien le estaba cazando (Hunter)
      const hunter = await trx('participants').where({ target_id: quitter.id, edition_id: edition.id }).first();
      if (!hunter) throw new Error('Error de integridad: Nadie te estaba cazando.');

      // 3. Obtener el email y nombre del Hunter para avisarle
      const hunterUser = await trx('users').where({ id: hunter.user_id }).first();
      const newTargetUser = await trx('users')
        .join('participants', 'users.id', 'participants.user_id')
        .where('participants.id', quitter.target_id)
        .select('users.name')
        .first();

      // 4. Reparar el círculo: El Hunter hereda el objetivo del Quitter
      await trx('participants').where({ id: hunter.id }).update({
        target_id: quitter.target_id
        // Nota: NO le cambiamos la misión al cazador, mantiene la suya original.
      });

      // 5. El Quitter muere de forma deshonrosa
      await trx('participants').where({ id: quitter.id }).update({
        status: 'DISQUALIFIED', // Lo marcamos diferente a DEAD para distinguirlo en estadísticas
        target_id: null,
        mission_id: null,
        score: 0,
        death_reason: 'Abandono voluntario del juego.'
      });

      // 6. Enviar notificación por correo al cazador en segundo plano
      if (hunterUser && hunterUser.email) {
        const subject = '🗡️ Novedades en The Killer: Tu objetivo ha abandonado';
        const html = `
          <h2>¡Cambio de planes, Asesino!</h2>
          <p>Lamentamos informarte de que tu objetivo se ha rendido y ha abandonado el juego.</p>
          <p>Pero el círculo no se detiene. Hemos actualizado tu expediente.</p>
          <p>Entra a la aplicación para descubrir a tu <strong>nuevo objetivo</strong>: ${newTargetUser?.name || 'Desconocido'}. Tu arma (misión) sigue siendo la misma.</p>
          <p>Buena suerte.</p>
        `;
        // No usamos await aquí para no bloquear la respuesta HTTP al usuario que se suicida
        sendEmail(hunterUser.email, subject, html);
      }
    });

    res.json({ message: 'Has abandonado el juego. La cadena ha sido reparada y tu asesino notificado.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al abandonar la partida' });
  }
};

// --- 5. OBTENER LISTA DE SOSPECHOSOS (Para el Contraataque) ---
export const getSuspects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const edition = await db('editions').where({ status: 'ACTIVE' }).first();
    if (!edition) {
      res.json([]);
      return;
    }

    // Buscamos a todos los jugadores vivos en esta edición, EXCLUYENDO al propio usuario
    const suspects = await db('participants')
      .join('users', 'participants.user_id', 'users.id')
      .where({ 
        'participants.edition_id': edition.id, 
        'participants.status': 'ALIVE' 
      })
      .andWhere('users.id', '!=', userId)
      .select(
        'users.id as accusedUserId', 
        'users.name'
      )
      .orderBy('users.name', 'asc');

    res.json(suspects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los sospechosos' });
  }
};