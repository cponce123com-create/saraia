import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import type { Gasto, Factura, GastoPendiente, GastoEstado, Importacion } from '../types';

interface TestStore {
  gastos: Gasto[];
  facturas: Factura[];
  proximoId: number;
  importaciones: Importacion[];
  importarGastos: (nuevosGastos: GastoPendiente[]) => { insertados: number; duplicados: number };
  eliminarGasto: (gastoId: number) => void;
  adjuntarFactura: (gastoId: number, factura: Omit<Factura, 'id' | 'gastoId'>) => void;
  actualizarEstado: (gastoId: number, estado: GastoEstado) => void;
  asignarFactura: (facturaId: number, gastoId: number) => void;
  getFactura: (gastoId: number) => Factura | null;
  limpiarTodo: () => void;
}

function createTestStore(initialGastos: Gasto[] = []) {
  let proximoId = initialGastos.length > 0 ? Math.max(...initialGastos.map((g) => g.id)) + 1 : 1;

  return create<TestStore>((set, get) => ({
    gastos: initialGastos,
    facturas: [],
    proximoId,
    importaciones: [],

    importarGastos: (nuevosGastos) => {
      const state = get();
      const existentes = state.gastos;
      const insertados: Gasto[] = [];
      const duplicados: GastoPendiente[] = [];

      for (const g of nuevosGastos) {
        const dup = existentes.find(
          (e) => e.fecha.split('T')[0] === g.fecha.split('T')[0] && e.monto === g.monto && e.descripcion === g.descripcion,
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

      set({ gastos: [...insertados, ...state.gastos], proximoId });
      return { insertados: insertados.length, duplicados: duplicados.length };
    },

    eliminarGasto: (gastoId) => {
      const state = get();
      const gasto = state.gastos.find((g) => g.id === gastoId);
      const facturaId = gasto?.facturaId;
      set({
        gastos: state.gastos.filter((g) => g.id !== gastoId),
        facturas: facturaId ? state.facturas.filter((f) => f.id !== facturaId) : state.facturas,
      });
    },

    adjuntarFactura: (gastoId, factura) => {
      const state = get();
      const facturaConId = { ...factura, id: state.proximoId, gastoId };
      set({
        facturas: [...state.facturas, facturaConId],
        gastos: state.gastos.map((g) =>
          g.id === gastoId ? { ...g, facturaId: facturaConId.id, estado: 'pendiente' as GastoEstado } : g,
        ),
        proximoId: state.proximoId + 1,
      });
    },

    actualizarEstado: (gastoId, estado) => {
      set((s) => ({
        gastos: s.gastos.map((g) => (g.id === gastoId ? { ...g, estado } : g)),
      }));
    },

    asignarFactura: (facturaId, gastoId) => {
      set((s) => ({
        facturas: s.facturas.map((f) => (f.id === facturaId ? { ...f, gastoId } : f)),
        gastos: s.gastos.map((g) =>
          g.id === gastoId ? { ...g, facturaId, estado: 'verificado' as GastoEstado } : g,
        ),
      }));
    },

    getFactura: (gastoId) => {
      return get().facturas.find((f) => f.gastoId === gastoId) || null;
    },

    limpiarTodo: () => {
      set({ gastos: [], facturas: [], proximoId: 1, importaciones: [] });
    },
  }));
}

const gastoEjemplo: Gasto = {
  id: 1,
  fecha: '2026-05-30T20:50:25Z',
  descripcion: 'Cena en restaurant',
  monto: 75.5,
  tipo: 'gasto',
  mensaje: null,
  saldo: 0,
  facturaId: null,
  estado: 'pendiente',
};

const gastoPendienteEjemplo: GastoPendiente = {
  fecha: '2026-05-30T20:50:25Z',
  descripcion: 'Nuevo gasto',
  monto: 100,
  tipo: 'gasto',
  mensaje: null,
  saldo: 0,
};

describe('gastosStore', () => {
  describe('importarGastos', () => {
    it('inserta gastos nuevos y retorna contador', () => {
      const store = createTestStore();
      const result = store.getState().importarGastos([gastoPendienteEjemplo]);

      expect(result.insertados).toBe(1);
      expect(result.duplicados).toBe(0);
      expect(store.getState().gastos).toHaveLength(1);
      expect(store.getState().gastos[0].descripcion).toBe('Nuevo gasto');
      expect(store.getState().gastos[0].estado).toBe('pendiente');
    });

    it('detecta duplicados por fecha + monto + descripcion', () => {
      const store = createTestStore([gastoEjemplo]);
      const dupe: GastoPendiente = {
        fecha: '2026-05-30T20:50:25Z',
        descripcion: 'Cena en restaurant',
        monto: 75.5,
        tipo: 'gasto',
        mensaje: null,
        saldo: 0,
      };

      const result = store.getState().importarGastos([dupe]);
      expect(result.insertados).toBe(0);
      expect(result.duplicados).toBe(1);
    });

    it('inserta múltiples gastos y asigna IDs secuenciales', () => {
      const store = createTestStore();
      const result = store.getState().importarGastos([
        { ...gastoPendienteEjemplo, descripcion: 'Gasto 1' },
        { ...gastoPendienteEjemplo, descripcion: 'Gasto 2' },
      ]);

      expect(result.insertados).toBe(2);
      const gastos = store.getState().gastos;
      // Los nuevos se insertan al inicio: primero Gasto 1 (id=1), luego Gasto 2 (id=2)
      expect(gastos[0].id).toBe(1);
      expect(gastos[0].descripcion).toBe('Gasto 1');
      expect(gastos[1].id).toBe(2);
      expect(gastos[1].descripcion).toBe('Gasto 2');
    });
  });

  describe('eliminarGasto', () => {
    it('elimina gasto y su factura asociada', () => {
      const store = createTestStore([gastoEjemplo]);
      store.getState().adjuntarFactura(1, {
        imageBase64: 'abc',
        imageMime: 'image/jpeg',
        ocrData: null,
        matchStatus: 'auto',
        createdAt: new Date().toISOString(),
      });

      expect(store.getState().facturas).toHaveLength(1);
      store.getState().eliminarGasto(1);
      expect(store.getState().gastos).toHaveLength(0);
      expect(store.getState().facturas).toHaveLength(0);
    });
  });

  describe('adjuntarFactura', () => {
    it('asocia factura a un gasto', () => {
      const store = createTestStore([gastoEjemplo]);
      store.getState().adjuntarFactura(1, {
        imageBase64: 'base64data',
        imageMime: 'image/png',
        ocrData: { fecha: '2026-05-30', monto: 75.5, proveedor: 'Restaurant X', ruc: null, tipo_comprobante: null, numero_comprobante: null },
        matchStatus: 'auto',
        createdAt: new Date().toISOString(),
      });

      // proximoId empieza en 2 (id máximo 1 + 1), así que la factura tiene id=2
      const gasto = store.getState().gastos[0];
      expect(gasto.facturaId).toBe(2);
      expect(store.getState().facturas).toHaveLength(1);
      expect(store.getState().facturas[0].gastoId).toBe(1);
    });
  });

  describe('getFactura', () => {
    it('retorna null si no hay factura', () => {
      const store = createTestStore([gastoEjemplo]);
      expect(store.getState().getFactura(1)).toBeNull();
    });

    it('retorna la factura asociada', () => {
      const store = createTestStore([gastoEjemplo]);
      store.getState().adjuntarFactura(1, {
        imageBase64: 'data',
        imageMime: 'image/jpeg',
        ocrData: null,
        matchStatus: 'auto',
        createdAt: new Date().toISOString(),
      });

      const factura = store.getState().getFactura(1);
      expect(factura).not.toBeNull();
      expect(factura!.gastoId).toBe(1);
    });
  });

  describe('actualizarEstado', () => {
    it('cambia el estado de un gasto', () => {
      const store = createTestStore([gastoEjemplo]);
      store.getState().actualizarEstado(1, 'verificado');
      expect(store.getState().gastos[0].estado).toBe('verificado');
    });
  });

  describe('asignarFactura', () => {
    it('reasigna factura a otro gasto', () => {
      const store = createTestStore([
        gastoEjemplo,
        { ...gastoEjemplo, id: 2, descripcion: 'Otro gasto' },
      ]);
      store.getState().adjuntarFactura(1, {
        imageBase64: 'data',
        imageMime: 'image/jpeg',
        ocrData: null,
        matchStatus: 'conflicto',
        createdAt: new Date().toISOString(),
      });

      store.getState().asignarFactura(3, 2); // factura id=3 (proximoId=3)
      const gasto2 = store.getState().gastos.find((g) => g.id === 2);
      expect(gasto2?.estado).toBe('verificado');
      expect(gasto2?.facturaId).toBe(3);
    });
  });

  describe('limpiarTodo', () => {
    it('limpia todos los datos', () => {
      const store = createTestStore([gastoEjemplo]);
      store.getState().limpiarTodo();
      expect(store.getState().gastos).toHaveLength(0);
      expect(store.getState().facturas).toHaveLength(0);
      expect(store.getState().proximoId).toBe(1);
    });
  });
});
