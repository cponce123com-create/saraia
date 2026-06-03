import { Router } from 'express';
import { query, queryOne } from '../db';
import type { FacturaRow } from '../types';

const router = Router();

// GET /api/facturas?gasto_id=xxx
router.get('/', async (req, res) => {
  try {
    const { gasto_id } = req.query;
    if (gasto_id) {
      const factura = await queryOne<FacturaRow>('SELECT * FROM facturas WHERE gasto_id = $1', [gasto_id]);
      return res.json(factura || null);
    }
    const facturas = await query<FacturaRow>('SELECT * FROM facturas ORDER BY created_at DESC');
    res.json(facturas);
  } catch (err) {
    console.error('[facturas] GET error:', err);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// POST /api/facturas
router.post('/', async (req, res) => {
  try {
    const { gasto_id, image_base64, image_mime, ocr_data, match_status, match_score } = req.body;

    if (!gasto_id) return res.status(400).json({ error: 'gasto_id es requerido' });

    const factura = await queryOne<FacturaRow>(
      `INSERT INTO facturas (gasto_id, image_base64, image_mime, ocr_fecha, ocr_monto, ocr_proveedor, ocr_ruc, ocr_tipo, ocr_numero, match_status, match_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        gasto_id,
        image_base64 || null,
        image_mime || 'image/jpeg',
        ocr_data?.fecha || null,
        ocr_data?.monto || null,
        ocr_data?.proveedor || null,
        ocr_data?.ruc || null,
        ocr_data?.tipo_comprobante || null,
        ocr_data?.numero_comprobante || null,
        match_status || 'manual',
        match_score || null,
      ],
    );

    if (!factura) {
      return res.status(500).json({ error: 'Error al crear factura' });
    }

    // Actualizar estado del gasto
    await query('UPDATE gastos SET factura_id = $1, estado = $2 WHERE id = $3', [
      factura.id,
      match_status === 'auto' ? 'verificado' : 'pendiente',
      gasto_id,
    ]);

    res.status(201).json(factura);
  } catch (err) {
    console.error('[facturas] POST error:', err);
    res.status(500).json({ error: 'Error al crear factura' });
  }
});

// PUT /api/facturas/:id/match
router.put('/:id/match', async (req, res) => {
  try {
    const { match_status, gasto_id, match_score } = req.body;

    const factura = await queryOne<FacturaRow>(
      `UPDATE facturas SET match_status = $1, match_score = $2, gasto_id = $3 WHERE id = $4 RETURNING *`,
      [match_status, match_score || null, gasto_id, req.params.id],
    );

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    // Si se reasignó a otro gasto, actualizar ambos
    if (gasto_id) {
      await query('UPDATE gastos SET factura_id = $1, estado = $2 WHERE id = $3', [
        factura.id,
        match_status === 'auto' ? 'verificado' : 'pendiente',
        gasto_id,
      ]);
    }

    res.json(factura);
  } catch (err) {
    console.error('[facturas] PUT match error:', err);
    res.status(500).json({ error: 'Error al actualizar match' });
  }
});

// DELETE /api/facturas/:id
router.delete('/:id', async (req, res) => {
  try {
    const factura = await queryOne<FacturaRow>('SELECT * FROM facturas WHERE id = $1', [req.params.id]);
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    // Desvincular del gasto
    await query('UPDATE gastos SET factura_id = NULL, estado = $1 WHERE factura_id = $2', [
      'pendiente',
      req.params.id,
    ]);
    await query('DELETE FROM facturas WHERE id = $1', [req.params.id]);

    res.json({ deleted: true });
  } catch (err) {
    console.error('[facturas] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
});

export default router;
