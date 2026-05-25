export type FlightProvider = 'nacho' | 'mary' | 'marcillo';

export interface AeropuertoSugerencia {
  nombre: string;
  codigoIata: string;
  ciudad?: string;
  pais?: string;
  display: string;
}

export interface FlightSearchParams {
  CodigoIataOrigen?: string;
  CodigoIataDestino?: string;
  IdAeropuertoOrigen?: string;
  IdAeropuertoDestino?: string;
  FechaSalida?: string;
  CantidadPasajeros?: number;
  Clase?: string;
  Page?: number;
  PageSize?: number;
}

export interface AeropuertoApi {
  nombre: string;
  codigoIata: string;
}

export interface VueloApiResponse {
  id: string;
  numeroVuelo: string;
  fechaHoraSalida: string;
  fechaHoraLlegada: string;
  duracionMin: number;
  precioBase: number;
  capacidadTotal: number;
  estadoVuelo: string;
  aeropuertoOrigen: AeropuertoApi;
  aeropuertoDestino: AeropuertoApi;
}

export interface FlightItem {
  guidServicio: string;
  nombreComercial: string;
  tipoServicioNombre: string;
  salida: string;
  llegada: string;
  duracion: string;
  escalas: number;
  precioBase: number;
  origen: string;
  destino: string;
  fecha: string;
  proveedor: string;
  idVuelo?: number;
  nombreOrigen?: string;
  nombreDestino?: string;
  estadoVuelo?: string;
  asientosDisponibles?: number;
  capacidadTotal?: number;
  fechaHoraSalida?: string;
  fechaHoraLlegada?: string;
}

export interface RawVueloApi {
  idVuelo: number;
  numeroVuelo: string;
  nombreAeropuertoOrigen: string;
  codigoIataOrigen: string;
  nombreAeropuertoDestino: string;
  codigoIataDestino: string;
  fechaHoraSalida: string;
  fechaHoraLlegada: string;
  duracionMin: number;
  precioBase: number;
  capacidadTotal: number;
  asientosDisponibles: number;
  estadoVuelo: string;
  escalas: unknown[];
}

export interface FlightApiResult {
  proveedor: FlightProvider;
  vuelos: RawVueloApi[];
}
