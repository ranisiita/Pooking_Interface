import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, catchError, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AtraccionDetalleResponse,
  AtraccionesListResponse,
  AtraccionesQuery,
  AttractionProvider,
  AttractionProviderSelector,
  FilterOption,
  FiltrosData,
  FiltrosResponse,
  HorariosResponse,
  HorarioTicketsResponse,
  PagoConfirmacionBody,
  PagoConfirmacionResponse,
  ReservaPayload,
  ReservaResponse,
  ReservasListResponse,
  Sorter,
  Ticket,
} from '../models/atracciones.models';

/**
 * Catálogo de proveedores/integrantes del microservicio de Atracciones.
 * Cada valor corresponde al prefijo del bus/API Gateway:
 *   `/{provider}/api/v2/...`
 */
export const ATTRACTION_PROVIDERS: Record<string, AttractionProvider> = {
  JHONATAN: 'jhonatan',
  LUIS: 'luis',
  FRANCISCO: 'francisco',
  ANGEL: 'angel',
};

/** Lista plana para iterar en modo 'todos'. */
export const ALL_ATTRACTION_PROVIDERS: AttractionProvider[] = [
  ATTRACTION_PROVIDERS['JHONATAN'],
  ATTRACTION_PROVIDERS['LUIS'],
  ATTRACTION_PROVIDERS['FRANCISCO'],
  ATTRACTION_PROVIDERS['ANGEL'],
];

/** Etiqueta humana de un proveedor para mostrar en UI. */
export const ATTRACTION_PROVIDER_LABELS: Record<AttractionProvider, string> = {
  jhonatan: 'Jhonatan',
  luis: 'Luis',
  francisco: 'Francisco',
  angel: 'Angel',
};

/**
 * Proveedor activo por defecto. Cuando el componente no especifica selector
 * (o pasa `undefined`), se usa este valor. La UI normalmente pasa explícito
 * el selector elegido por el usuario.
 */
export const ACTIVE_ATTRACTION_PROVIDER: AttractionProvider =
  ATTRACTION_PROVIDERS['JHONATAN'];

export function buildAttractionBasePath(
  provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
): string {
  return `/${provider}/api/v2`;
}

/**
 * Servicio del microservicio de Atracciones (canal Booking público).
 *
 * Mantiene el mismo patrón que `CarService` (forkJoin + catchError para
 * fan-out con tolerancia a fallos por proveedor).
 *
 * - Métodos de listado/filtros aceptan `AttractionProviderSelector`
 *   (un proveedor concreto o `'todos'`). En modo `'todos'` se hace
 *   fan-out a todos los proveedores y se devuelven los resultados de los
 *   que respondieron + un `failedProviders[]` con los que fallaron.
 * - Métodos por GUID (detalle, horarios, tickets, reserva, pago) requieren
 *   un proveedor concreto — usa el `provider` que viaja en cada `Atraccion`.
 */
@Injectable({ providedIn: 'root' })
export class AtraccionesService {
  private http = inject(HttpClient);

  // ── URL builders por proveedor ───────────────────────────────────
  private atraccionesUrl(provider: AttractionProvider): string {
    return `${environment.apiGatewayUrl}${buildAttractionBasePath(provider)}/atracciones`;
  }

  private reservasUrl(provider: AttractionProvider): string {
    return `${environment.apiGatewayUrl}${buildAttractionBasePath(provider)}/reservas`;
  }

  // ── 1. GET /atracciones (soporta 'todos' con fan-out) ───────────
  getAtracciones(
    query: AtraccionesQuery = {},
    selector: AttractionProviderSelector = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<AtraccionesListResponse> {
    if (selector === 'todos') return this.fanoutAtracciones(query);
    return this.http
      .get<AtraccionesListResponse>(this.atraccionesUrl(selector), {
        params: this.armarParams(query),
      })
      .pipe(map((resp) => this.anotarProviderEnListado(resp, selector)));
  }

  // ── 2. GET /atracciones/filtros (soporta 'todos' con fan-out) ──
  getFiltros(
    selector: AttractionProviderSelector = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<FiltrosResponse> {
    if (selector === 'todos') return this.fanoutFiltros();
    return this.http
      .get<FiltrosResponse>(`${this.atraccionesUrl(selector)}/filtros`)
      .pipe(map((resp) => ({ ...resp, failedProviders: [] as AttractionProvider[] })));
  }

  // ── 3. GET /atracciones/{guid} ──────────────────────────────────
  getAtraccionDetalle(
    guid: string,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<AtraccionDetalleResponse> {
    return this.http
      .get<AtraccionDetalleResponse>(`${this.atraccionesUrl(provider)}/${guid}`)
      .pipe(map((resp) => ({ ...resp, data: { ...resp.data, provider } })));
  }

  // ── 4. GET /atracciones/{guid}/tickets ──────────────────────────
  getTicketsAtraccion(
    guid: string,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<{ status: number; message: string; data: Ticket[] }> {
    return this.http.get<{ status: number; message: string; data: Ticket[] }>(
      `${this.atraccionesUrl(provider)}/${guid}/tickets`,
    );
  }

  // ── 5. GET /atracciones/{guid}/horarios ─────────────────────────
  getHorarios(
    guid: string,
    fecha?: string,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<HorariosResponse> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get<HorariosResponse>(
      `${this.atraccionesUrl(provider)}/${guid}/horarios`,
      { params },
    );
  }

  // ── 6. GET /atracciones/{guid}/horarios/{horarioGuid}/tickets ──
  getHorarioTickets(
    guid: string,
    horarioGuid: string,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<HorarioTicketsResponse> {
    return this.http.get<HorarioTicketsResponse>(
      `${this.atraccionesUrl(provider)}/${guid}/horarios/${horarioGuid}/tickets`,
    );
  }

  // ── 7. POST /reservas ───────────────────────────────────────────
  crearReserva(
    payload: ReservaPayload,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(this.reservasUrl(provider), payload);
  }

  // ── 8. GET /reservas ────────────────────────────────────────────
  getReservas(
    page = 1,
    limit = 10,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<ReservasListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ReservasListResponse>(this.reservasUrl(provider), { params });
  }

  // ── 9. GET /reservas/{guid} ─────────────────────────────────────
  getReservaDetalle(
    guid: string,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<ReservaResponse> {
    return this.http.get<ReservaResponse>(`${this.reservasUrl(provider)}/${guid}`);
  }

  // ── 10. POST /reservas/{guid}/pagos/confirmacion ───────────────
  confirmarPago(
    guid: string,
    body: PagoConfirmacionBody,
    provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
  ): Observable<PagoConfirmacionResponse> {
    return this.http.post<PagoConfirmacionResponse>(
      `${this.reservasUrl(provider)}/${guid}/pagos/confirmacion`,
      body,
    );
  }

  // ── Fan-out en modo 'todos' ─────────────────────────────────────
  /**
   * Consulta `/atracciones` en TODOS los proveedores en paralelo.
   * Si alguno falla (timeout, 5xx, red, CORS), no rompe la respuesta:
   * los demás se muestran y el proveedor caído se reporta en `failedProviders`.
   *
   * Equivale a `Promise.allSettled` — usa `forkJoin` + `catchError` por proveedor.
   */
  private fanoutAtracciones(
    query: AtraccionesQuery,
  ): Observable<AtraccionesListResponse> {
    const params = this.armarParams(query);
    const requests = ALL_ATTRACTION_PROVIDERS.map((p) =>
      this.http
        .get<AtraccionesListResponse>(this.atraccionesUrl(p), { params })
        .pipe(
          map((resp) => ({ p, resp, failed: false as const })),
          catchError((err) => {
            console.warn(`[Atracciones] Proveedor "${p}" no respondió:`, err?.status ?? err);
            return of({ p, resp: null as AtraccionesListResponse | null, failed: true as const });
          }),
        ),
    );
    return forkJoin(requests).pipe(map((results) => this.mergeResultadosListado(results)));
  }

  /**
   * Consulta `/filtros` en TODOS los proveedores en paralelo y mezcla las
   * opciones por `tagname` sumando `productCount`. Tolera fallos individuales.
   */
  private fanoutFiltros(): Observable<FiltrosResponse> {
    const requests = ALL_ATTRACTION_PROVIDERS.map((p) =>
      this.http
        .get<FiltrosResponse>(`${this.atraccionesUrl(p)}/filtros`)
        .pipe(
          map((resp) => ({ p, resp, failed: false as const })),
          catchError((err) => {
            console.warn(`[Atracciones] /filtros de "${p}" no respondió:`, err?.status ?? err);
            return of({ p, resp: null as FiltrosResponse | null, failed: true as const });
          }),
        ),
    );
    return forkJoin(requests).pipe(map((results) => this.mergeFiltros(results)));
  }

  // ── Helpers privados ────────────────────────────────────────────
  private anotarProviderEnListado(
    resp: AtraccionesListResponse,
    provider: AttractionProvider,
  ): AtraccionesListResponse {
    return {
      ...resp,
      data: (resp.data ?? []).map((a) => ({ ...a, provider })),
      failedProviders: [],
    };
  }

  private mergeResultadosListado(
    results: Array<{ p: AttractionProvider; resp: AtraccionesListResponse | null; failed: boolean }>,
  ): AtraccionesListResponse {
    const data = [];
    const failedProviders: AttractionProvider[] = [];
    let totalFiltered = 0;
    let totalUnfiltered = 0;
    let sorters: Sorter[] = [];
    let defaultSorter: Sorter | null = null;

    for (const r of results) {
      if (r.failed || !r.resp) {
        failedProviders.push(r.p);
        continue;
      }
      for (const a of r.resp.data ?? []) data.push({ ...a, provider: r.p });
      totalFiltered += r.resp.filterStats?.filteredProductCount ?? r.resp.data?.length ?? 0;
      totalUnfiltered += r.resp.filterStats?.unfilteredProductCount ?? 0;
      if (!sorters.length) sorters = r.resp.sorters ?? [];
      if (!defaultSorter) defaultSorter = r.resp.defaultSorter ?? null;
    }

    return {
      status: 200,
      message: 'Operacion exitosa',
      data,
      // En 'todos', concatenamos resultados; la paginación servidor queda en
      // una sola página agregada para mantener una UX coherente.
      pagination: {
        page: 1,
        limit: Math.max(data.length, 1),
        total: data.length,
        total_pages: 1,
      },
      filterStats: {
        filteredProductCount: totalFiltered,
        unfilteredProductCount: totalUnfiltered,
      },
      sorters,
      defaultSorter: defaultSorter ?? { name: 'Mas populares', value: 'trending' },
      _links: { self: '' },
      failedProviders,
    };
  }

  private mergeFiltros(
    results: Array<{ p: AttractionProvider; resp: FiltrosResponse | null; failed: boolean }>,
  ): FiltrosResponse {
    const failedProviders: AttractionProvider[] = [];
    const dest: FilterOption[][] = [];
    const type: FilterOption[][] = [];
    const label: FilterOption[][] = [];
    const rating: FilterOption[][] = [];
    const time: FilterOption[][] = [];
    const lang: FilterOption[][] = [];

    for (const r of results) {
      if (r.failed || !r.resp) {
        failedProviders.push(r.p);
        continue;
      }
      dest.push(r.resp.data?.destinationFilters ?? []);
      type.push(r.resp.data?.typeFilters ?? []);
      label.push(r.resp.data?.labelFilters ?? []);
      rating.push(r.resp.data?.minRatingFilter ?? []);
      time.push(r.resp.data?.timeOfDayFilters ?? []);
      lang.push(r.resp.data?.supportedLanguageFilters ?? []);
    }

    const merged: FiltrosData = {
      destinationFilters: this.mergeFilterOptions(dest),
      typeFilters: this.mergeFilterOptions(type),
      labelFilters: this.mergeFilterOptions(label),
      minRatingFilter: this.mergeFilterOptions(rating),
      timeOfDayFilters: this.mergeFilterOptions(time),
      supportedLanguageFilters: this.mergeFilterOptions(lang),
    };

    return {
      status: 200,
      message: 'Operacion exitosa',
      data: merged,
      failedProviders,
    };
  }

  /** Mezcla listas de FilterOption por tagname sumando productCount. */
  private mergeFilterOptions(lists: FilterOption[][]): FilterOption[] {
    const map = new Map<string, FilterOption>();
    for (const list of lists) {
      for (const opt of list) {
        const existing = map.get(opt.tagname);
        if (!existing) {
          map.set(opt.tagname, { ...opt, productCount: opt.productCount ?? 0 });
        } else {
          existing.productCount = (existing.productCount ?? 0) + (opt.productCount ?? 0);
        }
      }
    }
    return Array.from(map.values());
  }

  /**
   * Construye HttpParams a partir de `AtraccionesQuery`. Omite valores
   * `undefined`, `null`, `''` y `false` para no enviar query params vacíos.
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
