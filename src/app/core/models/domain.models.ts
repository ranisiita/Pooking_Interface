/* =====================================================
   POOKING — MODELOS DE DOMINIO
   Espejo del Contrato API – Vuelos v1.0
   ===================================================== */

// ─── Enums ────────────────────────────────────────────

export type EstadoVuelo = 'PROGRAMADO' | 'EN_VUELO' | 'ATERRIZADO' | 'CANCELADO' | 'DEMORADO';
export type EstadoReserva = 'PEN' | 'CON' | 'CAN' | 'EXP' | 'FIN' | 'EMI';
export type ClaseCabina = 'ECONOMICA' | 'EJECUTIVA' | 'PRIMERA';
export type PosicionAsiento = 'VENTANA' | 'PASILLO' | 'CENTRO';
export type TipoIdentificacion = 'CEDULA' | 'PASAPORTE' | 'RUC' | 'TARJETA_IDENTIDAD' | 'OTRO';
export type TipoDocumentoPasajero = 'CEDULA' | 'PASAPORTE' | 'RUC' | 'OTRO';
export type Genero = 'MASCULINO' | 'FEMENINO' | 'OTRO';
export type EstadoBoleto = 'ACTIVO' | 'USADO' | 'CANCELADO';
export type EstadoEquipaje =
  | 'REGISTRADO' | 'EMBARCADO' | 'EN_TRANSITO' | 'ENTREGADO'
  | 'CANCELADO' | 'PERDIDO' | 'DANADO';
export type TipoEquipaje = 'MANO' | 'BODEGA';
export type TipoEscala = 'TECNICA' | 'COMERCIAL';
export type EstadoAeropuerto = 'ACTIVO' | 'INACTIVO';
export type EstadoCliente = 'ACT' | 'INA';
export type EstadoFactura = 'ABI' | 'APR' | 'INA';

// ─── Aeropuerto ───────────────────────────────────────

export interface Aeropuerto {
  id_aeropuerto: number;
  codigo_iata: string;
  codigo_icao: string | null;
  nombre: string;
  zona_horaria: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoAeropuerto;
}

// ─── Vuelo ────────────────────────────────────────────

export interface Vuelo {
  id_vuelo: number;
  numero_vuelo: string;
  id_aeropuerto_origen: number;
  id_aeropuerto_destino: number;
  fecha_hora_salida: string;
  fecha_hora_llegada: string;
  duracion_min: number;
  precio_base: number;
  capacidad_total: number;
  estado_vuelo: EstadoVuelo;
  estado: string;
}

// ─── Escala ───────────────────────────────────────────

export interface Escala {
  id_escala: number;
  id_vuelo: number;
  id_aeropuerto: number;
  orden: number;
  fecha_hora_llegada: string;
  fecha_hora_salida: string;
  duracion_min: number;
  tipo_escala: TipoEscala;
  terminal: string | null;
  puerta: string | null;
}

// ─── Asiento ──────────────────────────────────────────

export interface Asiento {
  id_asiento: number;
  id_vuelo: number;
  numero_asiento: string;
  clase: ClaseCabina;
  disponible: boolean;
  precio_extra: number;
  posicion: PosicionAsiento | null;
}

// ─── Cliente ──────────────────────────────────────────

export interface Cliente {
  id_cliente: number;
  cliente_guid: string;
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
  nombres: string;
  apellidos: string | null;
  correo: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string | null;
  nacionalidad: string | null;
  genero: Genero | null;
  estado: EstadoCliente;
}

export interface CrearClientePayload {
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
  nombres: string;
  apellidos?: string;
  correo: string;
  telefono: string;
  direccion: string;
  id_ciudad_residencia: number;
  id_pais_nacionalidad: number;
  fecha_nacimiento?: string;
  nacionalidad?: string;
  genero?: Genero;
}

// ─── Pasajero ─────────────────────────────────────────

export interface Pasajero {
  id_pasajero: number;
  nombre_pasajero: string;
  apellido_pasajero: string;
  tipo_documento_pasajero: TipoDocumentoPasajero;
  numero_documento_pasajero: string;
  fecha_nacimiento_pasajero: string | null;
  requiere_asistencia: boolean;
}

export interface CrearPasajeroPayload {
  nombre_pasajero: string;
  apellido_pasajero: string;
  tipo_documento_pasajero: TipoDocumentoPasajero;
  numero_documento_pasajero: string;
  id_cliente?: number;
  fecha_nacimiento_pasajero?: string;
  nacionalidad_pasajero?: string;
  email_contacto_pasajero?: string;
  telefono_contacto_pasajero?: string;
  genero_pasajero?: string;
  requiere_asistencia?: boolean;
  observaciones_pasajero?: string;
}

// ─── Reserva ──────────────────────────────────────────

export interface Reserva {
  id_reserva: number;
  guid_reserva: string;
  codigo_reserva: string;
  id_cliente: number;
  id_pasajero: number;
  id_vuelo: number;
  id_asiento: number;
  fecha_reserva_utc: string;
  fecha_inicio: string;
  fecha_fin: string;
  subtotal_reserva: number;
  valor_iva: number;
  total_reserva: number;
  origen_canal_reserva: string;
  estado_reserva: EstadoReserva;
  contacto_email: string | null;
  contacto_telefono: string | null;
}

export interface CrearReservaPayload {
  id_cliente: number;
  id_pasajero: number;
  id_vuelo: number;
  id_asiento: number;
  fecha_inicio: string;
  fecha_fin: string;
  subtotal_reserva: number;
  valor_iva: number;
  total_reserva: number;
  origen_canal_reserva?: string;
  contacto_email?: string;
  contacto_telefono?: string;
  observaciones?: string;
}

// ─── Factura ──────────────────────────────────────────

export interface Factura {
  id_factura: number;
  guid_factura: string;
  numero_factura: string;
  id_cliente: number;
  id_reserva: number;
  id_metodo: number;
  fecha_emision: string;
  subtotal: number;
  valor_iva: number;
  cargo_servicio: number;
  total: number;
  estado: EstadoFactura;
  observaciones_factura: string | null;
}

export interface CrearFacturaPayload {
  id_cliente: number;
  id_reserva: number;
  id_metodo: number;
  subtotal: number;
  valor_iva: number;
  cargo_servicio: number;
  total: number;
  observaciones_factura?: string;
}

// ─── Boleto ───────────────────────────────────────────

export interface Boleto {
  id_boleto: number;
  codigo_boleto: string;
  id_reserva: number;
  id_vuelo: number;
  id_asiento: number;
  id_factura: number;
  clase: ClaseCabina;
  precio_vuelo_base: number;
  precio_asiento_extra: number;
  impuestos_boleto: number;
  cargo_equipaje: number;
  precio_final: number;
  estado_boleto: EstadoBoleto;
  fecha_emision: string;
}

export interface CrearBoletoPayload {
  id_reserva: number;
  id_vuelo: number;
  id_asiento: number;
  id_factura: number;
  clase: ClaseCabina;
  precio_vuelo_base: number;
  precio_asiento_extra?: number;
  impuestos_boleto?: number;
  cargo_equipaje?: number;
  precio_final: number;
}

// ─── Equipaje ─────────────────────────────────────────

export interface Equipaje {
  id_equipaje: number;
  id_boleto: number;
  tipo: TipoEquipaje;
  peso_kg: number;
  descripcion_equipaje: string | null;
  precio_extra: number;
  dimensiones_cm: string | null;
  numero_etiqueta: string | null;
  estado_equipaje: EstadoEquipaje;
}

export interface CrearEquipajePayload {
  id_boleto: number;
  tipo: TipoEquipaje;
  peso_kg: number;
  descripcion_equipaje?: string;
  precio_extra?: number;
  dimensiones_cm?: string;
}

// ─── Tipo de Servicio (backend actual) ────────────────

export interface TipoServicio {
  guidTipoServicio: string;
  nombre: string;
  descripcion?: string;
  estado?: string;
  esEliminado?: boolean;
}

// ─── Servicio / Proveedor (backend actual) ────────────

export interface Servicio {
  guidServicio: string;
  guidTipoServicio: string;
  tipoServicioNombre?: string;
  razonSocial: string;
  nombreComercial?: string;
  tipoIdentificacion?: string;
  numeroIdentificacion?: string;
  descripcion?: string;
  correoContacto?: string;
  telefonoContacto?: string;
  direccion?: string;
  sitioWeb?: string;
  logoUrl?: string;
  estado?: string;
  esEliminado?: boolean;
}

export interface ServicioDetalle extends Servicio {
  detalle?: Record<string, unknown>;
}
