const { Router } = require('express');
const pool = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = Router();

router.post('/listar-catalogo', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM catalogo WHERE fecha_eliminacion IS NULL'
    );
    res.json(rows);
  } catch (err) {
    console.error('Listar catalogo error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al listar catálogo' });
  }
});

router.post('/alta-catalogo', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { Datos } = req.body;
    if (!Datos || !Datos.nombre || !Datos.imagen) {
      return res.json({ codigo: 0, mensaje: 'Nombre e imagen requeridos' });
    }
    await pool.query(
      `INSERT INTO catalogo (nombre, imagen, descripcion, direccion_enlace, fecha_creacion)
       VALUES (?, ?, ?, ?, NOW())`,
      [Datos.nombre, Datos.imagen, Datos.descripcion || '', Datos.direccion_enlace || '']
    );
    res.json({ codigo: 1, mensaje: 'Catálogo creado correctamente' });
  } catch (err) {
    console.error('Alta catalogo error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al crear catálogo' });
  }
});

router.post('/editar-catalogo', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { Datos } = req.body;
    if (!Datos || !Datos.id_catalogo) {
      return res.json({ codigo: 0, mensaje: 'ID de catálogo requerido' });
    }
    await pool.query(
      `UPDATE catalogo SET nombre = ?, imagen = ?, descripcion = ?, direccion_enlace = ?
       WHERE id_catalogo = ? AND fecha_eliminacion IS NULL`,
      [Datos.nombre, Datos.imagen, Datos.descripcion || '', Datos.direccion_enlace || '', Datos.id_catalogo]
    );
    res.json({ codigo: 1, mensaje: 'Catálogo actualizado correctamente' });
  } catch (err) {
    console.error('Editar catalogo error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al editar catálogo' });
  }
});

router.post('/baja-catalogo', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id_catalogo } = req.body;
    if (!id_catalogo) {
      return res.json({ codigo: 0, mensaje: 'ID de catálogo requerido' });
    }
    await pool.query(
      'UPDATE catalogo SET fecha_eliminacion = NOW(), usuario_eliminacion = ? WHERE id_catalogo = ?',
      [req.user.id_usuario, id_catalogo]
    );
    res.json({ codigo: 1, mensaje: 'Catálogo retirado correctamente' });
  } catch (err) {
    console.error('Baja catalogo error:', err);
    res.status(500).json({ codigo: 0, mensaje: 'Error al dar de baja catálogo' });
  }
});

module.exports = router;
