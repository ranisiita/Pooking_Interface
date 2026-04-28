import { describe, it, expect } from 'vitest';
import { cedulaEcuatoriana, telefonoEcuatoriano } from './validators';

// Stub mínimo de AbstractControl para pruebas puras
function ctrl(value: unknown) {
  return { value } as any;
}

describe('cedulaEcuatoriana', () => {
  it('acepta cédula válida', () => {
    // Cédula ecuatoriana válida que pasa el algoritmo de verificación
    expect(cedulaEcuatoriana(ctrl('0100000009'))).toBeNull();
  });

  it('rechaza cédula con menos de 10 dígitos', () => {
    expect(cedulaEcuatoriana(ctrl('171234'))).not.toBeNull();
  });

  it('rechaza cédula con letras', () => {
    expect(cedulaEcuatoriana(ctrl('17ABCD5678'))).not.toBeNull();
  });

  it('retorna null para valor vacío', () => {
    expect(cedulaEcuatoriana(ctrl(''))).toBeNull();
  });
});

describe('telefonoEcuatoriano', () => {
  it('acepta teléfono con prefijo 0', () => {
    expect(telefonoEcuatoriano(ctrl('0999123456'))).toBeNull();
  });

  it('acepta con +593', () => {
    expect(telefonoEcuatoriano(ctrl('+59399912345'))).toBeNull();
  });

  it('rechaza formato inválido', () => {
    expect(telefonoEcuatoriano(ctrl('12345'))).not.toBeNull();
  });
});
