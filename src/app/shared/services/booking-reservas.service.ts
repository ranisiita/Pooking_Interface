import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * GUIDs fijos del tipo de servicio (acordados con backend).
 * Se usan en `guidServicioRef` al registrar una reserva en el endpoint
 * general de Booking/clientes.
 */
export const TIPO_SERVICIO_GUIDS = {
  VUELOS: '55efed9f-f9f0-4376-acec-fa8c76954cc6',
  ALOJAMIENTO: '7649eca9-0480-44b0-aaf0-2dcf4ebc45bc',
  ATRACCIONES: '5bbd422f-6ddb-48c3-86c3-28046ff263ee',
  CARROS: '1c6219ac-9154-4fa7-9c4d-91b3a5d1e673',
} as const;

/**
 * Payload del registro general de reservas (POST /api/v2/booking/reservas).
 * Coincide 1:1 con el contrato de Swagger.
 */
export interface BookingReservaPayload {
  guidCliente: string;
  guidServicioRef: string;
  nombreServicioSnap: string;
  tipoServicioSnap: string;
  nombreProveedor: string;
  idReservaExterna: string;
  fechaInicio: string; // ISO 8601 (YYYY-MM-DDTHH:mm:ss)
  fechaFin: string;
  canalOrigen: string;
  montoTotal: number;
  moneda: string;
  observaciones?: string;
}

export interface BookingReservaResponse<T = unknown> {
  status?: number;
  message?: string;
  data?: T;
}

/**
 * Servicio compartido para el endpoint general de reservas del Booking
 * (clientes/historial). Cada feature (atracciones, autos, alojamiento, vuelos)
 * llama este servicio después de confirmar el pago en su microservicio
 * específico para alimentar el historial centralizado.
 */
@Injectable({ providedIn: 'root' })
export class BookingReservasService {
  private http = inject(HttpClient);

  /**
   * URL real del endpoint del Middleware/Gateway que registra reservas en
   * el servicio de Clientes.
   *
   *   POST ${API_GATEWAY_URL}/api/v2/booking/clientes/reservas
   *
   * Es la MISMA ruta que ya usa `CarService.registrarReservaCliente`
   * (cars la usa y sus reservas sí aparecen en la tabla general). Confirmado
   * por el equipo backend — no usar `/clientes/reservas` ni `/api/v2/reservas`
   * ni la base URL de ningún microservicio de proveedor.
   */
  private readonly baseUrl = `${environment.apiGatewayUrl}/api/v2/booking/clientes/reservas`;

  /**
   * Registra una reserva ya creada en algún microservicio (atracciones,
   * autos, alojamiento, vuelos) dentro del historial de Booking/Clientes
   * vía el middleware.
   */
  registrarReserva(payload: BookingReservaPayload): Observable<BookingReservaResponse> {
    // Logs temporales — útiles para verificar en desarrollo que el POST
    // sale al endpoint correcto y con el payload bien formado.
    // TODO(debug): retirar console.* cuando el flujo se valide en prod.
    console.info('[BookingReservas] POST', this.baseUrl);
    console.info('[BookingReservas] payload', payload);
    return this.http.post<BookingReservaResponse>(this.baseUrl, payload);
  }

  /** URL pública de solo lectura — útil para logs/debug en los componentes. */
  get endpointUrl(): string {
    return this.baseUrl;
  }

  /** Helper: combina fecha (YYYY-MM-DD) y hora (HH:mm) en ISO sin zona. */
  static combinarFechaHora(fecha: string, hora: string): string {
    if (!fecha) return '';
    const horaSeg = hora && /^\d{2}:\d{2}$/.test(hora) ? `${hora}:00` : (hora || '00:00:00');
    return `${fecha}T${horaSeg}`;
  }

  /** Lee el GUID del cliente logueado desde localStorage. */
  static obtenerGuidCliente(): string | null {
    try {
      return localStorage.getItem('guidCliente');
    } catch {
      return null;
    }
  }
}
