import { Router } from 'express';
import { query, queryOne } from '../db';
import type { PersonalRow } from '../types';

const router = Router();

// GET /api/personal?empresa_id=xxx&estado=activo
router.get('/', async (req, res) => {
  try {
    const { empresa_id, estado, search } = req.query;
    let sql = 'SELECT * FROM personal WHERE 1=1';
    const params: any[] = [];

    if (empresa_id) {
      sql += ` AND empresa_id = $${params.length + 1}`;
      params.push(empresa_id);
    }
    if (estado) {
      sql += ` AND estado = $${params.length + 1}`;
      params.push(estado);
    }
    if (search) {
      sql += ` AND (nombres ILIKE $${params.length + 1} OR apellidos ILIKE $${params.length + 1} OR dni ILIKE $${params.length + 1})`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY apellidos, nombres';
    const personal = await query<PersonalRow>(sql, params);
    res.json(personal);
  } catch (err) {
    console.error('[personal] GET error:', err);
    res.status(500).json({ error: 'Error al obtener personal' });
  }
});

// GET /api/personal/:id
router.get('/:id', async (req, res) => {
  try {
    const persona = await queryOne<PersonalRow>('SELECT * FROM personal WHERE id = $1', [req.params.id]);
    if (!persona) return res.status(404).json({ error: 'Personal no encontrado' });
    res.json(persona);
  } catch (err) {
    console.error('[personal] GET:id error:', err);
    res.status(500).json({ error: 'Error al obtener personal' });
  }
});

// POST /api/personal
router.post('/', async (req, res) => {
  try {
    const { empresa_id, dni, nombres, apellidos, celular, correo, cargo, tipo_contrato, estado, banco1, cuenta1, tipo_cuenta1, banco2, cuenta2, tipo_cuenta2, sueldo_base } = req.body;

    if (!empresa_id || !dni || !nombres || !apellidos) {
      return res.status(400).json({ error: 'empresa_id, dni, nombres y apellidos son requeridos' });
    }

    const persona = await queryOne<PersonalRow>(
      `INSERT INTO personal (empresa_id, dni, nombres, apellidos, celular, correo, cargo, tipo_contrato, estado, banco1, cuenta1, tipo_cuenta1, banco2, cuenta2, tipo_cuenta2, sueldo_base)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [empresa_id, dni, nombres, apellidos, celular || null, correo || null, cargo || null, tipo_contrato || 'planilla', estado || 'activo', banco1 || null, cuenta1 || null, tipo_cuenta1 || null, banco2 || null, cuenta2 || null, tipo_cuenta2 || null, sueldo_base || null],
    );
    res.status(201).json(persona);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'El DNI ya existe para esta empresa' });
    console.error('[personal] POST error:', err);
    res.status(500).json({ error: 'Error al crear personal' });
  }
});

// PUT /api/personal/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['dni', 'nombres', 'apellidos', 'celular', 'correo', 'cargo', 'tipo_contrato', 'estado', 'banco1', 'cuenta1', 'tipo_cuenta1', 'banco2', 'cuenta2', 'tipo_cuenta2', 'sueldo_base'];
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    params.push(req.params.id);
    const persona = await queryOne<PersonalRow>(
      `UPDATE personal SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (!persona) return res.status(404).json({ error: 'Personal no encontrado' });
    res.json(persona);
  } catch (err) {
    console.error('[personal] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar personal' });
  }
});

// DELETE /api/personal/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM personal WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.length === 0) return res.status(404).json({ error: 'Personal no encontrado' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[personal] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar personal' });
  }
});

export default router;
