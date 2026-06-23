const { Router } = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = Router();

router.post('/listar-app', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.nombre AS catalogo_nombre, c.imagen AS catalogo_imagen
       FROM app a
       LEFT JOIN catalogo c ON a.catalogo = c.id_catalogo
       WHERE a.usuario = ? AND a.fecha_eliminacion IS NULL`,
      [req.user.id_usuario]
    );
    res.json(rows);
  } catch (err) {
    console.error('Listar apps error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al listar aplicaciones' });
  }
});

router.post('/crud-app', verifyToken, async (req, res) => {
  try {
    const { funcion, Aplicacion } = req.body;
    const userId = req.user.id_usuario;

    if (funcion === 'Crea') {
      const { titulo, descripcion, admin, contraseya, direccion_enlace, catalogo } = Aplicacion;
      await pool.query(
        `INSERT INTO app (catalogo, usuario, titulo, descripcion, admin, contraseya, direccion_enlace, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, encriptar_pass_miniapp(?), ?, NOW())`,
        [catalogo || null, userId, titulo, descripcion, admin, contraseya, direccion_enlace]
      );
      return res.json({ codigo: 1, mensaje: 'Aplicación creada correctamente' });
    }

    if (funcion === 'Modificar') {
      const { id_app, titulo, descripcion, admin, contraseya, direccion_enlace } = Aplicacion;
      if (contraseya && contraseya.trim() !== '') {
        await pool.query(
          `UPDATE app SET titulo = ?, descripcion = ?, admin = ?, contraseya = encriptar_pass_miniapp(?), direccion_enlace = ?
           WHERE id_app = ? AND usuario = ? AND fecha_eliminacion IS NULL`,
          [titulo, descripcion, admin, contraseya, direccion_enlace, id_app, userId]
        );
      } else {
        await pool.query(
          `UPDATE app SET titulo = ?, descripcion = ?, admin = ?, direccion_enlace = ?
           WHERE id_app = ? AND usuario = ? AND fecha_eliminacion IS NULL`,
          [titulo, descripcion, admin, direccion_enlace, id_app, userId]
        );
      }
      return res.json({ codigo: 1, mensaje: 'Aplicación modificada correctamente' });
    }

    if (funcion === 'Eliminar') {
      const { id_app } = Aplicacion;
      await pool.query(
        `UPDATE app SET fecha_eliminacion = NOW(), usuario_eliminacion = ?
         WHERE id_app = ? AND usuario = ? AND fecha_eliminacion IS NULL`,
        [userId, id_app, userId]
      );
      return res.json({ codigo: 1, mensaje: 'Aplicación eliminada correctamente' });
    }

    res.json({ codigo: 0, mensaje: 'Función no reconocida' });
  } catch (err) {
    console.error('CRUD app error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al procesar la solicitud' });
  }
});

router.post('/verificar-acceso', async (req, res) => {
  try {
    const { id_app, contraseya } = req.body;
    if (!id_app || !contraseya) {
      return res.json({ codigo: 0, mensaje: 'Datos incompletos' });
    }
    const [rows] = await pool.query(
      `SELECT id_app FROM app
       WHERE id_app = ? AND contraseya = encriptar_pass_miniapp(?)
       AND fecha_eliminacion IS NULL`,
      [id_app, contraseya]
    );
    if (rows.length > 0) {
      res.json({ codigo: 1 });
    } else {
      res.json({ codigo: 0, mensaje: 'Contraseña incorrecta' });
    }
  } catch (err) {
    console.error('Verificar acceso error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error interno' });
  }
});

module.exports = router;
