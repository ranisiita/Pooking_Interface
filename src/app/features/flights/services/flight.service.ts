import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  AeropuertoSugerencia,
  FlightApiResult,
  FlightItem,
  FlightProvider,
  FlightSearchParams,
  RawVueloApi,
} from '../shared/flight.models';

const PROVEEDORES: { key: FlightProvider; label: string }[] = [
  { key: 'nacho', label: 'Nacho' },
  { key: 'mary', label: 'Mary' },
  { key: 'marcillo', label: 'Marcillo' },
];

@Injectable({ providedIn: 'root' })
export class FlightService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiGatewayUrl;

  iniciarReservaVuelo(proveedor: string, idVuelo: number, urlRetorno: string): Observable<unknown> {
    const proveedorLower = proveedor.toLowerCase();
    const url = `${this.baseUrl}/${proveedorLower}/api/v1/booking/vuelos/sesion-redirect`;
    const token = localStorage.getItem('token') ?? '';
    if (!token) {
      return throwError(() => ({ status: 401, message: 'No hay token de autenticación.' }));
    }
    return this.http.post(url, { idVuelo, urlRetorno }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // ─── Aeropuertos ────────────────────────────────────────────────────────────

  cargarTodosAeropuertos(): Observable<AeropuertoSugerencia[]> {
    const requests = PROVEEDORES.map(p =>
      this.http
        .get<unknown>(
          `${this.baseUrl}/${p.key}/api/v1/booking/aeropuertos`,
          { params: new HttpParams().set('Limit', '100') },
        )
        .pipe(
          map(res => this.extractAeropuertoList(res)),
          catchError(() => of<unknown[]>([])),
        ),
    );

    return forkJoin(requests).pipe(
      map(results => this.deduplicarAeropuertos(results)),
    );
  }

  buscarAeropuertos(texto: string): Observable<AeropuertoSugerencia[]> {
    if (texto.length < 2) return of([]);

    const requests = PROVEEDORES.map(p =>
      this.http
        .get<unknown>(
          `${this.baseUrl}/${p.key}/api/v1/booking/aeropuertos`,
          { params: new HttpParams().set('Nombre', texto).set('Limit', '10') },
        )
        .pipe(
          map(res => this.extractAeropuertoList(res)),
          catchError(() => of<unknown[]>([])),
        ),
    );

    return forkJoin(requests).pipe(
      map(results => this.deduplicarAeropuertos(results).slice(0, 8)),
    );
  }

  private deduplicarAeropuertos(results: unknown[][]): AeropuertoSugerencia[] {
    const seen = new Set<string>();
    const sugerencias: AeropuertoSugerencia[] = [];
    for (const list of results) {
      for (const raw of list as Record<string, unknown>[]) {
        const iata = (
          (raw['codigoIata'] ?? raw['CodigoIata'] ?? raw['codigo_iata'] ??
           raw['iata'] ?? raw['IATA'] ?? '') as string
        ).toUpperCase().trim();

        const nombre = (
          raw['nombre'] ?? raw['Nombre'] ?? raw['name'] ?? raw['Name'] ??
          raw['nombreAeropuerto'] ?? raw['NombreAeropuerto'] ??
          raw['aeropuerto'] ?? raw['Aeropuerto'] ?? ''
        ) as string;

        if (!iata || !nombre || seen.has(iata)) continue;
        seen.add(iata);
        sugerencias.push({ nombre, codigoIata: iata, display: `${nombre} (${iata})` });
      }
    }
    return sugerencias;
  }

  private extractAeropuertoList(res: unknown): unknown[] {
    if (Array.isArray(res)) return res;
    const r = res as Record<string, unknown>;
    if (Array.isArray(r?.['items'])) return r['items'] as unknown[];
    if (Array.isArray((r?.['data'] as Record<string, unknown>)?.['items'])) {
      return (r['data'] as Record<string, unknown>)['items'] as unknown[];
    }
    if (Array.isArray(r?.['data'])) return r['data'] as unknown[];
    return [];
  }

  // ─── Vuelos ─────────────────────────────────────────────────────────────────

  buscarVuelos(params: FlightSearchParams): Observable<FlightItem[]> {
    const httpParams = this.buildParams(params);

    const requests = PROVEEDORES.map(p =>
      this.http
        .get<unknown>(
          `${this.baseUrl}/${p.key}/api/v1/booking/vuelos/buscar`,
          { params: httpParams },
        )
        .pipe(
          map(res => ({
            proveedor: p.key,
            vuelos: this.extractVueloList(res),
          }) as FlightApiResult),
          catchError(() => of<FlightApiResult>({ proveedor: p.key, vuelos: [] })),
        ),
    );

    return forkJoin(requests).pipe(
      map(results => {
        const items: FlightItem[] = [];
        for (const r of results) {
          const label = PROVEEDORES.find(p => p.key === r.proveedor)?.label ?? r.proveedor;
          for (const v of r.vuelos) {
            items.push(this.mapRawToFlightItem(v, r.proveedor, label));
          }
        }
        return items.sort((a, b) => a.precioBase - b.precioBase);
      }),
    );
  }

  private extractVueloList(response: unknown): RawVueloApi[] {
    if (!response) return [];
    if (Array.isArray(response)) return response as RawVueloApi[];
    const r = response as Record<string, unknown>;
    // { success, data: [...] }
    if (r['success'] && Array.isArray(r['data'])) return r['data'] as RawVueloApi[];
    // { success, data: { items: [...] } } o { success, data: { ...single } }
    if (r['success'] && r['data'] && !Array.isArray(r['data'])) {
      const data = r['data'] as Record<string, unknown>;
      if (Array.isArray(data['items'])) return data['items'] as RawVueloApi[];
      return [r['data'] as RawVueloApi];
    }
    // sin wrapper de success
    if (Array.isArray(r['data'])) return r['data'] as RawVueloApi[];
    if (Array.isArray(r['items'])) return r['items'] as RawVueloApi[];
    return [];
  }

  private mapRawToFlightItem(raw: RawVueloApi, proveedorKey: string, proveedorLabel: string): FlightItem {
    const salida = raw.fechaHoraSalida
      ? (raw.fechaHoraSalida.split('T')[1] ?? '').substring(0, 5)
      : '';
    const llegada = raw.fechaHoraLlegada
      ? (raw.fechaHoraLlegada.split('T')[1] ?? '').substring(0, 5)
      : '';

    return {
      guidServicio: `${proveedorKey}-${raw.idVuelo}`,
      nombreComercial: raw.numeroVuelo ?? '',
      tipoServicioNombre: 'Vuelos',
      salida,
      llegada,
      duracion: this.formatDuration(raw.duracionMin ?? 0),
      escalas: Array.isArray(raw.escalas) ? raw.escalas.length : 0,
      precioBase: raw.precioBase ?? 0,
      origen: raw.codigoIataOrigen ?? '',
      destino: raw.codigoIataDestino ?? '',
      fecha: raw.fechaHoraSalida ?? '',
      proveedor: proveedorLabel,
      idVuelo: raw.idVuelo,
      nombreOrigen: raw.nombreAeropuertoOrigen ?? '',
      nombreDestino: raw.nombreAeropuertoDestino ?? '',
      estadoVuelo: raw.estadoVuelo,
      asientosDisponibles: raw.asientosDisponibles,
      capacidadTotal: raw.capacidadTotal,
      fechaHoraSalida: raw.fechaHoraSalida,
      fechaHoraLlegada: raw.fechaHoraLlegada,
    };
  }

  private buildParams(params: FlightSearchParams): HttpParams {
    let hp = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (s === '') return;
      hp = hp.set(k, s);
    });
    return hp;
  }

  private formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}
