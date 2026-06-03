import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  Gasto, Factura, GastoPendiente, GastoEstado,
  ResultadoImportacion, Store, GastoForma, MatchStatus,
} from '../types';
import type { GastoRow, FacturaRow } from '../types';

// ─── Mappers ───────────────────────────────────────────────────────

function mapGastoRow(r: GastoRow): Gasto {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    fecha: r.fecha,
    descripcion: r.descripcion,
    monto: Number(r.monto),
    tipo: r.tipo as GastoForma,
    mensaje: r.mensaje,
    saldo: r.saldo !== null ? Number(r.saldo) : Number(r.monto),
    facturaId: null, // se asigna al cargar facturas
    estado: r.estado as GastoEstado,
  };
}

function mapFacturaRow(r: FacturaRow): Factura {
  return {
    id: r.id,
    gastoId: r.gasto_id,
    imageBase64: r.image_base64 || '',
    imageMime: r.image_mime,
    ocrData: r.ocr_fecha || r.ocr_monto
      ? {
          fecha: r.ocr_fecha,
          monto: r.ocr_monto !== null ? Number(r.ocr_monto) : null,
          proveedor: r.ocr_proveedor,
          ruc: r.ocr_ruc,
          tipo_comprobante: (r.ocr_tipo as any) || null, // eslint-disable-line @typescript-eslint/no-explicit-any
          numero_comprobante: r.ocr_numero,
        }
      : null,
    matchStatus: r.match_status as MatchStatus,
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
      if (!empresaId) {
        set({ gastos: [], facturas: [], loading: false });
        return;
      }

      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('fecha', { ascending: false });

      if (gastosError) throw new Error(gastosError.message);

      const { data: facturasData, error: facturasError } = await supabase
        .from('facturas')
        .select('*');

      if (facturasError) throw new Error(facturasError.message);

      const gastos = (gastosData || []).map(mapGastoRow);
      const facturas = (facturasData || []).map(mapFacturaRow);

      // Vincular facturaId en gastos
      for (const g of gastos) {
        const factura = facturas.find((f) => f.gastoId === g.id);
        if (factura) {
          g.facturaId = factura.id;
          g.matchStatus = factura.matchStatus;
          g.facturaMonto = factura.ocrData?.monto ?? null;
        }
      }

      set({ gastos, facturas, loading: false });
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

      const { error } = await supabase.from('gastos').insert({
        empresa_id: empresaId,
        fecha: g.fecha,
        descripcion: g.descripcion,
        monto: g.monto,
        tipo: g.tipo,
        mensaje: g.mensaje || null,
        saldo: g.saldo,
      });

      if (error) {
        duplicados++;
      } else {
        insertados++;
      }
    }

    if (insertados > 0) {
      await get().cargarGastos(empresaId);
    }

    return { insertados, duplicados };
  },

  eliminarGasto: async (gastoId: string) => {
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', gastoId);
      if (error) throw new Error(error.message);

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
    // Las importaciones se manejan por fecha de creación en Supabase
    // No-op por ahora
  },

  adjuntarFactura: async (gastoId: string, factura: Omit<Factura, 'id' | 'gastoId'>, _empresaId?: string) => {
    try {
      const ocr = factura.ocrData;
      const { data, error } = await supabase
        .from('facturas')
        .insert({
          gasto_id: gastoId,
          image_base64: factura.imageBase64 || null,
          image_mime: factura.imageMime || 'image/jpeg',
          ocr_fecha: ocr?.fecha || null,
          ocr_monto: ocr?.monto || null,
          ocr_proveedor: ocr?.proveedor || null,
          ocr_ruc: ocr?.ruc || null,
          ocr_tipo: ocr?.tipo_comprobante || null,
          ocr_numero: ocr?.numero_comprobante || null,
          match_status: factura.matchStatus,
          match_score: factura.matchScore || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('No se pudo crear la factura');

      const nuevaFactura = mapFacturaRow(data as FacturaRow);

      // Actualizar el gasto con el facturaId
      const { error: updateError } = await supabase
        .from('gastos')
        .update({ estado: 'pendiente' })
        .eq('id', gastoId);

      if (updateError) throw new Error(updateError.message);

      set((s) => ({
        facturas: [...s.facturas, nuevaFactura],
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
      const { error } = await supabase
        .from('gastos')
        .update({ estado })
        .eq('id', gastoId);

      if (error) throw new Error(error.message);

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
      const { error: facturaError } = await supabase
        .from('facturas')
        .update({ match_status: 'auto', gasto_id: gastoId })
        .eq('id', facturaId);

      if (facturaError) throw new Error(facturaError.message);

      const { error: gastoError } = await supabase
        .from('gastos')
        .update({ estado: 'verificado' })
        .eq('id', gastoId);

      if (gastoError) throw new Error(gastoError.message);

      set((s) => ({
        facturas: s.facturas.map((f) =>
          f.id === facturaId ? { ...f, gastoId, matchStatus: 'auto' as MatchStatus } : f,
        ),
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
    set({ gastos: [], facturas: [], importaciones: [] });
  },
}));

export default useGastosStore;
