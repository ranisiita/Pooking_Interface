import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { VehicleItem, Localizacion, Categoria, CriteriosBusquedaAutos, Extra } from '../shared/car.models';

import { environment } from '../../../../environments/environment';
const API_GATEWAY_URL = environment.apiGatewayUrl;

const PROVIDERS = ['martin', 'dylan', 'ana', 'kath'];

export interface ApiResponse<T> {
  status: number;
  mensaje: string;
  data: T;
}

export interface VehiculosData {
  vehiculos: VehicleItem[];
  paginacion: any;
}

export interface LocalizacionesData {
  localizaciones: Localizacion[];
  paginacion: any;
}

export interface CategoriasData {
  categorias: Categoria[];
}

export interface ExtrasData {
  extras: Extra[];
}

export interface ReservaAutoPayload {
  idVehiculo: number;
  idLocalizacionRecogida: number;
  idLocalizacionDevolucion: number;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  cliente: {
    nombres: string;
    apellidos: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    correo: string;
    telefono: string;
  };
  conductores: {
    nombres: string;
    apellidos: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    fechaVencimientoLicencia?: string;
    edadConductor?: number | null;
    correo: string;
    telefono: string;
    esPrincipal?: boolean;
  }[];
  extras: { idExtra: number; cantidad: number }[];
}

export interface ReservaAutoResponse {
  idReserva: number;
  codigoReserva: string;
  estado: string;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarService {
  private http = inject(HttpClient);

  // Combina los resultados de todos los proveedores para buscar vehículos
  buscarVehiculos(criterios: CriteriosBusquedaAutos, page = 1, limit = 20): Observable<VehicleItem[]> {
    let params = new HttpParams()
      .set('page', criterios.page ?? page)
      .set('limit', criterios.limit ?? limit);

    if (criterios.idLocalizacionRecogida) params = params.set('idLocalizacion', criterios.idLocalizacionRecogida);
    if (criterios.fechaRecogida) params = params.set('fechaRecogida', criterios.fechaRecogida);
    if (criterios.fechaDevolucion) params = params.set('fechaDevolucion', criterios.fechaDevolucion);
    if (criterios.nombreCategoria) params = params.set('nombreCategoria', criterios.nombreCategoria);
    if (criterios.transmision) params = params.set('transmision', criterios.transmision);
    if (criterios.nombreMarca) params = params.set('nombreMarca', criterios.nombreMarca);
    if (criterios.sort) params = params.set('sort', criterios.sort);

    const providersToQuery = (criterios.proveedor && criterios.proveedor !== 'todos')
      ? [criterios.proveedor]
      : PROVIDERS;

    const requests = providersToQuery.map(provider =>
      this.http.get<ApiResponse<VehiculosData>>(`${API_GATEWAY_URL}/${provider}/api/v2/booking/vehiculos`, { params }).pipe(
        map(res => {
          const vehiculos = res.data?.vehiculos || [];
          return vehiculos.map(v => ({ ...v, provider }));
        }),
        catchError(err => {
          console.warn(`Error obteniendo vehículos del proveedor ${provider}:`, err);
          return of([]);
        })
      )
    );

    return forkJoin(requests).pipe(
      map(results => results.flat())
    );
  }

  // Obtener detalle de un vehículo específico
  getVehiculoById(idVehiculo: number, provider: string): Observable<VehicleItem | null> {
    if (!provider) {
      console.error('El proveedor es necesario para obtener el detalle');
      return of(null);
    }
    return this.http.get<ApiResponse<{ vehiculo: VehicleItem }>>(`${API_GATEWAY_URL}/${provider}/api/v2/booking/vehiculos/${idVehiculo}`).pipe(
      map(res => {
        if (res.data?.vehiculo) {
          return { ...res.data.vehiculo, provider };
        }
        return null;
      }),
      catchError(err => {
        console.error(`Error obteniendo detalle de vehículo ${idVehiculo} de ${provider}`, err);
        return of(null);
      })
    );
  }

  // Verificar disponibilidad
  verificarDisponibilidad(idVehiculo: number, provider: string, fechaRecogida: string, fechaDevolucion: string, idLocalizacion: number): Observable<boolean> {
    const params = new HttpParams()
      .set('fechaRecogida', fechaRecogida)
      .set('fechaDevolucion', fechaDevolucion)
      .set('idLocalizacion', idLocalizacion);

    return this.http.get<ApiResponse<any>>(`${API_GATEWAY_URL}/${provider}/api/v2/booking/reservas/${idVehiculo}/disponibilidad`, { params }).pipe(
      map(res => res.data?.disponibilidad?.disponible ?? false),
      catchError(err => {
        console.error(`Error verificando disponibilidad de ${idVehiculo} en ${provider}`, err);
        return of(false);
      })
    );
  }

  // Listar localizaciones (filtradas por un proveedor o todos)
  getLocalizaciones(proveedor?: string): Observable<Localizacion[]> {
    const providersToQuery = proveedor && proveedor !== 'todos' ? [proveedor] : PROVIDERS;

    const requests = providersToQuery.map(provider =>
      this.http.get<ApiResponse<LocalizacionesData>>(`${API_GATEWAY_URL}/${provider}/api/v2/booking/localizaciones`).pipe(
        map(res => res.data?.localizaciones || []),
        catchError(err => {
          console.warn(`Error obteniendo localizaciones del proveedor ${provider}:`, err);
          return of([]);
        })
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        const localizacionesUnicas = new Map<string, Localizacion>();
        results.flat().forEach(loc => {
          if (!localizacionesUnicas.has(loc.nombre)) {
            localizacionesUnicas.set(loc.nombre, loc);
          }
        });
        return Array.from(localizacionesUnicas.values());
      })
    );
  }

  // Obtener categorías (filtradas por un proveedor o todos)
  getCategorias(proveedor?: string): Observable<Categoria[]> {
    const providersToQuery = proveedor && proveedor !== 'todos' ? [proveedor] : PROVIDERS;

    const requests = providersToQuery.map(provider =>
      this.http.get<ApiResponse<CategoriasData>>(`${API_GATEWAY_URL}/${provider}/api/v2/booking/categorias`).pipe(
        map(res => res.data?.categorias || []),
        catchError(err => {
          console.warn(`Error obteniendo categorías del proveedor ${provider}:`, err);
          return of([]);
        })
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        const categoriasUnicas = new Map<string, Categoria>();
        results.flat().forEach(cat => {
          if (!categoriasUnicas.has(cat.nombre)) {
            categoriasUnicas.set(cat.nombre, cat);
          }
        });
        return Array.from(categoriasUnicas.values());
      })
    );
  }

  // Obtener extras de un proveedor
  getExtras(provider: string): Observable<Extra[]> {
    if (!provider) return of([]);
    return this.http.get<ApiResponse<any>>(`${API_GATEWAY_URL}/${provider}/api/v2/booking/extras`).pipe(
      map(res => {
        if (Array.isArray(res.data)) return res.data;
        if (res.data && Array.isArray(res.data.extras)) return res.data.extras;
        return [];
      }),
      catchError(err => {
        console.error(`Error obteniendo extras del proveedor ${provider}:`, err);
        return of([]);
      })
    );
  }

  // Crear reserva de auto → POST /{provider}/api/v2/booking/reservas
  crearReserva(provider: string, payload: ReservaAutoPayload): Observable<ReservaAutoResponse | null> {
    return this.http.post<ApiResponse<ReservaAutoResponse>>(
      `${API_GATEWAY_URL}/${provider}/api/v2/booking/reservas`, payload
    ).pipe(
      map(res => res.data ?? null),
      catchError(err => {
        console.error('Error creando reserva de auto:', err);
        return of(null);
      })
    );
  }
}
