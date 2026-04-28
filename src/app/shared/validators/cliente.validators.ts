import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export function tipoIdentificacionValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return { required: 'Selecciona un tipo de identificación.' };
    return null;
  };
}

export function numeroIdentificacionValidator(tipo = ''): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v: string = (control.value ?? '').trim();
    if (!v) return { required: 'El número de identificación es requerido.' };

    switch (tipo) {
      case 'CI':
        if (!/^\d+$/.test(v))   return { format: 'La cédula solo debe contener números.' };
        if (v.length !== 10)    return { length: 'La cédula debe tener exactamente 10 dígitos.' };
        break;
      case 'RUC':
        if (!/^\d+$/.test(v))   return { format: 'El RUC solo debe contener números.' };
        if (v.length !== 13)    return { length: 'El RUC debe tener exactamente 13 dígitos.' };
        if (!v.endsWith('001')) return { ending: 'El RUC debe terminar en 001.' };
        break;
      case 'PASS':
        if (!/^[A-Za-z0-9]+$/.test(v))      return { format: 'El pasaporte solo admite letras y números.' };
        if (v.length < 6 || v.length > 9)   return { length: 'El pasaporte debe tener entre 6 y 9 caracteres.' };
        break;
      case 'EXT':
        if (!/^[A-Za-z0-9]+$/.test(v))      return { format: 'El documento extranjero solo admite letras y números.' };
        if (v.length < 6 || v.length > 13)  return { length: 'El documento debe tener entre 6 y 13 caracteres.' };
        break;
    }

    return null;
  };
}

export function numeroIdentificacionAvailableValidator(http: HttpClient, tipo: string): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const v: string = (control.value ?? '').trim();
    if (!v || !tipo) {
      return of(null);
    }

    let urlSegment = '';
    switch (tipo) {
      case 'CI':   urlSegment = 'ci'; break;
      case 'RUC':  urlSegment = 'ruc'; break;
      case 'PASS': urlSegment = 'pasaporte'; break;
      case 'EXT':  urlSegment = 'extranjero'; break;
      default:     return of(null);
    }

    return timer(500).pipe(
      switchMap(() => {
        const url = `https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/clientes/disponibilidad/${urlSegment}/${v}`;
        
        return http.get<any>(url).pipe(
          map(res => {
            let isAvailable = true;
            if (typeof res === 'boolean') {
              isAvailable = res;
            } else if (res?.data && typeof res.data.disponible === 'boolean') {
              isAvailable = res.data.disponible;
            } else if (res && typeof res.disponible === 'boolean') {
              isAvailable = res.disponible;
            } else if (res === false) {
              isAvailable = false;
            }

            if (!isAvailable) {
              return { identificacionTaken: 'Este número de identificación ya está registrado.' };
            }
            return null;
          }),
          catchError(() => of(null))
        );
      })
    );
  };
}


export function nombresValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control.value as string)?.trim()) return { required: 'Los nombres son requeridos.' };
    return null;
  };
}

export function apellidosValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control.value as string)?.trim()) return { required: 'Los apellidos son requeridos.' };
    return null;
  };
}

export function razonSocialValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control.value as string)?.trim()) return { required: 'La razón social es requerida.' };
    return null;
  };
}

export function telefonoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v: string = (control.value ?? '').trim();
    if (!v) return null; // Es opcional, si está vacío es válido
    
    if (!/^\d+$/.test(v)) return { format: 'El teléfono solo debe contener números.' };
    if (v.length < 7 || v.length > 15) return { length: 'El teléfono debe tener entre 7 y 15 dígitos.' };
    
    return null;
  };
}
