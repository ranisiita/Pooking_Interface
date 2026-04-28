import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/ui/toast/toast.service';

/** Convierte el objeto `details` o `errors` del backend en una lista legible. */
function extraerMensajesValidacion(err: unknown): string | null {
  const body = (err as { error?: Record<string, unknown> })?.error;
  if (!body) return null;

  // Formato Booking API: { message, errors: string[] }
  const errArr = body['errors'];
  if (Array.isArray(errArr) && errArr.length > 0) {
    return (errArr as string[]).join(' · ');
  }

  // Formato details: { "campo": ["msg1", "msg2"] }
  const details = body['details'];
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const lineas = Object.entries(details as Record<string, string[]>)
      .flatMap(([campo, msgs]) =>
        (msgs as string[]).map((m) => `${humanizarCampo(campo)}: ${m}`),
      );
    if (lineas.length > 0) return lineas.join(' · ');
  }

  return null;
}

function humanizarCampo(campo: string): string {
  const mapa: Record<string, string> = {
    nombres: 'Nombres', apellidos: 'Apellidos',
    correo: 'Correo', telefono: 'Teléfono',
    direccion: 'Dirección', fecha_nacimiento: 'Fecha de nacimiento',
    tipo_identificacion: 'Tipo de identificación',
    numero_identificacion: 'Número de identificación',
    nombre_pasajero: 'Nombre del pasajero',
    apellido_pasajero: 'Apellido del pasajero',
    tipo_documento_pasajero: 'Tipo de documento',
    numero_documento_pasajero: 'Número de documento',
    razonSocial: 'Razón social', estado: 'Estado',
    guidTipoServicio: 'Tipo de servicio',
  };
  return mapa[campo] ?? campo;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast  = inject(ToastService);

  return next(req).pipe(
    catchError((err) => {
      const status: number = err.status ?? 0;

      const apiMsg: string =
        err.error?.message ?? err.error?.title ?? err.message ?? 'Error inesperado';

      switch (true) {
        case status === 401:
          toast.show('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          break;

        case status === 400: {
          const detalle = extraerMensajesValidacion(err);
          toast.show(detalle ?? apiMsg, 'error');
          break;
        }

        case status === 404:
          // Usar el mensaje real del backend si existe y es informativo
          toast.show(apiMsg && apiMsg !== 'Error inesperado' ? apiMsg : 'El recurso solicitado no fue encontrado.', 'error');
          break;

        case status === 409:
          toast.show(apiMsg, 'error');
          break;

        case status === 0:
          toast.show('Sin conexión con el servidor. Verifica que el backend esté activo.', 'error');
          break;

        default:
          toast.show(apiMsg, 'error');
      }

      return throwError(() => err);
    }),
  );
};
