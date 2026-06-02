import { create } from 'zustand';
import type { Gasto, Factura, Importacion, GastoPendiente, GastoEstado, ResultadoImportacion, Store } from '../types';

const STORAGE_KEY = 'saraia-data';

interface SavedState {
  gastos: Gasto[];
  facturas: Factura[];
  proximoId: number;
  importaciones: Importacion[];
}

function loadState(): SavedState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as SavedState;
  } catch {
    // Ignorar errores de parseo de localStorage
  }
  return { gastos: [], facturas: [], proximoId: 1, importaciones: [] };
}

function saveState(state: { gastos: Gasto[]; facturas: Factura[]; proximoId: number; importaciones: Importacion[] }): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        gastos: state.gastos,
        facturas: state.facturas,
        proximoId: state.proximoId,
        importaciones: state.importaciones,
      }),
    );
  } catch {
    // Ignorar errores de escritura en localStorage
  }
}

const useGastosStore = create<Store>()((set, get) => {
  const initial = loadState();

  return {
    gastos: initial.gastos,
    facturas: initial.facturas,
    proximoId: initial.proximoId,
    importaciones: initial.importaciones || [],

    importarGastos: (nuevosGastos: GastoPendiente[]): ResultadoImportacion => {
      const state = get();
      let { proximoId } = state;
      const existentes = state.gastos;
      const insertados: Gasto[] = [];
      const duplicados: GastoPendiente[] = [];

      for (const g of nuevosGastos) {
        // Detectar duplicado por (fecha + monto + descripcion)
        const dup = existentes.find(
          (e) =>
            e.fecha.split('T')[0] === g.fecha.split('T')[0] && e.monto === g.monto && e.descripcion === g.descripcion,
        );
        if (dup) {
          duplicados.push(g);
          continue;
        }

        insertados.push({
          ...g,
          id: proximoId++,
          facturaId: null,
          estado: 'pendiente' as GastoEstado,
        });
      }

      if (insertados.length === 0) {
        return { insertados: 0, duplicados: duplicados.length };
      }

      // Registrar la importación
      const importacion: Importacion = {
        id: proximoId++,
        fecha: new Date().toISOString(),
        cantidad: insertados.length,
        duplicados: duplicados.length,
      };

      set((s) => ({
        gastos: [...insertados, ...s.gastos],
        importaciones: [importacion, ...(s.importaciones || [])],
        proximoId,
      }));
      saveState(get());

      return { insertados: insertados.length, duplicados: duplicados.length };
    },

    eliminarGasto: (gastoId: number): void => {
      const state = get();
      const gasto = state.gastos.find((g) => g.id === gastoId);
      // Eliminar factura asociada
      const facturaId = gasto?.facturaId;
      set((s) => ({
        gastos: s.gastos.filter((g) => g.id !== gastoId),
        facturas: facturaId ? s.facturas.filter((f) => f.id !== facturaId) : s.facturas,
      }));
      saveState(get());
    },

    eliminarImportacion: (_importacionId: number): void => {
      // No implementado por ahora - requiere tracking de qué IDs pertenecen a cada importación
    },

    adjuntarFactura: (gastoId: number, factura: Omit<Factura, 'id' | 'gastoId'>): void => {
      const state = get();
      const facturaConId: Factura = { ...factura, id: state.proximoId, gastoId };
      const nuevoProximoId = state.proximoId + 1;

      set((s) => ({
        facturas: [...s.facturas, facturaConId],
        gastos: s.gastos.map((g) => (g.id === gastoId ? { ...g, facturaId: facturaConId.id, estado: 'pendiente' as GastoEstado } : g)),
        proximoId: nuevoProximoId,
      }));
      saveState(get());
    },

    actualizarEstado: (gastoId: number, estado: GastoEstado): void => {
      set((s) => ({
        gastos: s.gastos.map((g) => (g.id === gastoId ? { ...g, estado } : g)),
      }));
      saveState(get());
    },

    asignarFactura: (facturaId: number, gastoId: number): void => {
      set((s) => ({
        facturas: s.facturas.map((f) => (f.id === facturaId ? { ...f, gastoId } : f)),
        gastos: s.gastos.map((g) => (g.id === gastoId ? { ...g, facturaId, estado: 'verificado' as GastoEstado } : g)),
      }));
      saveState(get());
    },

    getFactura: (gastoId: number): Factura | null => {
      return get().facturas.find((f) => f.gastoId === gastoId) || null;
    },

    limpiarTodo: (): void => {
      set({ gastos: [], facturas: [], proximoId: 1, importaciones: [] });
      localStorage.removeItem(STORAGE_KEY);
    },
  };
});

export default useGastosStore;
