import { describe, it, expect } from 'vitest';
import { normalizarMonto } from './excelParser';

describe('normalizarMonto', () => {
  it('número simple sin separadores', () => {
    expect(normalizarMonto('75.50')).toBe(75.5);
    expect(normalizarMonto('100')).toBe(100);
  });

  it('número con separador de miles inglés (1,234.56)', () => {
    expect(normalizarMonto('1,234.56')).toBe(1234.56);
    expect(normalizarMonto('12,000.00')).toBe(12000);
    expect(normalizarMonto('1,200')).toBe(1200);
  });

  it('número con separador de miles español (1.234,56)', () => {
    expect(normalizarMonto('1.234,56')).toBe(1234.56);
    expect(normalizarMonto('12.000,00')).toBe(12000);
    expect(normalizarMonto('1.200')).toBe(1200); // punto es separador de miles
  });

  it('número negativo', () => {
    expect(normalizarMonto('-75.50')).toBe(-75.5);
    expect(normalizarMonto('-1,234.56')).toBe(-1234.56);
  });

  it('número como valor numérico (ya parseado)', () => {
    expect(normalizarMonto(75.5)).toBe(75.5);
    expect(normalizarMonto(1234)).toBe(1234);
  });

  it('string vacío o null retorna NaN', () => {
    expect(normalizarMonto('')).toBeNaN();
    expect(normalizarMonto(null)).toBeNaN();
    expect(normalizarMonto(undefined)).toBeNaN();
  });

  it('string con caracteres no numéricos', () => {
    expect(normalizarMonto('S/ 1,234.56')).toBe(1234.56);
    expect(normalizarMonto('USD 500.00')).toBe(500);
    expect(normalizarMonto('-$ 75.50')).toBe(-75.5);
  });

  it('número entero sin decimales', () => {
    expect(normalizarMonto('50')).toBe(50);
    expect(normalizarMonto('1,000')).toBe(1000);
  });

  it('cero', () => {
    expect(normalizarMonto('0')).toBe(0);
    expect(normalizarMonto(0)).toBe(0);
  });
});

describe('parsearFecha (internal logic)', () => {
  function parsearFecha(valor: unknown): Date | null {
    if (valor === null || valor === undefined || valor === '') return null;

    if (typeof valor === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + valor * 86400000);
      return isNaN(d.getTime()) ? null : d;
    }

    const str = String(valor).trim();

    const mDMY = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (mDMY) {
      const dia = parseInt(mDMY[1]);
      const mes = parseInt(mDMY[2]);
      let anio = parseInt(mDMY[3]);
      if (anio < 100) anio += 2000;
      const hora = parseInt(mDMY[4] || '0');
      const min = parseInt(mDMY[5] || '0');
      const seg = parseInt(mDMY[6] || '0');
      const d = new Date(anio, mes - 1, dia, hora, min, seg);
      if (!isNaN(d.getTime()) && d.getDate() === dia && d.getMonth() === mes - 1) return d;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    return null;
  }

  it('parsea fecha ISO', () => {
    const d = parsearFecha('2026-05-30');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getDate()).toBe(30);
  });

  it('parsea fecha ISO con hora', () => {
    const d = parsearFecha('2026-05-30T20:50:25Z');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it('parsea formato dd/mm/aaaa', () => {
    const d = parsearFecha('30/05/2026');
    expect(d).not.toBeNull();
    expect(d!.getDate()).toBe(30);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getFullYear()).toBe(2026);
  });

  it('parsea formato dd/mm/aaaa con hora', () => {
    const d = parsearFecha('30/05/2026 20:50:25');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(20);
    expect(d!.getMinutes()).toBe(50);
  });

  it('parsea formato dd-mm-aaaa', () => {
    const d = parsearFecha('30-05-2026');
    expect(d).not.toBeNull();
    expect(d!.getDate()).toBe(30);
  });

  it('parsea año corto (dd/mm/aa)', () => {
    const d = parsearFecha('30/05/26');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it('parsea serial de Excel (número)', () => {
    const d = parsearFecha(46140);
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it('retorna null para valores vacíos', () => {
    expect(parsearFecha(null)).toBeNull();
    expect(parsearFecha(undefined)).toBeNull();
    expect(parsearFecha('')).toBeNull();
  });

  it('retorna null para strings inválidos', () => {
    expect(parsearFecha('not-a-date')).toBeNull();
    expect(parsearFecha('13/13/2026')).toBeNull();
  });
});
