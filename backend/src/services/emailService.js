import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let transporter;

function getTransporter() {
  if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPassword || !env.smtpFrom) {
    throw new ApiError(503, 'Password reset email is not available right now.');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPassword }
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export async function sendPasswordResetEmail({ email, name, resetUrl }) {
  const safeName = escapeHtml(name || 'there');
  await getTransporter().sendMail({
    from: env.smtpFrom,
    to: email,
    subject: 'Reset your tread&co password',
    text: `Hi ${name || 'there'}, use this link to reset your tread&co password. It expires in 30 minutes: ${resetUrl}`,
    html: `<p>Hi ${safeName},</p><p>Use the link below to reset your tread&amp;co password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
  });
}
