const { Router } = require('express');
const pool = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { sendRecoveryEmail } = require('../helpers/email');

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { usuario, contraseya } = req.body;
    if (!usuario || !contraseya) {
      return res.json({ codigo: 0, mensaje: 'Usuario y contraseña requeridos' });
    }
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre, apellido, correo, usuario, es_activo AS rol
       FROM usuario
       WHERE usuario = ? AND contraseya = encriptar(?)
       AND fecha_eliminacion IS NULL AND es_activo = 1`,
      [usuario, contraseya]
    );
    if (rows.length === 0) {
      return res.json({ codigo: 0, mensaje: 'Usuario o contraseña incorrectos' });
    }
    const user = rows[0];
    const token = generateToken({
      id_usuario: user.id_usuario,
      usuario: user.usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      rol: user.rol
    });
    res.json({
      codigo: 1,
      token,
      Datos: {
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        usuario: user.usuario,
        rol: user.rol
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error interno del servidor' });
  }
});

router.post('/logout', async (req, res) => {
  res.json({ codigo: 1, mensaje: 'Sesión finalizada' });
});

router.post('/recuperar-contraseya', async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) {
      return res.json({ codigo: 0, mensaje: 'Correo requerido' });
    }
    const [rows] = await pool.query(
      'SELECT id_usuario, nombre, correo FROM usuario WHERE correo = ? AND fecha_eliminacion IS NULL',
      [correo]
    );
    if (rows.length === 0) {
      return res.json({ codigo: 1, mensaje: 'Si el correo está registrado, recibirás un enlace en breve.' });
    }
    const user = rows[0];
    try {
      await sendRecoveryEmail(user.nombre, user.correo, user.id_usuario);
    } catch (emailErr) {
      console.error('Email error:', emailErr);
    }
    res.json({ codigo: 1, mensaje: 'Si el correo está registrado, recibirás un enlace en breve.' });
  } catch (err) {
    console.error('Recovery error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error interno del servidor' });
  }
});

router.post('/resetear', async (req, res) => {
  try {
    const { id_usuario, contraseya } = req.body;
    if (!id_usuario || !contraseya) {
      return res.json({ codigo: 0, mensaje: 'ID de usuario y contraseña requeridos' });
    }
    if (contraseya.length < 6) {
      return res.json({ codigo: 0, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }
    await pool.query(
      'UPDATE usuario SET contraseya = encriptar(?) WHERE id_usuario = ?',
      [contraseya, id_usuario]
    );
    res.json({ codigo: 1, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;
