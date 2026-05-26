import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

const API_GATEWAY_URL = environment.apiGatewayUrl;
const PROVIDERS = ['juan', 'jorge', 'kelvin', 'jose', 'mateo'];

export interface Room {
  id: string;
  nombre: string;
  piso: string;
  cama: string;
  capacidad: string;
  capacidadAdultos: number;
  capacidadNinos: number;
  metros: number;
  precio: number;
  disponibles: number;
  imagen: string;
  imagenes: string[];
}

export interface Review {
  iniciales: string;
  nombre: string;
  tipo: string;
  fecha: string;
  score: number;
  positivo: string;
  negativo?: string;
  respuesta?: string;
  avatarColor?: string;
}

export interface Lodging {
  id: string;
  nombre: string;
  tipo: 'Hotel' | 'Hostal' | 'Motel' | 'Apartamento';
  categoria: number; // Estrellas 1-5
  calidad: 'Negocios' | 'Familia' | 'Lujo' | 'Económico' | 'Relajación';
  direccion: string;
  ciudad: string;
  descripcion: string;
  descripcionLarga?: string;
  imagen: string;
  imagenes: string[];
  fotosCount: number;
  precio: number;
  valoracion: number;
  ratingTexto: string;
  reviewsCount: number;
  habitacionesDisponibles: number;
  checkIn: string;
  checkOut: string;
  servicios: string[];
  amenities?: string[];
  aceptaNinos: boolean;
  aceptaMascotas: boolean;
  favorito?: boolean;
  provider: string;
  habitaciones: Room[];
  reviews: Review[];
  zona?: string;
  distanciaCentro?: string;
  transporte?: string;
  alrededores?: string;
  telefono?: string;
  email?: string;
}

export interface ReservaPayload {
  sucursalGuid: string;
  fechaInicio: string;
  fechaFin: string;
  observaciones?: string;
  esWalkin: boolean;
  origenCanalReserva: string;
  cliente: {
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono: string;
    direccion?: string;
  };
  habitaciones: {
    tipoHabitacionGuid: string;
    numHabitaciones: number;
    numAdultos: number;
    numNinos: number;
  }[];
}

export interface ReservaResponse {
  reservaGuid: string;
  codigoReserva: string;
  clienteGuid: string;
  sucursalGuid: string;
  fechaReservaUtc: string;
  fechaInicio: string;
  fechaFin: string;
  subtotalReserva: number;
  valorIva: number;
  totalReserva: number;
  descuentoAplicado: number;
  saldoPendiente: number;
  origenCanalReserva: string;
  estadoReserva: string;
}

@Injectable({
  providedIn: 'root'
})
export class LodgingService {
  private http = inject(HttpClient);

  // Mapear el tipo de alojamiento de texto plano a categorías UI
  private mapTipoAlojamiento(tipo: string): 'Hotel' | 'Hostal' | 'Motel' | 'Apartamento' {
    const t = (tipo || '').toLowerCase();
    if (t.includes('hostal') || t.includes('hostel')) return 'Hostal';
    if (t.includes('motel')) return 'Motel';
    if (t.includes('apartamento') || t.includes('apartment') || t.includes('suite')) return 'Apartamento';
    return 'Hotel';
  }

  // Mapear categoría interna a etiquetas descriptivas UI
  private mapCategoria(cat: string): 'Negocios' | 'Familia' | 'Lujo' | 'Económico' | 'Relajación' {
    const c = (cat || '').toLowerCase();
    if (c.includes('negocio')) return 'Negocios';
    if (c.includes('familia')) return 'Familia';
    if (c.includes('lujo') || c.includes('luxury')) return 'Lujo';
    if (c.includes('econ') || c.includes('cheap')) return 'Económico';
    return 'Relajación';
  }

  // Mapear valoración numérica a texto descriptivo UI
  private getRatingText(score: number): string {
    if (score >= 4.8) return 'Excepcional';
    if (score >= 4.5) return 'Excelente';
    if (score >= 4.0) return 'Muy bueno';
    if (score >= 3.0) return 'Bueno';
    return 'Aceptable';
  }

  // Mapear respuesta individual de búsqueda a objeto Lodging
  private mapSearchItemToLodging(item: any, provider: string): Lodging {
    return {
      id: item.sucursalGuid,
      nombre: item.nombre || '',
      tipo: this.mapTipoAlojamiento(item.tipoAlojamiento),
      categoria: item.estrellas || 0,
      calidad: this.mapCategoria(item.categoria),
      direccion: item.direccion || `${item.ciudad || ''}, ${item.provincia || ''}`,
      ciudad: item.ciudad || '',
      descripcion: item.descripcion || '',
      imagen: item.imagenPrincipalUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90',
      imagenes: [item.imagenPrincipalUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90'],
      fotosCount: 0,
      precio: item.precioDesde || 0,
      valoracion: item.promedioValoracion || 0,
      ratingTexto: this.getRatingText(item.promedioValoracion || 0),
      reviewsCount: item.totalValoraciones || 0,
      habitacionesDisponibles: item.habitacionesDisponibles || 0,
      checkIn: item.horaCheckIn || '15:00',
      checkOut: item.horaCheckOut || '12:00',
      servicios: item.serviciosDestacados || [],
      amenities: [],
      aceptaNinos: item.aceptaNinos ?? true,
      aceptaMascotas: item.permiteMascotas ?? false,
      provider: provider,
      habitaciones: [],
      reviews: []
    };
  }

  // Consulta en paralelo a todos los proveedores del Gateway
  buscarLodgings(criterios: {
    destino?: string;
    fechaInicio?: string;
    fechaFin?: string;
    adultos?: number;
    ninos?: number;
    habitaciones?: number;
  }): Observable<Lodging[]> {
    let params = new HttpParams();
    if (criterios.destino) params = params.set('Destino', criterios.destino);
    if (criterios.fechaInicio) {
      const val = criterios.fechaInicio.includes('T') ? criterios.fechaInicio : criterios.fechaInicio + 'T14:00:00.000Z';
      params = params.set('fechaInicio', val);
    }
    if (criterios.fechaFin) {
      const val = criterios.fechaFin.includes('T') ? criterios.fechaFin : criterios.fechaFin + 'T12:00:00.000Z';
      params = params.set('fechaFin', val);
    }
    if (criterios.adultos) params = params.set('NumAdultos', criterios.adultos.toString());
    if (criterios.ninos) params = params.set('NumNinos', criterios.ninos.toString());
    if (criterios.habitaciones) params = params.set('NumHabitaciones', criterios.habitaciones.toString());

    const requests = PROVIDERS.map(provider => {
      const url = `${API_GATEWAY_URL}/${provider}/api/v1/accommodations/search`;
      console.log(`[DEBUG] Requesting search to provider ${provider}:`, url, 'Params:', params.toString());
      return this.http.get<any>(url, { params }).pipe(
        timeout(60000),
        map(res => {
          const items = res?.items || [];
          console.log(`[DEBUG] Raw response from provider ${provider}:`, items);
          // Filter out accommodations with 0 available rooms
          const activeItems = items.filter((item: any) => (item.habitacionesDisponibles === undefined || item.habitacionesDisponibles === null || item.habitacionesDisponibles > 0));
          return activeItems.map((item: any) => this.mapSearchItemToLodging(item, provider));
        }),
        catchError(err => {
          console.warn(`[WARNING] Error searching in provider ${provider}:`, err);
          return of([]);
        })
      );
    });

    return forkJoin(requests).pipe(
      map(results => results.flat())
    );
  }

  // Consultar detalle completo de un alojamiento específico
  getLodgingById(sucursalGuid: string, provider: string, fechaInicio?: string, fechaFin?: string, adultos?: number, ninos?: number): Observable<Lodging | null> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio + 'T14:00:00.000Z');
    if (fechaFin) params = params.set('fechaFin', fechaFin + 'T12:00:00.000Z');

    return this.http.get<any>(`${API_GATEWAY_URL}/${provider}/api/v1/accommodations/${sucursalGuid}`, { params }).pipe(
      map(res => {
        if (!res) return null;
        
        // Filter out room types with 0 available rooms in the queried range
        const habitaciones = (res.tiposHabitacion || [])
          .filter((h: any) => (h.disponiblesEnRango === undefined || h.disponiblesEnRango === null || h.disponiblesEnRango > 0))
          .map((h: any, index: number) => ({
            id: h.tipoHabitacionGuid,
            nombre: h.nombre || '',
            piso: `Piso ${index + 1}`,
            cama: h.tipoCama || 'Cama matrimonial',
            capacidad: `${h.capacidadAdultos || 2} adultos · ${h.capacidadNinos || 0} niños`,
            capacidadAdultos: h.capacidadAdultos || 2,
            capacidadNinos: h.capacidadNinos || 0,
            metros: h.areaM2 || 20,
            precio: h.precioBase || 0,
            disponibles: h.disponiblesEnRango ?? res.habitacionesDisponibles ?? 1,
            imagen: (h.imagenes && h.imagenes.length > 0) ? h.imagenes[0] : 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=90',
            imagenes: (h.imagenes && h.imagenes.length > 0) ? h.imagenes : ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=90']
          }));

        return {
          id: res.sucursalGuid,
          nombre: res.nombre || '',
          tipo: this.mapTipoAlojamiento(res.tipoAlojamiento),
          categoria: res.estrellas || 0,
          calidad: this.mapCategoria(res.categoria),
          direccion: res.direccion || `${res.ciudad || ''}, ${res.provincia || ''}`,
          ciudad: res.ciudad || '',
          descripcion: res.descripcion || '',
          descripcionLarga: res.descripcionCompleta || res.descripcion || '',
          imagen: res.imagenPrincipalUrl || (res.imagenes && res.imagenes.length > 0 ? res.imagenes[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90'),
          imagenes: res.imagenes && res.imagenes.length > 0 ? res.imagenes : [res.imagenPrincipalUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90'],
          fotosCount: res.imagenes ? res.imagenes.length : 0,
          precio: res.precioDesde || 0,
          valoracion: res.promedioValoracion || 0,
          ratingTexto: this.getRatingText(res.promedioValoracion || 0),
          reviewsCount: res.totalValoraciones || 0,
          habitacionesDisponibles: res.habitacionesDisponibles || 0,
          checkIn: res.horaCheckIn || '14:00',
          checkOut: res.horaCheckOut || '12:00',
          servicios: res.serviciosDestacados || [],
          amenities: res.amenities || [],
          aceptaNinos: res.aceptaNinos ?? true,
          aceptaMascotas: res.permiteMascotas ?? false,
          provider: provider,
          habitaciones: habitaciones,
          reviews: [],
          zona: res.provincia || 'Norte de la ciudad',
          distanciaCentro: 'A pocos minutos del centro',
          transporte: 'Fácil acceso a transporte público',
          alrededores: 'Centros comerciales y parques cercanos',
          telefono: res.politicas?.politicas?.includes('+593') ? '+593 2 255-6789' : '+593 2 255-6789',
          email: 'contacto@hotel.pooking.ec'
        };
      }),
      catchError(err => {
        console.error(`Error obteniendo detalle de alojamiento ${sucursalGuid} de ${provider}`, err);
        return of(null);
      })
    );
  }

  // Consultar valoraciones de un alojamiento
  getReviews(sucursalGuid: string, provider: string, pagina: number = 1, limite: number = 10): Observable<Review[]> {
    const params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());

    return this.http.get<any>(`${API_GATEWAY_URL}/${provider}/api/v1/accommodations/${sucursalGuid}/reviews`, { params }).pipe(
      map(res => {
        const items = res?.items || [];
        return items.map((rv: any) => {
          const name = rv.nombreVisibleCliente || 'Huésped Anónimo';
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
          
          return {
            iniciales: initials || 'HU',
            nombre: name,
            tipo: rv.tipoViaje || 'Viajero',
            fecha: this.formatReviewDate(rv.fecha),
            score: rv.puntuacion || 10,
            positivo: rv.comentarioPositivo || '',
            negativo: rv.comentarioNegativo || '',
            respuesta: rv.respuestaPropiedad || '',
            avatarColor: '#8E5A54'
          };
        });
      }),
      catchError(err => {
        console.warn(`Error obteniendo reseñas para alojamiento ${sucursalGuid} de ${provider}:`, err);
        return of([]);
      })
    );
  }

  // Crear una nueva reserva de alojamiento
  crearReserva(provider: string, payload: ReservaPayload): Observable<ReservaResponse | null> {
    return this.http.post<ReservaResponse>(`${API_GATEWAY_URL}/${provider}/api/v1/accommodations/reservas`, payload).pipe(
      map(res => res || null),
      catchError(err => {
        console.error(`Error creando reserva de alojamiento en proveedor ${provider}:`, err);
        return of(null);
      })
    );
  }

  // Consultar el detalle de una reserva específica usando su GUID (GET /api/v1/accommodations/reservas/{reservaGuid})
  getReservaByGuid(provider: string, reservaGuid: string): Observable<any> {
    const url = `${API_GATEWAY_URL}/${provider}/api/v1/accommodations/reservas/${reservaGuid}`;
    console.log(`[DEBUG] Requesting reservation details:`, url);
    return this.http.get<any>(url).pipe(
      timeout(3000),
      catchError(err => {
        console.warn(`[WARNING] Error fetching reservation ${reservaGuid} from provider ${provider}:`, err);
        return of(null);
      })
    );
  }

  private formatReviewDate(dateStr: string): string {
    if (!dateStr) return 'Reciente';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
    } catch {
      return 'Reciente';
    }
  }
}
