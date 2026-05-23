/* ================================================
   MÓDULO DE VEHÍCULOS — MODELOS
   car.models.ts — Pooking Interface
   Basado en Contrato API Vehículos RedCar V2.0.0
   ================================================ */

export interface Localizacion {
  idLocalizacion: number;
  codigo: string;
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  horarioAtencion: string;
  zonaHoraria: string;
  estado: 'ACT' | 'INA';
  ciudad: { idCiudad: number; nombre: string };
}

export interface Categoria {
  idCategoria: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: 'ACT' | 'INA';
}

export interface Extra {
  idExtra: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  valorFijo: number;
  estado: 'ACT' | 'INA';
  icono?: string; // icono Material Icons para UI
}

export interface PrecioVehiculo {
  precioBaseDia: number;
  subtotalVehiculo: number;
  iva: number;
  total: number;
}

export interface DisponibilidadVehiculo {
  fechaRecogida: string;
  fechaDevolucion: string;
  cantidadDias: number;
  disponible: boolean;
}

export interface VehicleItem {
  idVehiculo: number;
  codigoInterno: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  imagenUrl: string;
  transmision: 'AUTOMATICA' | 'MANUAL';
  combustible: 'GASOLINA' | 'DIESEL' | 'ELECTRICO' | 'HIBRIDO';
  capacidadPasajeros: number;
  capacidadMaletas: number;
  numeroPuertas: number;
  aireAcondicionado: boolean;
  estado: 'ACT' | 'INA';
  localizacion: Localizacion;
  categoria: Categoria;
  disponibilidad: DisponibilidadVehiculo;
  precio: PrecioVehiculo;
  provider?: string;
}

export interface ExtraSeleccionado {
  idExtra: number;
  cantidad: number;
}

export interface DatosCliente {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: 'CEDULA' | 'PASAPORTE' | 'RUC';
  numeroIdentificacion: string;
  correo: string;
  telefono: string;
}

export interface DatosConductor {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: 'CEDULA' | 'PASAPORTE' | 'RUC';
  numeroIdentificacion: string;
  fechaVencimientoLicencia: string;
  edadConductor: number | null;
  correo: string;
  telefono: string;
  esPrincipal: boolean;
}

export interface CriteriosBusquedaAutos {
  idLocalizacionRecogida: number | null;
  idLocalizacionDevolucion: number | null;
  fechaRecogida: string;
  fechaDevolucion: string;
  nombreCategoria: string;
  transmision: '' | 'AUTOMATICA' | 'MANUAL';
  nombreMarca?: string;
  proveedor?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ResumenReservaAuto {
  vehiculo: VehicleItem;
  localizacionRecogida: Localizacion;
  localizacionDevolucion: Localizacion;
  fechaRecogida: string;
  fechaDevolucion: string;
  horaRecogida: string;
  horaDevolucion: string;
  cantidadDias: number;
  extrasSeleccionados: { extra: Extra; cantidad: number }[];
  conductor: DatosConductor;
  subtotalVehiculo: number;
  subtotalExtras: number;
  subtotal: number;
  iva: number;
  total: number;
}
