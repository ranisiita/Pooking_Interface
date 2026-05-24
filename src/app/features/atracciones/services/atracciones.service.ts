import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AtraccionDetalleResponse,
  AtraccionesListResponse,
  AtraccionesQuery,
  FiltrosResponse,
  HorariosResponse,
  HorarioTicketsResponse,
  PagoConfirmacionBody,
  PagoConfirmacionResponse,
  ReservaPayload,
  ReservaResponse,
  ReservasListResponse,
  Ticket,
} from '../models/atracciones.models';

/**
 * Catálogo de proveedores/integrantes del microservicio de Atracciones.
 * Cada valor corresponde al prefijo del bus/API Gateway:
 *   `/{provider}/api/v2/...`
 *
 * Para añadir más integrantes (francisco, angel) basta con sumarlos aquí
 * y luego asignarlos a `ACTIVE_ATTRACTION_PROVIDER`.
 */
export const ATTRACTION_PROVIDERS = {
  JHONATAN: 'jhonatan',
  LUIS: 'luis',
} as const;

export type AttractionProvider =
  (typeof ATTRACTION_PROVIDERS)[keyof typeof ATTRACTION_PROVIDERS];

/**
 * Proveedor activo para esta sesión/build. Cambiar este valor para
 * apuntar a otro integrante sin modificar URLs en ningún otro lugar:
 *   - ATTRACTION_PROVIDERS.JHONATAN
 *   - ATTRACTION_PROVIDERS.LUIS
 */
export const ACTIVE_ATTRACTION_PROVIDER: AttractionProvider = ATTRACTION_PROVIDERS.JHONATAN;

/**
 * Construye el base path `/{provider}/api/v2` de forma centralizada.
 * Útil si en el futuro se quiere generar el path dinámicamente (ej. desde
 * una preferencia de usuario o feature flag).
 */
export function buildAttractionBasePath(
  provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
): string {
  return `/${provider}/api/v2`;
}

/**
 * Servicio del microservicio de Atracciones (canal Booking público).
 *
 * Sigue el mismo patrón de `CarService`:
 *   - URL base = `environment.apiGatewayUrl`
 *   - Prefijo del integrante/microservicio: `/{provider}/api/v2`
 *   - Métodos devuelven `Observable<ApiResponse<T>>` con el shape exacto del contrato.
 *
 * El proveedor activo se controla desde `ACTIVE_ATTRACTION_PROVIDER`.
 */
@Injectable({ providedIn: 'root' })
export class AtraccionesService {
  private http = inject(HttpClient);

  /** Proveedor activo + base path, derivados de la config central. */
  readonly provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER;
  private readonly basePath = buildAttractionBasePath(this.provider);
  private readonly atraccionesUrl = `${environment.apiGatewayUrl}${this.basePath}/atracciones`;
  private readonly reservasUrl = `${environment.apiGatewayUrl}${this.basePath}/reservas`;

  // ── 1. GET /atracciones ─────────────────────────────────────────
  getAtracciones(query: AtraccionesQuery = {}): Observable<AtraccionesListResponse> {
    return this.http.get<AtraccionesListResponse>(this.atraccionesUrl, {
      params: this.armarParams(query),
    });
  }

  // ── 2. GET /atracciones/filtros ─────────────────────────────────
  getFiltros(): Observable<FiltrosResponse> {
    return this.http.get<FiltrosResponse>(`${this.atraccionesUrl}/filtros`);
  }

  // ── 3. GET /atracciones/{guid} ──────────────────────────────────
  getAtraccionDetalle(guid: string): Observable<AtraccionDetalleResponse> {
    return this.http.get<AtraccionDetalleResponse>(`${this.atraccionesUrl}/${guid}`);
  }

  // ── 4. GET /atracciones/{guid}/tickets ──────────────────────────
  getTicketsAtraccion(guid: string): Observable<{ status: number; message: string; data: Ticket[] }> {
    return this.http.get<{ status: number; message: string; data: Ticket[] }>(
      `${this.atraccionesUrl}/${guid}/tickets`,
    );
  }

  // ── 5. GET /atracciones/{guid}/horarios ─────────────────────────
  getHorarios(guid: string, fecha?: string): Observable<HorariosResponse> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get<HorariosResponse>(`${this.atraccionesUrl}/${guid}/horarios`, { params });
  }

  // ── 6. GET /atracciones/{guid}/horarios/{horarioGuid}/tickets ──
  getHorarioTickets(guid: string, horarioGuid: string): Observable<HorarioTicketsResponse> {
    return this.http.get<HorarioTicketsResponse>(
      `${this.atraccionesUrl}/${guid}/horarios/${horarioGuid}/tickets`,
    );
  }

  // ── 7. POST /reservas ───────────────────────────────────────────
  crearReserva(payload: ReservaPayload): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(this.reservasUrl, payload);
  }

  // ── 8. GET /reservas ────────────────────────────────────────────
  getReservas(page = 1, limit = 10): Observable<ReservasListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ReservasListResponse>(this.reservasUrl, { params });
  }

  // ── 9. GET /reservas/{guid} ─────────────────────────────────────
  getReservaDetalle(guid: string): Observable<ReservaResponse> {
    return this.http.get<ReservaResponse>(`${this.reservasUrl}/${guid}`);
  }

  // ── 10. POST /reservas/{guid}/pagos/confirmacion ───────────────
  confirmarPago(
    guid: string,
    body: PagoConfirmacionBody,
  ): Observable<PagoConfirmacionResponse> {
    return this.http.post<PagoConfirmacionResponse>(
      `${this.reservasUrl}/${guid}/pagos/confirmacion`,
      body,
    );
  }

  // ── Internals ───────────────────────────────────────────────────
  /**
   * Construye HttpParams a partir de `AtraccionesQuery`. Omite valores
   * `undefined`, `null`, `''` y `false` para no enviar query params vacíos.
   * Los nombres coinciden 1:1 con los del contrato.
   */
  private armarParams(query: AtraccionesQuery): HttpParams {
    let params = new HttpParams();
    if (query.ciudad) params = params.set('ciudad', query.ciudad);
    if (query.tipo) params = params.set('tipo', query.tipo);
    if (query.subtipo) params = params.set('subtipo', query.subtipo);
    if (query.idioma) params = params.set('idioma', query.idioma);
    if (query.etiqueta) params = params.set('etiqueta', query.etiqueta);
    if (query.calificacion_min != null) {
      params = params.set('calificacion_min', String(query.calificacion_min));
    }
    if (query.hora_inicio) params = params.set('hora_inicio', query.hora_inicio);
    if (query.disponible === true) params = params.set('disponible', 'true');
    if (query.ordenar_por) params = params.set('ordenar_por', query.ordenar_por);
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.limit != null) params = params.set('limit', String(query.limit));
    return params;
  }
}
