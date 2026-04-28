import { describe, it, expect } from 'vitest';
import { formatDuration } from './duracion.util';
import { formatMoney, calcularIva, calcularTotal, IVA_RATE } from './money.util';

describe('duracion.util', () => {
  it('convierte minutos a formato legible', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(135)).toBe('2h 15m');
  });
});

describe('money.util', () => {
  it('calcula IVA correctamente', () => {
    expect(calcularIva(100)).toBeCloseTo(100 * IVA_RATE);
    expect(calcularIva(0)).toBe(0);
  });

  it('calcula total con IVA', () => {
    const subtotal = 100;
    const expected = subtotal + calcularIva(subtotal);
    expect(calcularTotal(subtotal)).toBeCloseTo(expected);
  });

  it('calcula total con cargo de servicio', () => {
    const subtotal = 100;
    const cargo = 5;
    const expected = subtotal + calcularIva(subtotal) + cargo;
    expect(calcularTotal(subtotal, cargo)).toBeCloseTo(expected);
  });
});
