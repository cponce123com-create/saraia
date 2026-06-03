import { Router } from 'express';
import { query, queryOne } from '../db';
import type { CreateGastoBody, UpdateGastoBody, GastoRow, FacturaRow } from '../types';

const router = Router();

// GET /api/gastos?empresa_id=xxx&estado=pendiente&desde=2024-01-01&hasta=2024-12-31
router.get('/', async (req, res) => {
  try {
    const { empresa_id, estado, desde, hasta, search, limit = '100', offset = '0' } = req.query;

    let sql = `SELECT g.*, f.match_status, f.ocr_proveedor, f.ocr_monto as factura_monto
               FROM gastos g
               LEFT JOIN facturas f ON f.gasto_id = g.id
               WHERE 1=1`;
    const params: any[] = [];

    if (empresa_id) {
      sql += ` AND g.empresa_id = $${params.length + 1}`;
      params.push(empresa_id);
    }
    if (estado) {
      sql += ` AND g.estado = $${params.length + 1}`;
      params.push(estado);
    }
    if (desde) {
      sql += ` AND g.fecha >= $${params.length + 1}`;
      params.push(desde);
    }
    if (hasta) {
      sql += ` AND g.fecha <= $${params.length + 1}`;
      params.push(hasta);
    }
    if (search) {
      sql += ` AND g.descripcion ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY g.fecha DESC, g.created_at DESC';
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const gastos = await query<GastoRow & { match_status: string | null; factura_monto: number | null }>(sql, params);

    // Contar total
    const countSql = `SELECT COUNT(*) FROM gastos g WHERE 1=1${empresa_id ? ' AND g.empresa_id = $1' : ''}`;
    const countParams = empresa_id ? [empresa_id] : [];
    const [countResult] = await query<{ count: string }>(countSql, countParams);

    res.json({
      gastos,
      total: parseInt(countResult?.count || '0', 10),
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (err) {
    console.error('[gastos] GET error:', err);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// GET /api/gastos/:id
router.get('/:id', async (req, res) => {
  try {
    const gasto = await queryOne<GastoRow>('SELECT * FROM gastos WHERE id = $1', [req.params.id]);
    if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });

    const factura = await queryOne<FacturaRow>('SELECT * FROM facturas WHERE gasto_id = $1', [gasto.id]);

    res.json({ ...gasto, factura: factura || null });
  } catch (err) {
    console.error('[gastos] GET:id error:', err);
    res.status(500).json({ error: 'Error al obtener gasto' });
  }
});

// POST /api/gastos
router.post('/', async (req, res) => {
  try {
    const { fecha, descripcion, monto, tipo, mensaje, saldo, empresa_id } = req.body as CreateGastoBody & { empresa_id: string };

    if (!empresa_id) return res.status(400).json({ error: 'empresa_id es requerido' });
    if (!fecha || !descripcion || monto === undefined || !tipo) {
      return res.status(400).json({ error: 'fecha, descripcion, monto y tipo son requeridos' });
    }

    const gasto = await queryOne<GastoRow>(
      `INSERT INTO gastos (empresa_id, fecha, descripcion, monto, tipo, mensaje, saldo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [empresa_id, fecha, descripcion, monto, tipo, mensaje || null, saldo ?? monto],
    );

    res.status(201).json(gasto);
  } catch (err) {
    console.error('[gastos] POST error:', err);
    res.status(500).json({ error: 'Error al crear gasto' });
  }
});

// PUT /api/gastos/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body as UpdateGastoBody;
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (body.estado !== undefined) { sets.push(`estado = $${idx++}`); params.push(body.estado); }
    if (body.mensaje !== undefined) { sets.push(`mensaje = $${idx++}`); params.push(body.mensaje); }
    if (body.descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); params.push(body.descripcion); }
    if (body.monto !== undefined) { sets.push(`monto = $${idx++}`); params.push(body.monto); }

    if (sets.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    params.push(req.params.id);
    const gasto = await queryOne<GastoRow>(
      `UPDATE gastos SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json(gasto);
  } catch (err) {
    console.error('[gastos] PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar gasto' });
  }
});

// DELETE /api/gastos/:id
router.delete('/:id', async (req, res) => {
  try {
    // Eliminar factura asociada primero (cascade lo haría, pero explícito para claridad)
    await query('DELETE FROM facturas WHERE gasto_id = $1', [req.params.id]);
    const result = await query('DELETE FROM gastos WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.length === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[gastos] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
});

export default router;
