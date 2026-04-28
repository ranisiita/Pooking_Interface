import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import {
  Aeropuerto, Vuelo, Escala, Asiento,
  Cliente, CrearClientePayload,
  Pasajero, CrearPasajeroPayload,
  Reserva, CrearReservaPayload,
  Factura, CrearFacturaPayload,
  Boleto, CrearBoletoPayload,
  Equipaje, CrearEquipajePayload,
  EstadoReserva, ClaseCabina,
} from '../models/domain.models';

// ─── Aeropuertos ─────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AeropuertosService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/aeropuertos';

  list(params?: { estado?: string; page?: number; page_size?: number }): Observable<ApiResponse<Aeropuerto[]>> {
    let p = new HttpParams();
    if (params?.estado)    p = p.set('estado', params.estado);
    if (params?.page)      p = p.set('page', params.page.toString());
    if (params?.page_size) p = p.set('page_size', params.page_size.toString());
    return this.http.get<ApiResponse<Aeropuerto[]>>(this.base, { params: p });
  }

  getById(id: number): Observable<ApiResponse<Aeropuerto>> {
    return this.http.get<ApiResponse<Aeropuerto>>(`${this.base}/${id}`);
  }
}

// ─── Vuelos ───────────────────────────────────────────

export interface BuscarVuelosQuery {
  id_aeropuerto_origen: number;
  id_aeropuerto_destino: number;
  fecha_salida: string;
  estado_vuelo?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class VuelosService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/vuelos';

  search(query: BuscarVuelosQuery): Observable<ApiResponse<Vuelo[]>> {
    let p = new HttpParams()
      .set('id_aeropuerto_origen', query.id_aeropuerto_origen.toString())
      .set('id_aeropuerto_destino', query.id_aeropuerto_destino.toString())
      .set('fecha_salida', query.fecha_salida)
      .set('estado_vuelo', query.estado_vuelo ?? 'PROGRAMADO');
    if (query.page)      p = p.set('page', query.page.toString());
    if (query.page_size) p = p.set('page_size', query.page_size.toString());
    return this.http.get<ApiResponse<Vuelo[]>>(this.base, { params: p });
  }

  getById(id: number): Observable<ApiResponse<Vuelo>> {
    return this.http.get<ApiResponse<Vuelo>>(`${this.base}/${id}`);
  }

  getEscalas(idVuelo: number): Observable<ApiResponse<Escala[]>> {
    return this.http.get<ApiResponse<Escala[]>>(`${this.base}/${idVuelo}/escalas`);
  }

  getAsientos(idVuelo: number, params?: { disponible?: boolean; clase?: ClaseCabina }): Observable<ApiResponse<Asiento[]>> {
    let p = new HttpParams();
    if (params?.disponible !== undefined) p = p.set('disponible', params.disponible.toString());
    if (params?.clase)                    p = p.set('clase', params.clase);
    return this.http.get<ApiResponse<Asiento[]>>(`${this.base}/${idVuelo}/asientos`, { params: p });
  }

  getAsiento(idVuelo: number, idAsiento: number): Observable<ApiResponse<Asiento>> {
    return this.http.get<ApiResponse<Asiento>>(`${this.base}/${idVuelo}/asientos/${idAsiento}`);
  }
}

// ─── Clientes ─────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/clientes';

  search(q: { numero_identificacion?: string; correo?: string }): Observable<ApiResponse<Cliente[]>> {
    let p = new HttpParams();
    if (q.numero_identificacion) p = p.set('numero_identificacion', q.numero_identificacion);
    if (q.correo)                p = p.set('correo', q.correo);
    return this.http.get<ApiResponse<Cliente[]>>(this.base, { params: p });
  }

  create(payload: CrearClientePayload): Observable<ApiResponse<Cliente>> {
    return this.http.post<ApiResponse<Cliente>>(this.base, payload);
  }

  getById(id: number): Observable<ApiResponse<Cliente>> {
    return this.http.get<ApiResponse<Cliente>>(`${this.base}/${id}`);
  }
}

// ─── Pasajeros ────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PasajerosService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/pasajeros';

  create(payload: CrearPasajeroPayload): Observable<ApiResponse<Pasajero>> {
    return this.http.post<ApiResponse<Pasajero>>(this.base, payload);
  }

  getById(id: number): Observable<ApiResponse<Pasajero>> {
    return this.http.get<ApiResponse<Pasajero>>(`${this.base}/${id}`);
  }
}

// ─── Reservas ─────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/reservas';

  create(payload: CrearReservaPayload): Observable<ApiResponse<Reserva>> {
    const body = { origen_canal_reserva: 'BOOKING', ...payload };
    return this.http.post<ApiResponse<Reserva>>(this.base, body);
  }

  updateEstado(id: number, payload: { estado_reserva: EstadoReserva; motivo_cancelacion?: string }): Observable<ApiResponse<Reserva>> {
    return this.http.patch<ApiResponse<Reserva>>(`${this.base}/${id}/estado`, payload);
  }

  getById(id: number): Observable<ApiResponse<Reserva>> {
    return this.http.get<ApiResponse<Reserva>>(`${this.base}/${id}`);
  }
}

// ─── Facturas ─────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FacturasService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/facturas';

  create(payload: CrearFacturaPayload): Observable<ApiResponse<Factura>> {
    return this.http.post<ApiResponse<Factura>>(this.base, payload);
  }

  getById(id: number): Observable<ApiResponse<Factura>> {
    return this.http.get<ApiResponse<Factura>>(`${this.base}/${id}`);
  }
}

// ─── Boletos ──────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class BoletosService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/boletos';

  create(payload: CrearBoletoPayload): Observable<ApiResponse<Boleto>> {
    return this.http.post<ApiResponse<Boleto>>(this.base, payload);
  }

  getById(id: number): Observable<ApiResponse<Boleto>> {
    return this.http.get<ApiResponse<Boleto>>(`${this.base}/${id}`);
  }
}

// ─── Equipaje ─────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class EquipajeService {
  private http = inject(HttpClient);
  private base = '/vuelos/v1/boletos';

  list(idBoleto: number): Observable<ApiResponse<Equipaje[]>> {
    return this.http.get<ApiResponse<Equipaje[]>>(`${this.base}/${idBoleto}/equipaje`);
  }

  create(idBoleto: number, payload: CrearEquipajePayload): Observable<ApiResponse<Equipaje>> {
    return this.http.post<ApiResponse<Equipaje>>(`${this.base}/${idBoleto}/equipaje`, {
      ...payload,
      id_boleto: idBoleto,
    });
  }
}
