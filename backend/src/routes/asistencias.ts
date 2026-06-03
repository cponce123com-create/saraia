import { Router } from 'express';
import { query, queryOne } from '../db';
import type { AsistenciaRow } from '../types';

const router = Router();

// GET /api/asistencias?empresa_id=xxx&personal_id=xxx&desde=2024-01-01&hasta=2024-12-31
router.get('/', async (req, res) => {
  try {
    const { empresa_id, personal_id, desde, hasta } = req.query;
    let sql = 'SELECT a.*, p.nombres, p.apellidos, p.dni FROM asistencias a JOIN personal p ON p.id = a.personal_id WHERE 1=1';
    const params: any[] = [];

    if (empresa_id) {
      sql += ` AND a.empresa_id = $${params.length + 1}`;
      params.push(empresa_id);
    }
    if (personal_id) {
      sql += ` AND a.personal_id = $${params.length + 1}`;
      params.push(personal_id);
    }
    if (desde) {
      sql += ` AND a.fecha >= $${params.length + 1}`;
      params.push(desde);
    }
    if (hasta) {
      sql += ` AND a.fecha <= $${params.length + 1}`;
      params.push(hasta);
    }

    sql += ' ORDER BY a.fecha DESC, p.apellidos';
    const asistencias = await query(sql, params);
    res.json(asistencias);
  } catch (err) {
    console.error('[asistencias] GET error:', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// GET /api/asistencias/resumen?empresa_id=xxx&desde=2024-01-01&hasta=2024-12-31
router.get('/resumen', async (req, res) => {
  try {
    const { empresa_id, desde, hasta } = req.query;
    if (!empresa_id || !desde || !hasta) {
      return res.status(400).json({ error: 'empresa_id, desde y hasta son requeridos' });
    }

    const resumen = await query(
      `SELECT
        p.id as personal_id,
        p.nombres,
        p.apellidos,
        COUNT(DISTINCT a.fecha) as dias_trabajados,
        COALESCE(SUM(a.horas_normales), 0) as total_horas_normales,
        COALESCE(SUM(a.horas_extras), 0) as total_horas_extras,
        COUNT(CASE WHEN a.hora_entrada > '08:00' THEN 1 END) as tardanzas
       FROM personal p
       LEFT JOIN asistencias a ON a.personal_id = p.id
        AND a.fecha >= $1 AND a.fecha <= $2
       WHERE p.empresa_id = $3 AND p.estado = 'activo'
       GROUP BY p.id, p.nombres, p.apellidos
       ORDER BY p.apellidos, p.nombres`,
      [desde, hasta, empresa_id],
    );

    res.json(resumen);
  } catch (err) {
    console.error('[asistencias] GET resumen error:', err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// POST /api/asistencias
router.post('/', async (req, res) => {
  try {
    const { personal_id, empresa_id, fecha, hora_entrada, hora_salida, tipo_hora_extra, observacion } = req.body;

    if (!personal_id || !empresa_id || !fecha) {
      return res.status(400).json({ error: 'personal_id, empresa_id y fecha son requeridos' });
    }

    const asistencia = await queryOne<AsistenciaRow>(
      `INSERT INTO asistencias (personal_id, empresa_id, fecha, hora_entrada, hora_salida, tipo_hora_extra, observacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [personal_id, empresa_id, fecha, hora_entrada || null, hora_salida || null, tipo_hora_extra || null, observacion || null],
    );
    res.status(201).json(asistencia);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un registro para esta persona en esta fecha' });
    console.error('[asistencias] POST error:', err);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
});

// PUT /api/asistencias/:id
router.put('/:id', async (req, res) => {
  try {
    const { hora_entrada, hora_salida, tipo_hora_extra, observacion } = req.body;
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (hora_entrada !== undefined) { sets.push(`hora_entrada = $${idx++}`); params.push(hora_entrada); }
    if (hora_salida !== undefined) { sets.push(`hora_salida = $${idx++}`); params.push(hora_salida); }
    if (tipo_hora_extra !== undefined) { sets.push(`tipo_hora_extra = $${idx++}`); params.push(tipo_hora_extra); }
    if (observacion !== undefined) { sets.push(`observacion = $${idx++}`); params.push(observacion); }

    if (sets.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    params.push(req.params.id);
    const asistencia = await queryOne(
      `UPDATE asistencias SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (!asistencia) return res.status(404).json({ error: 'Asistencia no encontrada' });
    res.json(asistencia);
  } catch (err) {
    console.error('[asistencias] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar asistencia' });
  }
});

// DELETE /api/asistencias/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM asistencias WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.length === 0) return res.status(404).json({ error: 'Asistencia no encontrada' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[asistencias] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar asistencia' });
  }
});

export default router;
