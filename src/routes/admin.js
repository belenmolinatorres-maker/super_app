const { Router } = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = Router();

router.post('/admin', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT es_activo AS rol FROM usuario WHERE id_usuario = ? AND fecha_eliminacion IS NULL',
      [req.user.id_usuario]
    );
    if (rows.length > 0 && (rows[0].rol === 1 || rows[0].rol === '1')) {
      return res.json({ codigo: '1', mensaje: 'Acceso concedido' });
    }
    res.json({ codigo: '0', mensaje: 'Acceso denegado' });
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ codigo: '0', mensaje: 'Error interno' });
  }
});

router.post('/editar-perfil', verifyToken, async (req, res) => {
  try {
    const { nombre, apellido, correo } = req.body;
    await pool.query(
      'UPDATE usuario SET nombre = ?, apellido = ?, correo = ? WHERE id_usuario = ? AND fecha_eliminacion IS NULL',
      [nombre, apellido, correo, req.user.id_usuario]
    );
    res.json({ codigo: 1, mensaje: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error('Editar perfil error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al actualizar perfil' });
  }
});

router.post('/listar-usuario', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre, apellido, correo, usuario, es_activo AS rol
       FROM usuario WHERE fecha_eliminacion IS NULL`
    );
    res.json(rows);
  } catch (err) {
    console.error('Listar usuarios error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al listar usuarios' });
  }
});

router.post('/alta-usuario', verifyToken, async (req, res) => {
  try {
    const { nombre, apellido, correo, usuario, contraseya, rol, es_activo } = req.body;
    if (!nombre || !correo || !usuario || !contraseya) {
      return res.json({ codigo: 0, mensaje: 'Campos requeridos incompletos' });
    }
    await pool.query(
      `INSERT INTO usuario (nombre, apellido, correo, usuario, contraseya, es_activo, fecha_creacion)
       VALUES (?, ?, ?, ?, encriptar(?), ?, NOW())`,
      [nombre, apellido || '', correo, usuario, contraseya, es_activo !== undefined ? es_activo : 1]
    );
    res.json({ codigo: 1, mensaje: 'Usuario creado correctamente' });
  } catch (err) {
    console.error('Alta usuario error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al crear usuario' });
  }
});

router.post('/editar-usuario', verifyToken, async (req, res) => {
  try {
    const { datos } = req.body;
    if (!datos || !datos.id_usuario) {
      return res.json({ codigo: 0, mensaje: 'ID de usuario requerido' });
    }
    if (datos.contraseya && datos.contraseya.trim() !== '') {
      await pool.query(
        `UPDATE usuario SET nombre = ?, apellido = ?, correo = ?, usuario = ?, contraseya = encriptar(?), es_activo = ?
         WHERE id_usuario = ? AND fecha_eliminacion IS NULL`,
        [datos.nombre, datos.apellido || '', datos.correo, datos.usuario, datos.contraseya, datos.rol || 0, datos.id_usuario]
      );
    } else {
      await pool.query(
        `UPDATE usuario SET nombre = ?, apellido = ?, correo = ?, usuario = ?, es_activo = ?
         WHERE id_usuario = ? AND fecha_eliminacion IS NULL`,
        [datos.nombre, datos.apellido || '', datos.correo, datos.usuario, datos.rol || 0, datos.id_usuario]
      );
    }
    res.json({ codigo: 1, mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error('Editar usuario error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al editar usuario' });
  }
});

router.post('/baja-usuario', verifyToken, async (req, res) => {
  try {
    const { id_usuario } = req.body;
    if (!id_usuario) {
      return res.json({ codigo: 0, mensaje: 'ID de usuario requerido' });
    }
    await pool.query(
      'UPDATE usuario SET fecha_eliminacion = NOW(), usuario_eliminacion = ? WHERE id_usuario = ?',
      [req.user.id_usuario, id_usuario]
    );
    res.json({ codigo: 1, mensaje: 'Usuario dado de baja correctamente' });
  } catch (err) {
    console.error('Baja usuario error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al dar de baja usuario' });
  }
});

module.exports = router;
