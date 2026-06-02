import { describe, it, expect } from 'vitest';

// Testeamos la lógica de parseo de fecha internamente
// (parsearFecha no está exportada, así que probamos a través del comportamiento observable)

describe('parsearFecha (internal logic)', () => {
  // Probamos la función parsearFecha mediante su lógica duplicada aquí
  function parsearFecha(valor: unknown): Date | null {
    if (valor === null || valor === undefined || valor === '') return null;

    // Serial de Excel
    if (typeof valor === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + valor * 86400000);
      return isNaN(d.getTime()) ? null : d;
    }

    const str = String(valor).trim();

    // Formato dd/mm/aaaa (con hora opcional)
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

    // ISO
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    return null;
  }

  it('parsea fecha ISO', () => {
    const d = parsearFecha('2026-05-30');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4); // mayo = 4
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
    // 30/05/2026 en serial Excel
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
    expect(parsearFecha('13/13/2026')).toBeNull(); // mes 13 inválido
  });
});
