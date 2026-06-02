import { describe, it, expect } from 'vitest';
import { calcularMatch, encontrarMatch } from './matchingAlgorithm';

describe('calcularMatch', () => {
  it('devuelve 0 si gasto o ocrData son null/undefined', () => {
    expect(calcularMatch(null, { fecha: '2026-01-01', monto: 50 })).toBe(0);
    expect(calcularMatch({ fecha: '2026-01-01', monto: 50 }, null)).toBe(0);
    expect(calcularMatch(undefined, undefined)).toBe(0);
  });

  it('devuelve 0 si no hay fecha ni monto en ocrData', () => {
    expect(calcularMatch({ fecha: '2026-01-01', monto: 50 }, {})).toBe(0);
    expect(calcularMatch({ fecha: '2026-01-01', monto: 50 }, { proveedor: 'X' })).toBe(0);
  });

  it('match perfecto mismo día y mismo monto', () => {
    const score = calcularMatch({ fecha: '2026-05-30', monto: 50 }, { fecha: '2026-05-30', monto: 50 });
    expect(score).toBe(1);
  });

  it('match parcial con 1 día de diferencia', () => {
    const score = calcularMatch({ fecha: '2026-05-30', monto: 75 }, { fecha: '2026-05-31', monto: 75 });
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(0.85);
  });

  it('monto fuera de tolerancia contribuye 0, fecha perfecta da 0.5', () => {
    const score = calcularMatch({ fecha: '2026-05-30', monto: 50 }, { fecha: '2026-05-30', monto: 60 });
    expect(score).toBe(0.5);
  });

  it('tolera diferencias de ±2 días por defecto', () => {
    const score = calcularMatch({ fecha: '2026-05-28', monto: 100 }, { fecha: '2026-05-30', monto: 100 });
    expect(score).toBeGreaterThan(0);
  });

  it('respeta tolerancia personalizada', () => {
    const score = calcularMatch(
      { fecha: '2026-05-28', monto: 100 },
      { fecha: '2026-05-30', monto: 100 },
      { toleranciaDias: 1, toleranciaMonto: 5 },
    );
    expect(score).toBe(0.5);
  });
});

describe('encontrarMatch', () => {
  const gastos = [
    { id: 1, fecha: '2026-05-30', monto: 50, descripcion: 'Cena', estado: 'pendiente' as const, tipo: 'gasto' as const, mensaje: null, saldo: 0, facturaId: null },
    { id: 2, fecha: '2026-05-29', monto: 200, descripcion: 'Hotel', estado: 'pendiente' as const, tipo: 'gasto' as const, mensaje: null, saldo: 0, facturaId: null },
    { id: 3, fecha: '2026-05-28', monto: 75, descripcion: 'Taxi', estado: 'pendiente' as const, tipo: 'gasto' as const, mensaje: null, saldo: 0, facturaId: null },
    { id: 4, fecha: '2026-05-30', monto: 48, descripcion: 'Cena', estado: 'sin_factura' as const, tipo: 'gasto' as const, mensaje: null, saldo: 0, facturaId: null },
  ];

  it('encuentra match único cuando hay un claro ganador', () => {
    const result = encontrarMatch(gastos, { fecha: '2026-05-30', monto: 50 });
    expect(result.match).toBe('unico');
    expect(result.gastos[0].id).toBe(1);
  });

  it('retorna ninguno cuando nadie supera el umbral mínimo', () => {
    // Fecha lejana + monto extremo: nadie debería pasar el umbral 0.3
    const result = encontrarMatch(gastos, { fecha: '2025-01-01', monto: 9999 });
    expect(result.match).toBe('ninguno');
  });

  it('excluye gastos con estado sin_factura y verificado', () => {
    const gastosConFiltro = [
      { id: 1, fecha: '2026-05-30', monto: 50, descripcion: 'Cena', estado: 'sin_factura' as const, tipo: 'gasto' as const, mensaje: null, saldo: 0, facturaId: null },
      { id: 2, fecha: '2026-05-30', monto: 50, descripcion: 'Cena', estado: 'verificado' as const, tipo: 'gasto' as const, mensaje: null, saldo: 0, facturaId: null },
    ];
    const result = encontrarMatch(gastosConFiltro, { fecha: '2026-05-30', monto: 50 });
    expect(result.match).toBe('ninguno');
  });
});
