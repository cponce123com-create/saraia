import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  Gasto, Factura, Importacion, GastoPendiente, GastoEstado,
  ResultadoImportacion, Store, OCRData,
} from '../types';
import type { GastoResponse, FacturaResponse } from '../lib/api';

// ─── Mappers de respuesta API a tipos locales ─────────────────────

function mapGasto(r: GastoResponse): Gasto {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    fecha: r.fecha,
    descripcion: r.descripcion,
    monto: Number(r.monto),
    tipo: r.tipo,
    mensaje: r.mensaje,
    saldo: r.saldo !== null ? Number(r.saldo) : Number(r.monto),
    facturaId: r.factura_id,
    estado: r.estado,
    matchStatus: r.match_status,
    facturaMonto: r.factura_monto !== null && r.factura_monto !== undefined ? Number(r.factura_monto) : null,
  };
}

function mapFactura(r: FacturaResponse): Factura {
  return {
    id: r.id,
    gastoId: r.gasto_id,
    imageBase64: r.image_base64 || '',
    imageMime: r.image_mime,
    ocrData: r.ocr_fecha || r.ocr_monto ? {
      fecha: r.ocr_fecha,
      monto: r.ocr_monto !== null ? Number(r.ocr_monto) : null,
      proveedor: r.ocr_proveedor,
      ruc: r.ocr_ruc,
      tipo_comprobante: (r.ocr_tipo as any) || null,
      numero_comprobante: r.ocr_numero,
    } : null,
    matchStatus: r.match_status,
    matchScore: r.match_score !== null ? Number(r.match_score) : undefined,
    createdAt: r.created_at,
  };
}

// ─── Store ─────────────────────────────────────────────────────────

const useGastosStore = create<Store>()((set, get) => ({
  gastos: [],
  facturas: [],
  importaciones: [],
  loading: false,
  error: null,

  setEmpresaId: (_id: string) => {
    // Se usa para filtrar al cargar
  },

  cargarGastos: async (empresaId?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.gastos.list({ empresa_id: empresaId, limit: '500' });
      // Cargar facturas asociadas
      const facturas = await api.facturas.list();
      set({
        gastos: res.gastos.map(mapGasto),
        facturas: facturas.map(mapFactura),
        loading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar gastos';
      set({ error: msg, loading: false });
    }
  },

  importarGastos: async (nuevosGastos: GastoPendiente[], empresaId: string): Promise<ResultadoImportacion> => {
    const state = get();
    const existentes = state.gastos;
    let insertados = 0;
    let duplicados = 0;

    for (const g of nuevosGastos) {
      const dup = existentes.find(
        (e) =>
          e.fecha.split('T')[0] === g.fecha.split('T')[0] &&
          e.monto === g.monto &&
          e.descripcion === g.descripcion,
      );
      if (dup) {
        duplicados++;
        continue;
      }

      try {
        await api.gastos.create({
          empresa_id: empresaId,
          fecha: g.fecha,
          descripcion: g.descripcion,
          monto: g.monto,
          tipo: g.tipo,
          mensaje: g.mensaje || undefined,
          saldo: g.saldo,
        });
        insertados++;
      } catch {
        // Si falla uno, continuamos con el resto
        duplicados++;
      }
    }

    if (insertados > 0) {
      // Recargar la lista completa para tener los IDs reales
      await get().cargarGastos(empresaId);
    }

    return { insertados, duplicados };
  },

  eliminarGasto: async (gastoId: string) => {
    try {
      await api.gastos.delete(gastoId);
      set((s) => ({
        gastos: s.gastos.filter((g) => g.id !== gastoId),
        facturas: s.facturas.filter((f) => f.gastoId !== gastoId),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar gasto';
      set({ error: msg });
    }
  },

  eliminarImportacion: (_importacionId: string) => {
    // Las importaciones se manejan en el backend con fechas de creación
    // Por ahora es no-op hasta que decidamos persistir importaciones
  },

  adjuntarFactura: async (gastoId: string, factura: Omit<Factura, 'id' | 'gastoId'>, _empresaId?: string) => {
    try {
      const nuevaFactura = await api.facturas.create({
        gasto_id: gastoId,
        image_base64: factura.imageBase64,
        image_mime: factura.imageMime,
        ocr_data: factura.ocrData as Record<string, unknown> | undefined,
        match_status: factura.matchStatus,
        match_score: factura.matchScore,
      });

      set((s) => ({
        facturas: [...s.facturas, mapFactura(nuevaFactura)],
        gastos: s.gastos.map((g) =>
          g.id === gastoId
            ? { ...g, facturaId: nuevaFactura.id, estado: 'pendiente' as GastoEstado }
            : g,
        ),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al adjuntar factura';
      set({ error: msg });
    }
  },

  actualizarEstado: async (gastoId: string, estado: GastoEstado) => {
    try {
      await api.gastos.update(gastoId, { estado });
      set((s) => ({
        gastos: s.gastos.map((g) => (g.id === gastoId ? { ...g, estado } : g)),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado';
      set({ error: msg });
    }
  },

  asignarFactura: async (facturaId: string, gastoId: string) => {
    try {
      await api.facturas.updateMatch(facturaId, {
        match_status: 'auto',
        gasto_id: gastoId,
      });
      set((s) => ({
        facturas: s.facturas.map((f) => (f.id === facturaId ? { ...f, gastoId } : f)),
        gastos: s.gastos.map((g) =>
          g.id === gastoId
            ? { ...g, facturaId, estado: 'verificado' as GastoEstado }
            : g,
        ),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al asignar factura';
      set({ error: msg });
    }
  },

  getFactura: (gastoId: string): Factura | null => {
    return get().facturas.find((f) => f.gastoId === gastoId) || null;
  },

  limpiarTodo: async () => {
    // En producción no debería existir "limpiar todo"
    // Pero si se necesita, se puede implementar borrando empresa por empresa
    set({ gastos: [], facturas: [], importaciones: [] });
  },
}));

export default useGastosStore;
