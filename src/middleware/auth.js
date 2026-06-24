const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'fallback_secret';

function verifyToken(req, res, next) {
  const token = req.body?.token || req.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ codigo: 0, mensaje: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ codigo: 0, mensaje: 'Token inválido o expirado' });
  }
}

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

async function requireAdmin(req, res, next) {
  try {
    const pool = require('../config/db');
    const [rows] = await pool.query(
      'SELECT rol FROM usuario WHERE id_usuario = ? AND rol = 1 AND fecha_eliminacion IS NULL',
      [req.user.id_usuario]
    );
    if (rows.length === 0) {
      return res.status(403).json({ codigo: 0, mensaje: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ codigo: 0, mensaje: 'Error interno del servidor' });
  }
}

module.exports = { verifyToken, generateToken, requireAdmin };
