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

module.exports = { verifyToken, generateToken };
