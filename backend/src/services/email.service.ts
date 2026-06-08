import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465, // true para puerto 465, false para otros (ej. 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Útil si tu servidor usa certificados autofirmados
  }
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"The Killer" <noreply@thekiller.com>',
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