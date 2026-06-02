// Store global con Zustand + persistencia localStorage
import { create } from 'zustand';

// Claves para localStorage
const STORAGE_KEY = 'cajachica-data';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { gastos: [], facturas: [], proximoId: 1 };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      gastos: state.gastos,
      facturas: state.facturas,
      proximoId: state.proximoId,
    }));
  } catch {}
}

const useGastosStore = create((set, get) => {
  const initial = loadState();

  return {
    gastos: initial.gastos,
    facturas: initial.facturas,
    proximoId: initial.proximoId,

    // ─── Importar gastos desde Excel Yape ────────────────────────────
    importarGastos: (nuevosGastos) => {
      const state = get();
      let { proximoId } = state;

      const gastosConId = nuevosGastos.map((g) => ({
        ...g,
        id: proximoId++,
        facturaId: null,
        estado: 'pendiente', // pendiente | verificado | conflicto | sin_factura
      }));

      set((s) => ({
        gastos: [...gastosConId, ...s.gastos],
        proximoId,
      }));
      saveState(get());
    },

    // ─── Adjuntar factura a un gasto ─────────────────────────────────
    adjuntarFactura: (gastoId, factura) => {
      const state = get();
      const facturaConId = { ...factura, id: state.proximoId, gastoId };
      const nuevoProximoId = state.proximoId + 1;

      set((s) => ({
        facturas: [...s.facturas, facturaConId],
        gastos: s.gastos.map((g) =>
          g.id === gastoId
            ? { ...g, facturaId: facturaConId.id, estado: 'pendiente' }
            : g
        ),
        proximoId: nuevoProximoId,
      }));
      saveState(get());
    },

    // ─── Actualizar estado de un gasto ───────────────────────────────
    actualizarEstado: (gastoId, estado) => {
      set((s) => ({
        gastos: s.gastos.map((g) =>
          g.id === gastoId ? { ...g, estado } : g
        ),
      }));
      saveState(get());
    },

    // ─── Asignar factura manualmente (resolución de conflictos) ──────
    asignarFactura: (facturaId, gastoId) => {
      set((s) => ({
        facturas: s.facturas.map((f) =>
          f.id === facturaId ? { ...f, gastoId } : f
        ),
        gastos: s.gastos.map((g) =>
          g.id === gastoId
            ? { ...g, facturaId, estado: 'verificado' }
            : g
        ),
      }));
      saveState(get());
    },

    // ─── Obtener factura de un gasto ─────────────────────────────────
    getFactura: (gastoId) => {
      return get().facturas.find((f) => f.gastoId === gastoId) || null;
    },

    // ─── Limpiar todos los datos ─────────────────────────────────────
    limpiarTodo: () => {
      set({ gastos: [], facturas: [], proximoId: 1 });
      localStorage.removeItem(STORAGE_KEY);
    },
  };
});

export default useGastosStore;
