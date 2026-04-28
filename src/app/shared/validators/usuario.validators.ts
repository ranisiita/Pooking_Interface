import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v: string = control.value ?? '';
    if (!v.trim()) return { required: 'El usuario es requerido.' };
    if (v.length < 4) return { minLength: 'Mínimo 4 caracteres.' };
    if (v.length > 50) return { maxLength: 'Máximo 50 caracteres.' };
    return null;
  };
}

export function usernameAvailableValidator(http: HttpClient): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || control.value.trim() === '' || control.value.length < 4) {
      return of(null);
    }
    
    // Esperar 500ms antes de consultar a la base de datos (debounce)
    return timer(500).pipe(
      switchMap(() => {
        const url = `https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/usuarios/disponibilidad/${control.value}`;
        
        return http.get<any>(url).pipe(
          map(res => {
            let isAvailable = true;
            
            // Verificamos si la respuesta es directamente un booleano o viene dentro de data.disponible
            if (typeof res === 'boolean') {
              isAvailable = res;
            } else if (res && res.data && typeof res.data.disponible === 'boolean') {
              isAvailable = res.data.disponible;
            } else if (res && typeof res.disponible === 'boolean') {
              isAvailable = res.disponible;
            } else if (res === false) {
              isAvailable = false; // fallback
            }

            // Si isAvailable es falso, entonces el usuario ya está ocupado
            if (!isAvailable) {
              return { usernameTaken: 'Este usuario ya está en uso.' };
            }
            return null; // Usuario disponible
          }),
          catchError((err) => {
            // En caso de error de servidor, dejar pasar para no bloquear el registro
            return of(null);
          })
        );
      })
    );
  };
}

export function correoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v: string = control.value ?? '';
    if (!v.trim()) return { required: 'El correo es requerido.' };
    if (!v.includes('@')) return { missingAt: 'Falta el símbolo @ en el correo.' };
    const parts = v.split('@');
    if (parts.length !== 2 || !parts[1]) return { emptyDomain: 'El dominio después del @ está vacío.' };
    if (!parts[1].includes('.')) return { missingDot: 'Falta el punto (.) en el dominio del correo.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { invalidFormat: 'Formato de correo inválido.' };
    if (v.length > 120) return { maxLength: 'Máximo 120 caracteres.' };
    return null;
  };
}

export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const p: string = control.value ?? '';
    if (!p) return { required: 'La contraseña es requerida.' };
    if (p.length < 8) return { minLength: 'Mínimo 8 caracteres.' };
    if (!/[0-9]/.test(p)) return { noNumber: 'Debe contener al menos un número.' };
    if (!/[^A-Za-z0-9]/.test(p)) return { noSpecial: 'Debe contener al menos un carácter especial (!@#$...).' };
    return null;
  };
}
