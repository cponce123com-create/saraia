import { Router } from 'express';
import { query, queryOne } from '../db';
import type { EmpresaRow } from '../types';

const router = Router();

// GET /api/empresas
router.get('/', async (_req, res) => {
  try {
    const empresas = await query<EmpresaRow>('SELECT * FROM empresas ORDER BY nombre');
    res.json(empresas);
  } catch (err) {
    console.error('[empresas] GET error:', err);
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
});

// GET /api/empresas/:id
router.get('/:id', async (req, res) => {
  try {
    const empresa = await queryOne<EmpresaRow>('SELECT * FROM empresas WHERE id = $1', [req.params.id]);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (err) {
    console.error('[empresas] GET:id error:', err);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
});

// POST /api/empresas
router.post('/', async (req, res) => {
  try {
    const { nombre, ruc, color } = req.body;
    if (!nombre || !ruc) return res.status(400).json({ error: 'nombre y ruc son requeridos' });

    const empresa = await queryOne<EmpresaRow>(
      'INSERT INTO empresas (nombre, ruc, color) VALUES ($1, $2, $3) RETURNING *',
      [nombre, ruc, color || '#2563eb'],
    );
    res.status(201).json(empresa);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'El RUC ya existe' });
    console.error('[empresas] POST error:', err);
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

// PUT /api/empresas/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, ruc, color } = req.body;
    const empresa = await queryOne<EmpresaRow>(
      'UPDATE empresas SET nombre = COALESCE($1, nombre), ruc = COALESCE($2, ruc), color = COALESCE($3, color) WHERE id = $4 RETURNING *',
      [nombre, ruc, color, req.params.id],
    );
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (err) {
    console.error('[empresas] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
});

// DELETE /api/empresas/:id
router.delete('/:id', async (req, res) => {
  try {
    // ON DELETE CASCADE se encarga de personal, asistencias, gastos, facturas
    const result = await query('DELETE FROM empresas WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[empresas] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
});

export default router;
