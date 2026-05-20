import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { DatePickerComponent } from '../../components/date-picker/date-picker.component';

interface Lodging {
  id: number;
  nombre: string;
  tipo: 'Hotel' | 'Hostal' | 'Motel' | 'Apartamento';
  categoria: number; // Estrellas 1-5
  calidad: 'Negocios' | 'Familia' | 'Lujo' | 'Económico' | 'Relajación';
  direccion: string;
  ciudad: string;
  descripcion: string;
  imagen: string;
  fotosCount: number;
  precio: number;
  valoracion: number;
  ratingTexto: string;
  reviewsCount: number;
  habitacionesDisponibles: number;
  checkIn: string;
  checkOut: string;
  servicios: string[]; // 'Wifi', 'Desayuno', 'Piscina', 'Spa', 'Restaurante', 'Gimnasio', 'Estacionamiento'
  aceptaNinos: boolean;
  aceptaMascotas: boolean;
  favorito?: boolean;
}

@Component({
  selector: 'app-lodging-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent, DatePickerComponent],
  templateUrl: './lodging-results.component.html',
  styleUrls: ['./lodging-results.component.css']
})
export class LodgingResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Criterios de búsqueda activos
  busqueda = {
    destino: '',
    llegada: '',
    salida: '',
    habitaciones: 1,
    adultos: 2,
    ninos: 0
  };

  // Fecha de hoy para validaciones
  fechaHoy = '';

  // Errores de validación del formulario de búsqueda en resultados
  busquedaErrors = {
    destino: '',
    llegada: '',
    salida: '',
    habitaciones: '',
    adultos: '',
    ninos: ''
  };

  // Base de datos de alojamientos
  lodgings: Lodging[] = [
    {
      id: 1,
      nombre: 'Hotel Las Velas Quito',
      tipo: 'Hotel',
      categoria: 4,
      calidad: 'Negocios',
      direccion: 'Av. Amazonas N34-123, Quito · Pichincha',
      ciudad: 'Quito',
      descripcion: 'Hotel céntrico para viajes de negocio y turismo. A pasos del parque La Carolina y los mejores restaurantes de la ciudad.',
      imagen: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      fotosCount: 6,
      precio: 85,
      valoracion: 4.6,
      ratingTexto: 'Muy bueno',
      reviewsCount: 25,
      habitacionesDisponibles: 12,
      checkIn: '14:00',
      checkOut: '12:00',
      servicios: ['Wifi', 'Desayuno', 'Piscina', 'Restaurante'],
      aceptaNinos: true,
      aceptaMascotas: false
    },
    {
      id: 2,
      nombre: 'Casa del Arco Boutique',
      tipo: 'Hostal',
      categoria: 4,
      calidad: 'Familia',
      direccion: 'García Moreno 362, Centro Histórico, Quito',
      ciudad: 'Quito',
      descripcion: 'Hostal boutique en el corazón del Centro Histórico declarado Patrimonio de la Humanidad. Ambiente colonial único con desayuno incluido.',
      imagen: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
      fotosCount: 9,
      precio: 52,
      valoracion: 4.8,
      ratingTexto: 'Excelente',
      reviewsCount: 41,
      habitacionesDisponibles: 5,
      checkIn: '15:00',
      checkOut: '11:00',
      servicios: ['Wifi', 'Desayuno'],
      aceptaNinos: true,
      aceptaMascotas: true
    },
    {
      id: 3,
      nombre: 'Oro Verde Luxury Quito',
      tipo: 'Hotel',
      categoria: 5,
      calidad: 'Lujo',
      direccion: 'Av. 12 de Octubre N24-562, La Mariscal, Quito',
      ciudad: 'Quito',
      descripcion: 'Uno de los hoteles más emblemáticos de Quito con piscina exterior, spa de primera clase y restaurante gourmet con vistas panorámicas.',
      imagen: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      fotosCount: 14,
      precio: 175,
      valoracion: 4.9,
      ratingTexto: 'Excepcional',
      reviewsCount: 88,
      habitacionesDisponibles: 3,
      checkIn: '14:00',
      checkOut: '12:00',
      servicios: ['Wifi', 'Piscina', 'Desayuno', 'Spa', 'Restaurante', 'Gimnasio'],
      aceptaNinos: false,
      aceptaMascotas: false
    },
    {
      id: 4,
      nombre: 'Motel La Colina',
      tipo: 'Motel',
      categoria: 2,
      calidad: 'Económico',
      direccion: 'Panamericana Norte Km 12, Quito',
      ciudad: 'Quito',
      descripcion: 'Alojamiento económico con acceso directo a la vía Panamericana. Estacionamiento gratuito y atención 24 horas.',
      imagen: '', // Sin imagen para activar placeholder
      fotosCount: 0,
      precio: 28,
      valoracion: 3.2,
      ratingTexto: 'Aceptable',
      reviewsCount: 7,
      habitacionesDisponibles: 8,
      checkIn: '12:00',
      checkOut: '11:00',
      servicios: ['Wifi', 'Estacionamiento'],
      aceptaNinos: false,
      aceptaMascotas: false
    },
    {
      id: 5,
      nombre: 'Galapagos Garden Sanctuary',
      tipo: 'Apartamento',
      categoria: 5,
      calidad: 'Lujo',
      direccion: 'Puerto Ayora, Isla Santa Cruz, Galápagos',
      ciudad: 'Galapagos',
      descripcion: 'Bungalow premium inmerso en la biodiversidad de Galápagos. Estilo eco-luxury con alberca natural y avistamiento privado.',
      imagen: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80',
      fotosCount: 18,
      precio: 240,
      valoracion: 5.0,
      ratingTexto: 'Excepcional',
      reviewsCount: 15,
      habitacionesDisponibles: 2,
      checkIn: '13:00',
      checkOut: '10:00',
      servicios: ['Wifi', 'Desayuno', 'Piscina', 'Spa', 'Estacionamiento'],
      aceptaNinos: true,
      aceptaMascotas: true
    },
    {
      id: 6,
      nombre: 'Hotel Colonial San Francisco',
      tipo: 'Hotel',
      categoria: 3,
      calidad: 'Relajación',
      direccion: 'Calle Sucre N4-56, Centro Histórico, Quito',
      ciudad: 'Quito',
      descripcion: 'Estructura colonial rehabilitada con espectaculares patios interiores empedrados. Desayuno tradicional quiteño incluido.',
      imagen: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
      fotosCount: 8,
      precio: 45,
      valoracion: 4.1,
      ratingTexto: 'Muy bueno',
      reviewsCount: 19,
      habitacionesDisponibles: 9,
      checkIn: '14:00',
      checkOut: '12:00',
      servicios: ['Wifi', 'Desayuno', 'Estacionamiento'],
      aceptaNinos: true,
      aceptaMascotas: false
    },
    {
      id: 7,
      nombre: 'Suite Luxury Cuenca Monumental',
      tipo: 'Apartamento',
      categoria: 4,
      calidad: 'Lujo',
      direccion: 'Calle Larga y Borrero, Cuenca · Azuay',
      ciudad: 'Cuenca',
      descripcion: 'Apartamento de gran nivel con vistas inigualables al Río Tomebamba. Totalmente amoblado con acabados de primera y calefacción central.',
      imagen: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80',
      fotosCount: 11,
      precio: 95,
      valoracion: 4.7,
      ratingTexto: 'Excelente',
      reviewsCount: 30,
      habitacionesDisponibles: 4,
      checkIn: '15:00',
      checkOut: '11:00',
      servicios: ['Wifi', 'Restaurante', 'Gimnasio'],
      aceptaNinos: true,
      aceptaMascotas: false
    },
    {
      id: 8,
      nombre: 'Hostería Relajación Cajas',
      tipo: 'Hostal',
      categoria: 3,
      calidad: 'Relajación',
      direccion: 'Vía al Cajas Km 22, Cuenca',
      ciudad: 'Cuenca',
      descripcion: 'Cabañas acogedoras con chimenea de leña rodeadas de la mística neblina andina, a minutos del Parque Nacional Cajas.',
      imagen: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
      fotosCount: 7,
      precio: 60,
      valoracion: 4.4,
      ratingTexto: 'Muy bueno',
      reviewsCount: 22,
      habitacionesDisponibles: 6,
      checkIn: '14:00',
      checkOut: '13:00',
      servicios: ['Wifi', 'Desayuno', 'Restaurante', 'Estacionamiento'],
      aceptaNinos: true,
      aceptaMascotas: true
    }
  ];

  // Listado final que se muestra al usuario (filtrado y ordenado)
  filteredLodgings: Lodging[] = [];

  // Paginación funcional
  currentPage: number = 1;
  itemsPerPage: number = 3;

  get totalPages(): number {
    return Math.ceil(this.filteredLodgings.length / this.itemsPerPage) || 1;
  }

  get paginatedLodgings(): Lodging[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredLodgings.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get pagesArray(): number[] {
    const arr = [];
    for (let i = 1; i <= this.totalPages; i++) {
      arr.push(i);
    }
    return arr;
  }

  // Variables de filtros en el Sidebar
  filtroPrecioMin: number = 0;
  filtroPrecioMax: number = 300;
  sliderPrecioMax: number = 300; // Mantenido por compatibilidad

  filtroEstrellas: { [key: number]: boolean } = {
    5: false,
    4: false,
    3: false,
    2: false,
    1: false
  };

  filtroTipos: { [key: string]: boolean } = {
    'Hotel': false,
    'Hostal': false,
    'Motel': false,
    'Apartamento': false
  };

  filtroInstalaciones: { [key: string]: boolean } = {
    'Piscina': false,
    'Wifi': false,
    'Spa': false,
    'Gimnasio': false,
    'Restaurante': false,
    'Estacionamiento': false
  };

  filtroNinos: boolean = false;
  filtroMascotas: boolean = false;

  // Filtros activos formateados para los Tags superiores
  activeTags: { label: string; type: string; value: any }[] = [];

  // Opción de ordenación
  sortOption: string = 'recomendados';

  ngOnInit(): void {
    // Calcular fecha de hoy
    const hoy = new Date();
    this.fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    this.route.queryParams.subscribe(params => {
      this.busqueda.destino = params['destino'] || '';
      this.busqueda.llegada = params['llegada'] || '';
      this.busqueda.salida = params['salida'] || '';
      this.busqueda.habitaciones = params['habitaciones'] ? +params['habitaciones'] : 1;
      this.busqueda.adultos = params['adultos'] ? +params['adultos'] : 2;
      this.busqueda.ninos = params['ninos'] ? +params['ninos'] : 0;

      // Si vienen del buscador con filtros iniciales
      if (this.busqueda.ninos > 0) {
        this.filtroNinos = true;
      }

      this.aplicarFiltros();
    });
  }

  validarBusqueda(campo: keyof typeof this.busquedaErrors): void {
    const hoyStr = this.fechaHoy;

    if (campo === 'destino') {
      this.busquedaErrors.destino = (!this.busqueda.destino || !this.busqueda.destino.trim())
        ? 'Por favor, ingresa un destino.'
        : '';
    }

    if (campo === 'llegada') {
      const lleg = this.busqueda.llegada;
      if (!lleg) {
        this.busquedaErrors.llegada = 'Selecciona una fecha de llegada.';
      } else if (lleg < hoyStr) {
        this.busquedaErrors.llegada = 'La fecha no puede ser anterior a hoy.';
      } else {
        this.busquedaErrors.llegada = '';
        if (this.busqueda.salida && this.busqueda.salida < lleg) {
          this.busquedaErrors.salida = 'La salida no puede ser antes de la llegada.';
        } else if (this.busqueda.salida && this.busqueda.salida >= lleg &&
                   this.busquedaErrors.salida === 'La salida no puede ser antes de la llegada.') {
          this.busquedaErrors.salida = '';
        }
      }
    }

    if (campo === 'salida') {
      const sal = this.busqueda.salida;
      const lleg = this.busqueda.llegada;
      if (!sal) {
        this.busquedaErrors.salida = 'Selecciona una fecha de salida.';
      } else if (sal < hoyStr) {
        this.busquedaErrors.salida = 'La fecha no puede ser anterior a hoy.';
      } else if (lleg && sal < lleg) {
        this.busquedaErrors.salida = 'La salida no puede ser antes de la llegada.';
      } else {
        this.busquedaErrors.salida = '';
      }
    }

    if (campo === 'habitaciones') {
      const val = this.busqueda.habitaciones;
      if (val === null || val === undefined || isNaN(Number(val))) {
        this.busquedaErrors.habitaciones = 'Ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.busquedaErrors.habitaciones = 'No se permiten números negativos.';
      } else if (Number(val) === 0) {
        this.busquedaErrors.habitaciones = 'Mínimo 1 habitación.';
      } else {
        this.busquedaErrors.habitaciones = '';
      }
    }

    if (campo === 'adultos') {
      const val = this.busqueda.adultos;
      if (val === null || val === undefined || isNaN(Number(val))) {
        this.busquedaErrors.adultos = 'Ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.busquedaErrors.adultos = 'No se permiten números negativos.';
      } else if (Number(val) === 0) {
        this.busquedaErrors.adultos = 'Mínimo 1 adulto.';
      } else {
        this.busquedaErrors.adultos = '';
      }
    }

    if (campo === 'ninos') {
      const val = this.busqueda.ninos;
      if (val === null || val === undefined || isNaN(Number(val))) {
        this.busquedaErrors.ninos = 'Ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.busquedaErrors.ninos = 'No se permiten números negativos.';
      } else {
        this.busquedaErrors.ninos = '';
      }
    }
  }

  validarTodaBusqueda(): boolean {
    (['destino', 'llegada', 'salida', 'habitaciones', 'adultos', 'ninos'] as const)
      .forEach(c => this.validarBusqueda(c));
    return !Object.values(this.busquedaErrors).some(e => e !== '');
  }

  // Deslizador de rango dual
  onMinPriceInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = +target.value;
    if (val > this.filtroPrecioMax) {
      this.filtroPrecioMin = this.filtroPrecioMax;
    } else {
      this.filtroPrecioMin = val;
    }
    this.aplicarFiltros();
  }

  onMaxPriceInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = +target.value;
    if (val < this.filtroPrecioMin) {
      this.filtroPrecioMax = this.filtroPrecioMin;
    } else {
      this.filtroPrecioMax = val;
    }
    this.aplicarFiltros();
  }

  onPrecioMinChange(): void {
    if (this.filtroPrecioMin < 0) this.filtroPrecioMin = 0;
    if (this.filtroPrecioMin > this.filtroPrecioMax) {
      this.filtroPrecioMin = this.filtroPrecioMax;
    }
    this.aplicarFiltros();
  }

  onPrecioMaxChange(): void {
    if (this.filtroPrecioMax > 300) this.filtroPrecioMax = 300;
    if (this.filtroPrecioMax < this.filtroPrecioMin) {
      this.filtroPrecioMax = this.filtroPrecioMin;
    }
    this.sliderPrecioMax = this.filtroPrecioMax;
    this.aplicarFiltros();
  }

  getMinPercent(): number {
    return (this.filtroPrecioMin / 300) * 100;
  }

  getMaxPercent(): number {
    return (this.filtroPrecioMax / 300) * 100;
  }

  toggleEstrella(estrella: number): void {
    this.filtroEstrellas[estrella] = !this.filtroEstrellas[estrella];
    this.aplicarFiltros();
  }

  toggleTipo(tipo: string): void {
    this.filtroTipos[tipo] = !this.filtroTipos[tipo];
    this.aplicarFiltros();
  }

  toggleInstalacion(inst: string): void {
    this.filtroInstalaciones[inst] = !this.filtroInstalaciones[inst];
    this.aplicarFiltros();
  }

  toggleNinos(): void {
    this.filtroNinos = !this.filtroNinos;
    this.aplicarFiltros();
  }

  toggleMascotas(): void {
    this.filtroMascotas = !this.filtroMascotas;
    this.aplicarFiltros();
  }

  // Aplica todos los criterios acumulados sobre el dataset
  aplicarFiltros(): void {
    this.currentPage = 1;
    let result = [...this.lodgings];

    // 1. Filtrar por Destino (Ciudad / Dirección)
    if (this.busqueda.destino.trim()) {
      const query = this.busqueda.destino.toLowerCase().trim();
      result = result.filter(h =>
        h.ciudad.toLowerCase().includes(query) ||
        h.nombre.toLowerCase().includes(query) ||
        h.direccion.toLowerCase().includes(query)
      );
    }

    // 2. Filtrar por Rango de Precios
    result = result.filter(h => h.precio >= this.filtroPrecioMin && h.precio <= this.filtroPrecioMax);

    // 3. Filtrar por Estrellas (si hay alguna seleccionada)
    const estrellasSeleccionadas = Object.keys(this.filtroEstrellas)
      .map(Number)
      .filter(key => this.filtroEstrellas[key]);
    if (estrellasSeleccionadas.length > 0) {
      result = result.filter(h => estrellasSeleccionadas.includes(h.categoria));
    }

    // 4. Filtrar por Tipo de Alojamiento (si hay alguno seleccionado)
    const tiposSeleccionados = Object.keys(this.filtroTipos)
      .filter(key => this.filtroTipos[key]);
    if (tiposSeleccionados.length > 0) {
      result = result.filter(h => tiposSeleccionados.includes(h.tipo));
    }

    // 5. Filtrar por Instalaciones / Servicios (debe cumplir TODOS los seleccionados)
    const serviciosSeleccionados = Object.keys(this.filtroInstalaciones)
      .filter(key => this.filtroInstalaciones[key]);
    if (serviciosSeleccionados.length > 0) {
      result = result.filter(h =>
        serviciosSeleccionados.every(serv => h.servicios.includes(serv))
      );
    }

    // 6. Filtrar por Aceptación de Niños
    if (this.filtroNinos) {
      result = result.filter(h => h.aceptaNinos);
    }

    // 7. Filtrar por Aceptación de Mascotas
    if (this.filtroMascotas) {
      result = result.filter(h => h.aceptaMascotas);
    }

    // Ordenar los resultados
    this.ordenarResultados(result);

    // Actualizar tags de filtros activos
    this.generarTagsActivos();
  }

  // Ordena la lista de acuerdo a la opción seleccionada
  ordenarResultados(lista: Lodging[]): void {
    if (this.sortOption === 'precio_asc') {
      lista.sort((a, b) => a.precio - b.precio);
    } else if (this.sortOption === 'precio_desc') {
      lista.sort((a, b) => b.precio - a.precio);
    } else if (this.sortOption === 'valoracion') {
      lista.sort((a, b) => b.valoracion - a.valoracion);
    } else if (this.sortOption === 'nombre') {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else {
      // 'recomendados' - Combina valoración alta y precio razonable
      lista.sort((a, b) => (b.valoracion * 100 - b.precio) - (a.valoracion * 100 - a.precio));
    }
    this.filteredLodgings = lista;
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOption = select.value;
    this.aplicarFiltros();
  }

  // Construye la lista de etiquetas que aparecen debajo de la cabecera
  generarTagsActivos(): void {
    const tags = [];

    // Tag de Precio
    if (this.filtroPrecioMin > 0 || this.filtroPrecioMax < 300) {
      tags.push({
        label: `$${this.filtroPrecioMin} – $${this.filtroPrecioMax} / noche`,
        type: 'precio',
        value: null
      });
    }

    // Tags de estrellas
    Object.keys(this.filtroEstrellas).forEach(e => {
      const estr = +e;
      if (this.filtroEstrellas[estr]) {
        tags.push({
          label: `${estr} Estrella${estr > 1 ? 's' : ''}`,
          type: 'estrella',
          value: estr
        });
      }
    });

    // Tags de tipo de alojamiento
    Object.keys(this.filtroTipos).forEach(t => {
      if (this.filtroTipos[t]) {
        tags.push({
          label: t,
          type: 'tipo',
          value: t
        });
      }
    });

    // Tags de instalaciones
    Object.keys(this.filtroInstalaciones).forEach(i => {
      if (this.filtroInstalaciones[i]) {
        tags.push({
          label: i,
          type: 'instalacion',
          value: i
        });
      }
    });

    // Tag acepta niños
    if (this.filtroNinos) {
      tags.push({
        label: 'Acepta niños',
        type: 'ninos',
        value: null
      });
    }

    // Tag acepta mascotas
    if (this.filtroMascotas) {
      tags.push({
        label: 'Mascotas permitidas',
        type: 'mascotas',
        value: null
      });
    }

    this.activeTags = tags;
  }

  // Quita un filtro específico a través de su tag
  removerTag(tag: { label: string; type: string; value: any }): void {
    if (tag.type === 'precio') {
      this.filtroPrecioMin = 0;
      this.filtroPrecioMax = 300;
      this.sliderPrecioMax = 300;
    } else if (tag.type === 'estrella') {
      this.filtroEstrellas[tag.value] = false;
    } else if (tag.type === 'tipo') {
      this.filtroTipos[tag.value] = false;
    } else if (tag.type === 'instalacion') {
      this.filtroInstalaciones[tag.value] = false;
    } else if (tag.type === 'ninos') {
      this.filtroNinos = false;
    } else if (tag.type === 'mascotas') {
      this.filtroMascotas = false;
    }
    this.aplicarFiltros();
  }

  // Limpia absolutamente todos los filtros secundarios
  limpiarFiltros(): void {
    this.filtroPrecioMin = 0;
    this.filtroPrecioMax = 300;
    this.sliderPrecioMax = 300;

    Object.keys(this.filtroEstrellas).forEach(k => this.filtroEstrellas[+k] = false);
    Object.keys(this.filtroTipos).forEach(k => this.filtroTipos[k] = false);
    Object.keys(this.filtroInstalaciones).forEach(k => this.filtroInstalaciones[k] = false);

    this.filtroNinos = false;
    this.filtroMascotas = false;

    this.aplicarFiltros();
  }

  // Acción para cambiar estado favorito de un hotel
  toggleFavorito(lodging: Lodging, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    lodging.favorito = !lodging.favorito;
  }

  // Ejecuta una nueva búsqueda actualizando la URL con queryParams
  buscarNuevaBusqueda(): void {
    if (!this.validarTodaBusqueda()) return;
    const { destino, llegada, salida, habitaciones, adultos, ninos } = this.busqueda;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        destino: (destino || '').trim(),
        llegada: llegada || '',
        salida: salida || '',
        habitaciones,
        adultos,
        ninos
      },
      queryParamsHandling: 'merge'
    });
  }

  // Métodos de control para la paginación funcional
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  firstPage(): void {
    this.currentPage = 1;
  }

  lastPage(): void {
    this.currentPage = this.totalPages;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Generación rápida de array para pintar estrellas
  getEstrellasArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getEstrellasVaciasArray(count: number): number[] {
    return Array(5 - count).fill(0);
  }
}
