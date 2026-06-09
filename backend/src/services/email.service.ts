import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 25,
  secure: false, // false porque el puerto 25 usa STARTTLS explícito, no SSL implícito
  requireTLS: true, // Esto es el equivalente directo a tu $config['email_smtp']['smtp_secure'] = 'tls'
  tls: {
    rejectUnauthorized: false // Vital para certificados internos del servidor
  },
  // Solo inyectamos el bloque 'auth' si realmente hemos puesto un usuario en el .env
  ...(process.env.SMTP_USER ? {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  } : {})
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"The Killer" <noreply@iesjacaranda.es>',
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`Error enviando correo a ${to}:`, error);
    return false;
  }
};