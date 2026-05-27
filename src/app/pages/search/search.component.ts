import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { DatePickerComponent } from '../../components/date-picker/date-picker.component';
import { CarService } from '../../features/cars/services/car.service';
import { Localizacion, Categoria } from '../../features/cars/shared/car.models';
import { AirportAutocompleteComponent } from '../../features/flights/components/airport-autocomplete/airport-autocomplete.component';
import { AeropuertoSugerencia } from '../../features/flights/shared/flight.models';
import {
  ALL_ATTRACTION_PROVIDERS,
  ATTRACTION_PROVIDER_LABELS,
} from '../../features/atracciones/services/atracciones.service';
import { AttractionProvider } from '../../features/atracciones/models/atracciones.models';

type FlightClass = 'Económica' | 'Ejecutiva' | 'Primera clase';
interface FlightSearchCriteria {
  origen: string;
  destino: string;
  fechaSalida: string;
  fechaRegreso: string;
  pasajeros: number;
  clase: FlightClass;
  tipoViaje: 'roundtrip' | 'oneway';
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent, DatePickerComponent, AirportAutocompleteComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carService = inject(CarService);
  private readonly tabsValidas = new Set(['alojamiento', 'vuelos', 'coches', 'atracciones']);

  activeTab = 'alojamiento';
  fechaHoy = '';
  fechaManana = '';

  /** Providers técnicos de atracciones (claves para construir la ruta `/{provider}/api/v2/...`). */
  readonly attractionProviders: readonly AttractionProvider[] = ALL_ATTRACTION_PROVIDERS;
  /** Mapeo provider técnico → nombre de empresa para el `<option>` del selector. */
  readonly attractionProviderLabels = ATTRACTION_PROVIDER_LABELS;

  tabs = [
    { key: 'alojamiento',  icon: 'hotel',              label: 'Alojamiento' },
    { key: 'vuelos',       icon: 'flight',             label: 'Vuelos' },
    { key: 'coches',       icon: 'directions_car',     label: 'Coches' },
    { key: 'atracciones',  icon: 'confirmation_number', label: 'Atracciones' },
  ];

  aloj = { destino: '', llegada: '', salida: '', habitaciones: 1, adultos: 2, ninos: 0 };
  alojErrors = {
    destino: '',
    llegada: '',
    salida: '',
    habitaciones: '',
    adultos: '',
    ninos: ''
  };

  vuelos = { origen: '', destino: '', salida: '', regreso: '', pasajeros: 1, clase: 'Económica', tipoViaje: 'roundtrip' as 'roundtrip' | 'oneway' };
  aeropuertoOrigen: AeropuertoSugerencia | null = null;
  aeropuertoDestino: AeropuertoSugerencia | null = null;
  flightFormError = '';
  vueloErrors = {
    origen: '',
    destino: '',
    salida: '',
    regreso: '',
    pasajeros: ''
  };

  coches = {
    idLocalizacion: null as number | null,
    recogida: '',
    devolucion: '',
    categoria: '',
    marca: '',
    transmision: '',
    proveedor: '',
    sort: ''
  };
  cocheErrors = {
    recogida: '',
    devolucion: ''
  };

  localizacionesCoches: Localizacion[] = [];
  categoriasCoches: Categoria[] = [];
  atracciones = { destino: '', fecha: '', proveedor: 'todos' };

  ngOnInit(): void {
    // Calcular fecha de hoy y de mañana para el alojamiento por defecto
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    this.fechaHoy = `${year}-${month}-${day}`;

    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const yManana = manana.getFullYear();
    const mManana = String(manana.getMonth() + 1).padStart(2, '0');
    const dManana = String(manana.getDate()).padStart(2, '0');
    this.fechaManana = `${yManana}-${mManana}-${dManana}`;

    this.aloj.llegada = this.fechaHoy;
    this.aloj.salida = this.fechaManana;

    // Fecha de salida de vuelos: hoy por defecto (mismo formato YYYY-MM-DD del date-picker)
    this.vuelos.salida = this.fechaHoy;

    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      this.activeTab = this.tabsValidas.has(tab) ? tab : 'alojamiento';
    });

    this.onProveedorChange();
  }

  onProveedorChange(): void {
    // Cuando el proveedor cambia, reseteamos la categoría/sucursal o las dejamos, 
    // pero idealmente actualizamos las listas.
    this.coches.idLocalizacion = null;
    this.coches.categoria = '';

    if (!this.coches.proveedor) {
      this.localizacionesCoches = [];
      this.categoriasCoches = [];
      return;
    }

    this.carService.getLocalizaciones(this.coches.proveedor).subscribe(locs => this.localizacionesCoches = locs);
    this.carService.getCategorias(this.coches.proveedor).subscribe(cats => this.categoriasCoches = cats);
  }

  setTab(key: string): void {
    this.activeTab = key;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  validarAloj(campo: keyof typeof this.alojErrors): void {
    const hoyStr = this.fechaHoy;

    if (campo === 'destino') {
      const dest = this.aloj.destino;
      if (!dest || !dest.trim()) {
        this.alojErrors.destino = 'Por favor, ingresa un destino para iniciar tu búsqueda.';
      } else {
        this.alojErrors.destino = '';
      }
    }

    if (campo === 'llegada') {
      const lleg = this.aloj.llegada;
      if (!lleg) {
        this.alojErrors.llegada = 'Debe seleccionar una fecha de llegada.';
      } else if (lleg < hoyStr) {
        this.alojErrors.llegada = 'La fecha de llegada no puede ser anterior a hoy.';
      } else {
        this.alojErrors.llegada = '';
        if (this.aloj.salida && this.aloj.salida < lleg) {
          this.alojErrors.salida = 'La fecha de salida no puede ser anterior a la fecha de llegada.';
        } else if (this.aloj.salida && this.aloj.salida >= lleg && this.alojErrors.salida === 'La fecha de salida no puede ser anterior a la fecha de llegada.') {
          this.alojErrors.salida = '';
        }
      }
    }

    if (campo === 'salida') {
      const sal = this.aloj.salida;
      const lleg = this.aloj.llegada;
      if (!sal) {
        this.alojErrors.salida = 'Debe seleccionar una fecha de salida.';
      } else if (sal < hoyStr) {
        this.alojErrors.salida = 'La fecha de salida no puede ser anterior a hoy.';
      } else if (lleg && sal < lleg) {
        this.alojErrors.salida = 'La fecha de salida no puede ser anterior a la fecha de llegada.';
      } else {
        this.alojErrors.salida = '';
      }
    }

    if (campo === 'habitaciones') {
      const val = this.aloj.habitaciones;
      if (val === null || val === undefined || String(val).trim() === '' || isNaN(Number(val))) {
        this.alojErrors.habitaciones = 'Por favor ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.alojErrors.habitaciones = 'No se permiten números negativos.';
      } else if (Number(val) === 0) {
        this.alojErrors.habitaciones = 'El número de habitaciones no puede ser 0.';
      } else {
        this.alojErrors.habitaciones = '';
      }
    }

    if (campo === 'adultos') {
      const val = this.aloj.adultos;
      if (val === null || val === undefined || String(val).trim() === '' || isNaN(Number(val))) {
        this.alojErrors.adultos = 'Por favor ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.alojErrors.adultos = 'No se permiten números negativos.';
      } else if (Number(val) === 0) {
        this.alojErrors.adultos = 'El número de adultos no puede ser 0.';
      } else {
        this.alojErrors.adultos = '';
      }
    }

    if (campo === 'ninos') {
      const val = this.aloj.ninos;
      if (val === null || val === undefined || String(val).trim() === '' || isNaN(Number(val))) {
        this.alojErrors.ninos = 'Por favor ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.alojErrors.ninos = 'No se permiten números negativos.';
      } else {
        this.alojErrors.ninos = '';
      }
    }
  }

  validarTodoAloj(): boolean {
    this.validarAloj('destino');
    this.validarAloj('llegada');
    this.validarAloj('salida');
    this.validarAloj('habitaciones');
    this.validarAloj('adultos');
    this.validarAloj('ninos');

    return !Object.values(this.alojErrors).some(err => err !== '');
  }

  validarVuelo(campo: keyof typeof this.vueloErrors): void {
    const hoyStr = this.fechaHoy;

    if (campo === 'origen') {
      if (!this.aeropuertoOrigen) {
        this.vueloErrors.origen = 'Por favor, selecciona un aeropuerto de origen.';
      } else {
        this.vueloErrors.origen = '';
      }
    }

    if (campo === 'destino') {
      if (!this.aeropuertoDestino) {
        this.vueloErrors.destino = 'Por favor, selecciona un aeropuerto de destino.';
      } else {
        this.vueloErrors.destino = '';
      }
    }

    if (campo === 'salida') {
      const sal = this.vuelos.salida;
      if (!sal) {
        this.vueloErrors.salida = 'Debe seleccionar una fecha de salida.';
      } else if (sal < hoyStr) {
        this.vueloErrors.salida = 'La fecha de salida no puede ser anterior a hoy.';
      } else {
        this.vueloErrors.salida = '';
        if (this.vuelos.regreso && this.vuelos.regreso < sal) {
          this.vueloErrors.regreso = 'La fecha de regreso no puede ser anterior a la fecha de salida.';
        } else if (this.vuelos.regreso && this.vuelos.regreso >= sal && this.vueloErrors.regreso === 'La fecha de regreso no puede ser anterior a la fecha de salida.') {
          this.vueloErrors.regreso = '';
        }
      }
    }

    if (campo === 'regreso') {
      const reg = this.vuelos.regreso;
      const sal = this.vuelos.salida;
      if (reg) {
        if (reg < hoyStr) {
          this.vueloErrors.regreso = 'La fecha de regreso no puede ser anterior a hoy.';
        } else if (sal && reg < sal) {
          this.vueloErrors.regreso = 'La fecha de regreso no puede ser anterior a la fecha de salida.';
        } else {
          this.vueloErrors.regreso = '';
        }
      } else {
        this.vueloErrors.regreso = '';
      }
    }

    if (campo === 'pasajeros') {
      const val = this.vuelos.pasajeros;
      if (val === null || val === undefined || String(val).trim() === '' || isNaN(Number(val))) {
        this.vueloErrors.pasajeros = 'Por favor ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.vueloErrors.pasajeros = 'No se permiten números negativos.';
      } else if (Number(val) === 0) {
        this.vueloErrors.pasajeros = 'El número de pasajeros no puede ser 0.';
      } else {
        this.vueloErrors.pasajeros = '';
      }
    }
  }

  validarTodoVuelo(): boolean {
    this.validarVuelo('origen');
    this.validarVuelo('destino');
    this.validarVuelo('salida');
    this.validarVuelo('regreso');
    this.validarVuelo('pasajeros');

    return !Object.values(this.vueloErrors).some(err => err !== '');
  }

  validarCoches(campo: keyof typeof this.cocheErrors): void {
    const hoyStr = this.fechaHoy;

    if (campo === 'recogida') {
      const rec = this.coches.recogida;
      if (!rec) {
        this.cocheErrors.recogida = 'Debe seleccionar una fecha de recogida.';
      } else if (rec < hoyStr) {
        this.cocheErrors.recogida = 'La fecha de recogida no puede ser anterior a hoy.';
      } else {
        this.cocheErrors.recogida = '';
        if (this.coches.devolucion && this.coches.devolucion < rec) {
          this.cocheErrors.devolucion = 'La fecha de devolución no puede ser anterior a la recogida.';
        } else if (this.coches.devolucion && this.coches.devolucion >= rec && this.cocheErrors.devolucion === 'La fecha de devolución no puede ser anterior a la recogida.') {
          this.cocheErrors.devolucion = '';
        }
      }
    }

    if (campo === 'devolucion') {
      const dev = this.coches.devolucion;
      const rec = this.coches.recogida;
      if (!dev) {
        this.cocheErrors.devolucion = 'Debe seleccionar una fecha de devolución.';
      } else if (dev < hoyStr) {
        this.cocheErrors.devolucion = 'La fecha de devolución no puede ser anterior a hoy.';
      } else if (rec && dev < rec) {
        this.cocheErrors.devolucion = 'La fecha de devolución no puede ser anterior a la recogida.';
      } else {
        this.cocheErrors.devolucion = '';
      }
    }
  }

  validarTodoCoches(): boolean {
    this.validarCoches('recogida');
    this.validarCoches('devolucion');
    return !Object.values(this.cocheErrors).some(err => err !== '');
  }

  buscarAlojamiento(): void {
    if (!this.validarTodoAloj()) {
      return;
    }

    const { destino, llegada, salida, habitaciones, adultos, ninos } = this.aloj;
    this.router.navigate(['/alojamiento/resultados'], {
      queryParams: {
        destino: destino.trim(),
        llegada: llegada || '',
        salida: salida || '',
        habitaciones,
        adultos,
        ninos
      }
    });
  }

  buscarVuelos(): void {
    if (!this.validarTodoVuelo()) {
      return;
    }

    const { salida, regreso, pasajeros, clase, tipoViaje } = this.vuelos;
    const origenIata = this.aeropuertoOrigen?.codigoIata ?? '';
    const origenNombre = this.aeropuertoOrigen?.nombre ?? '';
    const destinoIata = this.aeropuertoDestino?.codigoIata ?? '';
    const destinoNombre = this.aeropuertoDestino?.nombre ?? '';

    const criterios: FlightSearchCriteria = {
      origen: origenNombre,
      destino: destinoNombre,
      fechaSalida: salida,
      fechaRegreso: tipoViaje === 'roundtrip' ? regreso : '',
      pasajeros,
      clase: clase as FlightClass,
      tipoViaje,
    };
    sessionStorage.setItem('flight-search-criteria', JSON.stringify(criterios));
    this.router.navigate(['/vuelos/resultados'], {
      queryParams: {
        origenIata,
        origenNombre,
        destinoIata,
        destinoNombre,
        fecha: salida,
        fechaRegreso: tipoViaje === 'roundtrip' ? regreso : '',
        tipoViaje,
      },
    });
  }

  buscarCoches(): void {
    if (!this.validarTodoCoches()) {
      return;
    }

    const qp: Record<string, string> = {};
    if (this.coches.idLocalizacion) qp['idLocalizacionRecogida'] = String(this.coches.idLocalizacion);
    if (this.coches.recogida) qp['fechaRecogida'] = this.coches.recogida;
    if (this.coches.devolucion) qp['fechaDevolucion'] = this.coches.devolucion;
    if (this.coches.categoria) qp['nombreCategoria'] = this.coches.categoria;
    if (this.coches.marca) qp['nombreMarca'] = this.coches.marca;
    if (this.coches.transmision) qp['transmision'] = this.coches.transmision;
    if (this.coches.proveedor && this.coches.proveedor !== 'todos') qp['proveedor'] = this.coches.proveedor;
    if (this.coches.sort) qp['sort'] = this.coches.sort;

    this.router.navigate(['/autos/resultados'], { queryParams: qp });
  }

  buscarAtracciones(): void {
    const { destino, fecha, proveedor } = this.atracciones;
    const queryParams: { ciudad?: string; fecha?: string; proveedor?: string } = {};
    if (destino.trim()) queryParams.ciudad = destino.trim();
    if (fecha) queryParams.fecha = fecha;
    // Solo se envía si NO es 'todos' (default — equivale a omitir el filtro).
    if (proveedor && proveedor !== 'todos') queryParams.proveedor = proveedor;
    this.router.navigate(['/atracciones'], { queryParams });
  }

  private isCityTextOnly(value: string): boolean {
    return /^[a-zA-Z\u00C0-\u017F\s]+$/.test(value.trim());
  }
}
