import { create } from 'zustand';

const STORAGE_KEY = 'saraia-data';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { gastos: [], facturas: [], proximoId: 1, importaciones: [] };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      gastos: state.gastos,
      facturas: state.facturas,
      proximoId: state.proximoId,
      importaciones: state.importaciones,
    }));
  } catch {}
}

const useGastosStore = create((set, get) => {
  const initial = loadState();

  return {
    gastos: initial.gastos,
    facturas: initial.facturas,
    proximoId: initial.proximoId,
    importaciones: initial.importaciones || [],

    importarGastos: (nuevosGastos) => {
      const state = get();
      let { proximoId } = state;
      const existentes = state.gastos;
      const insertados = [];
      const duplicados = [];

      for (const g of nuevosGastos) {
        // Detectar duplicado por (fecha + monto + descripcion)
        const dup = existentes.find(
          (e) => e.fecha.split('T')[0] === g.fecha.split('T')[0] && e.monto === g.monto && e.descripcion === g.descripcion
        );
        if (dup) {
          duplicados.push(g);
          continue;
        }

        insertados.push({
          ...g,
          id: proximoId++,
          facturaId: null,
          estado: 'pendiente',
        });
      }

      if (insertados.length === 0) {
        return { insertados: 0, duplicados: duplicados.length };
      }

      // Registrar la importación
      const importacion = {
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

    eliminarGasto: (gastoId) => {
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

    eliminarImportacion: (importacionId) => {
      // No implementado por ahora - requiere tracking de qué IDs pertenecen a cada importación
    },

    adjuntarFactura: (gastoId, factura) => {
      const state = get();
      const facturaConId = { ...factura, id: state.proximoId, gastoId };
      const nuevoProximoId = state.proximoId + 1;

      set((s) => ({
        facturas: [...s.facturas, facturaConId],
        gastos: s.gastos.map((g) =>
          g.id === gastoId ? { ...g, facturaId: facturaConId.id, estado: 'pendiente' } : g
        ),
        proximoId: nuevoProximoId,
      }));
      saveState(get());
    },

    actualizarEstado: (gastoId, estado) => {
      set((s) => ({
        gastos: s.gastos.map((g) => (g.id === gastoId ? { ...g, estado } : g)),
      }));
      saveState(get());
    },

    asignarFactura: (facturaId, gastoId) => {
      set((s) => ({
        facturas: s.facturas.map((f) => (f.id === facturaId ? { ...f, gastoId } : f)),
        gastos: s.gastos.map((g) =>
          g.id === gastoId ? { ...g, facturaId, estado: 'verificado' } : g
        ),
      }));
      saveState(get());
    },

    getFactura: (gastoId) => {
      return get().facturas.find((f) => f.gastoId === gastoId) || null;
    },

    limpiarTodo: () => {
      set({ gastos: [], facturas: [], proximoId: 1, importaciones: [] });
      localStorage.removeItem(STORAGE_KEY);
    },
  };
});

export default useGastosStore;
