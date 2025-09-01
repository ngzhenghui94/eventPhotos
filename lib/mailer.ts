import nodemailer from 'nodemailer';

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration missing');
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMail(opts: { to: string; subject: string; html: string; from?: string }) {
  const transporter = getTransport();
  const from = opts.from || process.env.MAIL_FROM || 'no-reply@events.danielninetyfour.com';
  await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
