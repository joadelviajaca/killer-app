import cron from 'node-cron';
import db from '../db.js';
import { sendEmail } from './email.service.js';

export const startCronJobs = () => {
  // Se ejecuta todos los días a las 20:00 horas ('0 20 * * *')
  cron.schedule('0 20 * * *', async () => {
    console.log('⏰ Ejecutando revisión de inactividad...');

    try {
      // 1. Verificar si hay una edición activa
      const edition = await db('editions').where({ status: 'ACTIVE' }).first();
      if (!edition) return;

      // 2. Definimos el límite de inactividad (48 horas)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      // 3. Obtener todos los jugadores vivos con sus datos de usuario
      const aliveParticipants = await db('participants')
        .join('users', 'participants.user_id', 'users.id')
        .where({ 'participants.edition_id': edition.id, 'participants.status': 'ALIVE' })
        .select('participants.*', 'users.email', 'users.name');

      for (const player of aliveParticipants) {
        // Buscar el último asesinato de este jugador
        const lastKill = await db('kills_log')
          .where({ killer_id: player.id, edition_id: edition.id })
          .orderBy('created_at', 'desc')
          .first();

        // Determinar si está inactivo:
        // a) Nunca ha matado a nadie y la partida empezó hace más de 48h
        // b) O su última muerte fue hace más de 48h
        let isInactive = false;

        if (lastKill) {
          isInactive = new Date(lastKill.created_at) < twoDaysAgo;
        } else {
          isInactive = new Date(edition.start_date || edition.created_at) < twoDaysAgo;
        }

        if (isInactive) {
          // Penalización de -20 puntos
          await db('participants').where({ id: player.id }).update({
            score: player.score - 20
          });

          // Avisar por correo de la penalización
          if (player.email) {
            sendEmail(
              player.email,
              '🗡️ The Killer: Penalización por inactividad',
              `<h2>¡Despierta, ${player.name}!</h2>
               <p>El silencio te delata. Llevas más de 48 horas sin eliminar a tu objetivo y la organización te ha penalizado con <strong>-20 puntos</strong>.</p>
               <p>Este juego no se gana escondiéndose. Búscate una coartada, prepara tu misión y actúa antes de que sigan bajando tus puntos... o peor, antes de que te encuentren a ti.</p>`
            );
          }
        }
      }
      
      console.log('✅ Revisión de inactividad completada.');
    } catch (error) {
      console.error('❌ Error en el Cron de inactividad:', error);
    }
  });
};