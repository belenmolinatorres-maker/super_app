const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendRecoveryEmail(nombre, correo, idUsuario) {
  const resetLink = `${process.env.BASE_URL}/?id=${idUsuario}`;
  const templatePath = path.join(__dirname, '../../plantillas/recuperacion_password.html');

  let html = fs.readFileSync(templatePath, 'utf8');
  html = html
    .replace(/\{\{ \$json\.nombre \}\}/g, nombre)
    .replace(/\{\{ \$json\.usuario \}\}/g, correo)
    .replace(/\{\{ \$json\.id_usuario \}\}/g, idUsuario)
    .replace(/\{\{ \$json\.var \}\}/g, resetLink);

  html = html
    .replace(/\{\{nombre\}\}/g, nombre)
    .replace(/\{\{usuario\}\}/g, correo)
    .replace(/\{\{id_usuario\}\}/g, idUsuario)
    .replace(/\{\{reset_link\}\}/g, resetLink);

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Súper App" <noreply@tudominio.com>',
    to: correo,
    subject: 'Recuperación de Contraseña - Súper App',
    html
  });

  console.log('Correo enviado:', info.messageId);
  return info;
}

module.exports = { sendRecoveryEmail };
