import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { DatePickerComponent } from '../../components/date-picker/date-picker.component';

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
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent, DatePickerComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly tabsValidas = new Set(['alojamiento', 'vuelos', 'coches', 'atracciones']);

  activeTab = 'alojamiento';
  fechaHoy = '';
  fechaManana = '';

  tabs = [
    { key: 'alojamiento',  icon: 'hotel',              label: 'Alojamiento' },
    { key: 'vuelos',       icon: 'flight',             label: 'Vuelos' },
    { key: 'coches',       icon: 'directions_car',     label: 'Alquiler de Coches' },
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
  flightFormError = '';
  vueloErrors = {
    origen: '',
    destino: '',
    salida: '',
    regreso: '',
    pasajeros: ''
  };

  coches = { lugar: '', recogida: '', devolucion: '' };
  atracciones = { destino: '', fecha: '' };

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

    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      this.activeTab = this.tabsValidas.has(tab) ? tab : 'alojamiento';
    });
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
      const orig = this.vuelos.origen;
      if (!orig || !orig.trim()) {
        this.vueloErrors.origen = 'Por favor, ingresa una ciudad de origen.';
      } else if (!this.isCityTextOnly(orig)) {
        this.vueloErrors.origen = 'El origen solo permite letras y espacios.';
      } else {
        this.vueloErrors.origen = '';
      }
    }

    if (campo === 'destino') {
      const dest = this.vuelos.destino;
      if (!dest || !dest.trim()) {
        this.vueloErrors.destino = 'Por favor, ingresa una ciudad de destino.';
      } else if (!this.isCityTextOnly(dest)) {
        this.vueloErrors.destino = 'El destino solo permite letras y espacios.';
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

    const { origen, destino, salida, regreso, pasajeros, clase, tipoViaje } = this.vuelos;
    const criterios: FlightSearchCriteria = {
      origen: origen.trim(),
      destino: destino.trim(),
      fechaSalida: salida,
      fechaRegreso: tipoViaje === 'roundtrip' ? regreso : '',
      pasajeros,
      clase: clase as FlightClass,
      tipoViaje,
    };
    sessionStorage.setItem('flight-search-criteria', JSON.stringify(criterios));
    this.router.navigate(['/vuelos/resultados'], {
      queryParams: {
        origen: origen.trim(),
        destino: destino.trim(),
        fecha: salida,
        fechaRegreso: tipoViaje === 'roundtrip' ? regreso : '',
        tipoViaje,
      },
    });
  }

  buscarAtracciones(): void {
    const { destino, fecha } = this.atracciones;
    const queryParams: { ciudad?: string; fecha?: string } = {};
    if (destino.trim()) queryParams.ciudad = destino.trim();
    if (fecha) queryParams.fecha = fecha;
    this.router.navigate(['/atracciones'], { queryParams });
  }

  onCityInput(field: 'origen' | 'destino', event: Event): void {
    const input = event.target as HTMLInputElement;
    const saneado = input.value.replace(/[^a-zA-Z\u00C0-\u017F\s]/g, '');
    this.vuelos[field] = saneado;
    this.validarVuelo(field);
  }

  private isCityTextOnly(value: string): boolean {
    return /^[a-zA-Z\u00C0-\u017F\s]+$/.test(value.trim());
  }
}
