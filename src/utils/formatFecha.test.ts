import { describe, it, expect } from 'vitest';
import { formatFecha, formatFechaCorta, formatFechaHora, soloFecha } from './formatFecha';

describe('formatFecha', () => {
  it('formatea fecha ISO a dd/mm/aaaa', () => {
    expect(formatFecha('2026-05-30T20:50:25Z')).toBe('30/05/2026');
  });

  it('maneja fechas sin hora', () => {
    expect(formatFecha('2026-01-05T14:30:00Z')).toBe('05/01/2026');
  });

  it('retorna string vacío para null/undefined', () => {
    expect(formatFecha(null)).toBe('');
    expect(formatFecha(undefined)).toBe('');
  });
});

describe('formatFechaCorta', () => {
  it('retorna dd/mm sin año', () => {
    expect(formatFechaCorta('2026-05-30T20:50:25Z')).toBe('30/05');
  });
});

describe('formatFechaHora', () => {
  it('incluye hora y minuto', () => {
    const result = formatFechaHora('2026-05-30T20:50:25Z');
    expect(result).toContain('30/05/2026');
    expect(result).toContain('20:50');
  });
});

describe('soloFecha', () => {
  it('retorna solo YYYY-MM-DD', () => {
    expect(soloFecha('2026-05-30T20:50:25Z')).toBe('2026-05-30');
  });
});
