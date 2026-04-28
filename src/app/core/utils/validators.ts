import type { AbstractControl, ValidationErrors } from '@angular/forms';

export function cedulaEcuatoriana(control: AbstractControl): ValidationErrors | null {
  const v = control.value?.toString() ?? '';
  if (!v) return null;
  if (!/^\d{10}$/.test(v)) return { cedula: 'Debe tener 10 dígitos' };
  const provincia = parseInt(v.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) return { cedula: 'Código de provincia inválido' };
  const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(v[i], 10) * coefs[i];
    if (val >= 10) val -= 9;
    suma += val;
  }
  const check = suma % 10 === 0 ? 0 : 10 - (suma % 10);
  if (check !== parseInt(v[9], 10)) return { cedula: 'Número de cédula inválido' };
  return null;
}

export function telefonoEcuatoriano(control: AbstractControl): ValidationErrors | null {
  const v = control.value?.toString() ?? '';
  if (!v) return null;
  if (!/^(\+593|0)[0-9]{8,9}$/.test(v.replace(/\s/g, ''))) {
    return { telefono: 'Formato inválido (ej: 0999123456 o +5939...)' };
  }
  return null;
}
