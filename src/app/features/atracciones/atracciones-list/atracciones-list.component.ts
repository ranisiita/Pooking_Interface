import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';

export interface Disponibilidad {
  disponible: boolean;
  disponible_hoy: boolean;
  proxima_fecha_disponible: string;
  cupos_disponibles: number;
}

export interface Atraccion {
  id: string;
  nombre: string;
  ciudad: string;
  pais: string;
  tipo_tagname: string;
  tipo_nombre: string;
  subtipo_tagname: string;
  subtipo_nombre: string;
  etiquetas: string[];
  descripcion_corta: string;
  imagen_principal: string;
  duracion_minutos: number;
  precio_desde: number;
  moneda: string;
  calificacion: number;
  total_resenas: number;
  idiomas_disponibles: string[];
  disponibilidad: Disponibilidad;
  // Campo auxiliar SOLO para el mock: permite filtrar por franja horaria
  // localmente. En la API real esto se derivaría de GET /atracciones/{guid}/horarios.
  franjas_horario: string[];
}

type Ordenamiento = 'recomendados' | 'trending' | 'lowest_price' | 'highest_weighted_rating';

// TODO(API): cuando se integre el backend, reemplazar ATRACCIONES_MOCK por una
// llamada a GET /api/v2/atracciones a traves de un AtraccionesService dedicado
// (src/app/features/atracciones/services/). Por ahora todo es local/mock.
const ATRACCIONES_MOCK: Atraccion[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    nombre: 'Tour Centro Histórico de Quito',
    ciudad: 'Quito',
    pais: 'Ecuador',
    tipo_tagname: 'tours',
    tipo_nombre: 'Tours',
    subtipo_tagname: 'tours-ciudad',
    subtipo_nombre: 'Tours de ciudad',
    etiquetas: ['free_cancellation'],
    descripcion_corta: 'Recorrido guiado por plazas, iglesias y miradores del casco colonial.',
    imagen_principal: 'https://picsum.photos/seed/quito-centro/640/420',
    duracion_minutos: 180,
    precio_desde: 25.0,
    moneda: 'USD',
    calificacion: 4.5,
    total_resenas: 132,
    idiomas_disponibles: ['es', 'en'],
    disponibilidad: {
      disponible: true,
      disponible_hoy: true,
      proxima_fecha_disponible: '2030-01-01',
      cupos_disponibles: 10,
    },
    franjas_horario: ['05:00-12:00', '12:00-18:00'],
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    nombre: 'Mitad del Mundo y Museo Intiñán',
    ciudad: 'Quito',
    pais: 'Ecuador',
    tipo_tagname: 'museos',
    tipo_nombre: 'Museos',
    subtipo_tagname: 'museos-ciencia',
    subtipo_nombre: 'Museos de ciencia',
    etiquetas: ['free_cancellation', 'skip_the_line'],
    descripcion_corta: 'Visita la línea ecuatorial y los experimentos del museo etnográfico Intiñán.',
    imagen_principal: 'https://picsum.photos/seed/mitad-mundo/640/420',
    duracion_minutos: 240,
    precio_desde: 32.5,
    moneda: 'USD',
    calificacion: 4.2,
    total_resenas: 87,
    idiomas_disponibles: ['es', 'en', 'fr'],
    disponibilidad: {
      disponible: true,
      disponible_hoy: false,
      proxima_fecha_disponible: '2030-01-03',
      cupos_disponibles: 6,
    },
    franjas_horario: ['05:00-12:00', '12:00-18:00'],
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    nombre: 'Teleférico de Quito',
    ciudad: 'Quito',
    pais: 'Ecuador',
    tipo_tagname: 'naturaleza-aventura',
    tipo_nombre: 'Naturaleza y aventura',
    subtipo_tagname: 'naturaleza-miradores',
    subtipo_nombre: 'Miradores y teleféricos',
    etiquetas: ['skip_the_line'],
    descripcion_corta: 'Asciende al Pichincha y disfruta de vistas panorámicas de toda la ciudad.',
    imagen_principal: 'https://picsum.photos/seed/teleferico-quito/640/420',
    duracion_minutos: 120,
    precio_desde: 18.0,
    moneda: 'USD',
    calificacion: 4.7,
    total_resenas: 215,
    idiomas_disponibles: ['es', 'en'],
    disponibilidad: {
      disponible: true,
      disponible_hoy: true,
      proxima_fecha_disponible: '2030-01-01',
      cupos_disponibles: 24,
    },
    franjas_horario: ['05:00-12:00', '12:00-18:00', '18:00-05:00'],
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    nombre: 'Tour gastronómico en Quito',
    ciudad: 'Quito',
    pais: 'Ecuador',
    tipo_tagname: 'gastronomia',
    tipo_nombre: 'Gastronomía',
    subtipo_tagname: 'gastronomia-tours',
    subtipo_nombre: 'Tours gastronómicos',
    etiquetas: ['free_cancellation'],
    descripcion_corta: 'Degustación de platos típicos y mercados tradicionales con un guía local.',
    imagen_principal: 'https://picsum.photos/seed/gastro-quito/640/420',
    duracion_minutos: 150,
    precio_desde: 40.0,
    moneda: 'USD',
    calificacion: 4.8,
    total_resenas: 64,
    idiomas_disponibles: ['es'],
    disponibilidad: {
      disponible: false,
      disponible_hoy: false,
      proxima_fecha_disponible: '2030-02-10',
      cupos_disponibles: 0,
    },
    franjas_horario: ['12:00-18:00', '18:00-05:00'],
  },
  {
    id: '40000000-0000-0000-0000-000000000005',
    nombre: 'Excursión a Otavalo',
    ciudad: 'Otavalo',
    pais: 'Ecuador',
    tipo_tagname: 'tours',
    tipo_nombre: 'Tours',
    subtipo_tagname: 'tours-excursiones',
    subtipo_nombre: 'Excursiones de día completo',
    etiquetas: ['free_cancellation', 'skip_the_line'],
    descripcion_corta: 'Visita el mercado artesanal más grande de los Andes y la cascada de Peguche.',
    imagen_principal: 'https://picsum.photos/seed/otavalo/640/420',
    duracion_minutos: 480,
    precio_desde: 55.0,
    moneda: 'USD',
    calificacion: 4.6,
    total_resenas: 98,
    idiomas_disponibles: ['es', 'en', 'de'],
    disponibilidad: {
      disponible: true,
      disponible_hoy: false,
      proxima_fecha_disponible: '2030-01-05',
      cupos_disponibles: 12,
    },
    franjas_horario: ['05:00-12:00'],
  },
];

const ETIQUETA_LABELS: Record<string, string> = {
  free_cancellation: 'Cancelación gratuita',
  skip_the_line: 'Sin fila',
};

const IDIOMA_LABELS: Record<string, string> = {
  en: 'Inglés',
  es: 'Español',
  fr: 'Francés',
  it: 'Italiano',
  de: 'Alemán',
  ru: 'Ruso',
  pt: 'Portugués',
  ja: 'Japonés',
  ar: 'Árabe',
  pl: 'Polaco',
};

@Component({
  selector: 'app-atracciones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './atracciones-list.component.html',
  styleUrls: ['./atracciones-list.component.css'],
})
export class AtraccionesListComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly atracciones = signal<Atraccion[]>(ATRACCIONES_MOCK);

  // ── Opciones de filtro (contrato GET /api/v2/atracciones) ──
  readonly categoriasFiltro = [
    { tagname: 'tours', nombre: 'Tours', icon: 'tour' },
    { tagname: 'naturaleza-aventura', nombre: 'Naturaleza y aventura', icon: 'hiking' },
    { tagname: 'gastronomia', nombre: 'Gastronomía', icon: 'restaurant' },
    { tagname: 'museos', nombre: 'Museos', icon: 'museum' },
  ];
  readonly etiquetasFiltro = [
    { tagname: 'free_cancellation', label: 'Cancelación gratuita', icon: 'event_available' },
    { tagname: 'skip_the_line', label: 'Sin fila', icon: 'bolt' },
  ];
  readonly calificacionesFiltro = [4.5, 4.0, 3.5, 3.0];
  readonly horariosFiltro = [
    { tag: '05:00-12:00', label: 'Mañana', icon: 'wb_sunny' },
    { tag: '12:00-18:00', label: 'Tarde', icon: 'wb_twilight' },
    { tag: '18:00-05:00', label: 'Noche', icon: 'nightlight' },
  ];

  // ── Buscador del hero (formulario, se aplica al pulsar "Buscar") ──
  busqueda = { ciudad: '', fecha: '', tipo: '' };

  // Fecha actual (yyyy-MM-dd): bloquea fechas pasadas en el buscador.
  today = new Date().toISOString().split('T')[0];
  errorFecha = '';

  // ── Criterios aplicados al listado ───────────────────────
  criterioCiudad = signal('');
  criterioFecha = signal('');

  // ── Ordenamiento (barra de resumen) ──────────────────────
  ordenamiento = signal<Ordenamiento>('recomendados');

  // ── Filtros del panel lateral ────────────────────────────
  filtroCategorias = signal<Record<string, boolean>>(this.crearMapaCategorias());
  filtroEtiquetas = signal<Record<string, boolean>>({
    free_cancellation: false,
    skip_the_line: false,
  });
  filtroCalificacionMin = signal(0);
  filtroHorarios = signal<Record<string, boolean>>({
    '05:00-12:00': false,
    '12:00-18:00': false,
    '18:00-05:00': false,
  });
  filtroIdiomas = signal<Record<string, boolean>>({});
  soloDisponibles = signal(false);

  // ── Idiomas disponibles, derivados del dataset (como el contrato) ──
  readonly idiomasDisponibles = computed(() => {
    const set = new Set<string>();
    for (const a of this.atracciones()) {
      for (const idi of a.idiomas_disponibles) set.add(idi);
    }
    return Array.from(set);
  });

  // ── Listado filtrado y ordenado (local, sin API) ─────────
  readonly atraccionesFiltradas = computed<Atraccion[]>(() => {
    const ciudad = this.criterioCiudad().trim().toLowerCase();

    const categorias = this.activos(this.filtroCategorias());
    const etiquetas = this.activos(this.filtroEtiquetas());
    const horarios = this.activos(this.filtroHorarios());
    const idiomas = this.activos(this.filtroIdiomas());
    const calMin = this.filtroCalificacionMin();
    const soloDisp = this.soloDisponibles();

    let items = this.atracciones().filter((a) => {
      if (ciudad && !a.ciudad.toLowerCase().includes(ciudad)) return false;
      if (categorias.length && !categorias.includes(a.tipo_tagname)) return false;
      if (etiquetas.length && !etiquetas.every((e) => a.etiquetas.includes(e))) return false;
      if (calMin && a.calificacion < calMin) return false;
      if (horarios.length && !horarios.some((h) => a.franjas_horario.includes(h))) return false;
      if (idiomas.length && !idiomas.some((i) => a.idiomas_disponibles.includes(i))) return false;
      if (soloDisp && !a.disponibilidad.disponible) return false;
      return true;
    });

    const orden = this.ordenamiento();
    items = [...items];
    if (orden === 'lowest_price') {
      items.sort((a, b) => a.precio_desde - b.precio_desde);
    } else if (orden === 'highest_weighted_rating') {
      items.sort((a, b) => b.calificacion - a.calificacion);
    } else if (orden === 'trending') {
      items.sort((a, b) => b.total_resenas - a.total_resenas);
    } else {
      // 'recomendados': combina calificación alta y popularidad
      items.sort((a, b) => this.puntajeRecomendado(b) - this.puntajeRecomendado(a));
    }
    return items;
  });

  readonly totalResultados = computed(() => this.atraccionesFiltradas().length);

  ngOnInit(): void {
    // Inicializa el mapa de idiomas una vez conocidos los del dataset
    const mapaIdiomas: Record<string, boolean> = {};
    for (const idi of this.idiomasDisponibles()) mapaIdiomas[idi] = false;
    this.filtroIdiomas.set(mapaIdiomas);

    this.route.queryParams.subscribe((params) => {
      const ciudad = params['ciudad'] ?? '';
      const fecha = params['fecha'] ?? '';
      const tipo = params['tipo'] ?? '';
      this.busqueda = { ciudad, fecha, tipo };
      this.criterioCiudad.set(ciudad);
      this.criterioFecha.set(fecha);
      this.filtroCategorias.set(this.crearMapaCategorias(tipo));
    });
  }

  // ── Buscador del hero ────────────────────────────────────
  onFechaChange(): void {
    if (!this.busqueda.fecha || this.busqueda.fecha >= this.today) {
      this.errorFecha = '';
    }
  }

  buscar(): void {
    if (this.busqueda.fecha && this.busqueda.fecha < this.today) {
      this.errorFecha = 'No puedes buscar con una fecha anterior a la actual.';
      return;
    }
    this.errorFecha = '';

    this.criterioCiudad.set(this.busqueda.ciudad);
    this.criterioFecha.set(this.busqueda.fecha);
    this.filtroCategorias.set(this.crearMapaCategorias(this.busqueda.tipo));

    const queryParams: Record<string, string> = {};
    if (this.busqueda.ciudad.trim()) queryParams['ciudad'] = this.busqueda.ciudad.trim();
    if (this.busqueda.fecha) queryParams['fecha'] = this.busqueda.fecha;
    if (this.busqueda.tipo) queryParams['tipo'] = this.busqueda.tipo;
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }

  // ── Filtros del panel lateral ────────────────────────────
  toggleCategoria(tagname: string): void {
    this.filtroCategorias.update((m) => ({ ...m, [tagname]: !m[tagname] }));
  }

  toggleEtiqueta(tagname: string): void {
    this.filtroEtiquetas.update((m) => ({ ...m, [tagname]: !m[tagname] }));
  }

  toggleHorario(tag: string): void {
    this.filtroHorarios.update((m) => ({ ...m, [tag]: !m[tag] }));
  }

  toggleIdioma(tag: string): void {
    this.filtroIdiomas.update((m) => ({ ...m, [tag]: !m[tag] }));
  }

  setCalificacionMin(valor: number): void {
    this.filtroCalificacionMin.update((actual) => (actual === valor ? 0 : valor));
  }

  limpiarFiltros(): void {
    this.filtroCategorias.set(this.crearMapaCategorias());
    this.filtroEtiquetas.set({ free_cancellation: false, skip_the_line: false });
    this.filtroCalificacionMin.set(0);
    this.filtroHorarios.set({ '05:00-12:00': false, '12:00-18:00': false, '18:00-05:00': false });
    const mapaIdiomas: Record<string, boolean> = {};
    for (const idi of this.idiomasDisponibles()) mapaIdiomas[idi] = false;
    this.filtroIdiomas.set(mapaIdiomas);
    this.soloDisponibles.set(false);
  }

  get hayFiltrosActivos(): boolean {
    return (
      this.activos(this.filtroCategorias()).length > 0 ||
      this.activos(this.filtroEtiquetas()).length > 0 ||
      this.activos(this.filtroHorarios()).length > 0 ||
      this.activos(this.filtroIdiomas()).length > 0 ||
      this.filtroCalificacionMin() > 0 ||
      this.soloDisponibles()
    );
  }

  // ── Helpers de presentación ──────────────────────────────
  formatearDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const min = minutos % 60;
    if (horas === 0) return `${min} min`;
    return min > 0 ? `${horas} h ${min} min` : `${horas} h`;
  }

  etiquetaLabel(tagname: string): string {
    return ETIQUETA_LABELS[tagname] ?? tagname;
  }

  idiomaLabel(tagname: string): string {
    return IDIOMA_LABELS[tagname] ?? tagname.toUpperCase();
  }

  // ── Acciones de tarjeta ──────────────────────────────────
  verDetalle(atraccion: Atraccion): void {
    // TODO: la pantalla de detalle (atracciones-detail) aún no existe.
    // Se conectará después con la ruta /atracciones/:id.
    this.router.navigate(['/atracciones', atraccion.id]);
  }

  seleccionar(atraccion: Atraccion): void {
    // TODO: el flujo de reserva (POST /api/v2/reservas) se implementará después.
    // Por ahora redirige al detalle, donde vivirá la selección de horario y tickets.
    this.router.navigate(['/atracciones', atraccion.id]);
  }

  // ── Utilidades internas ──────────────────────────────────
  private activos(mapa: Record<string, boolean>): string[] {
    return Object.keys(mapa).filter((k) => mapa[k]);
  }

  private crearMapaCategorias(activa = ''): Record<string, boolean> {
    const mapa: Record<string, boolean> = {};
    for (const c of this.categoriasFiltro) mapa[c.tagname] = c.tagname === activa;
    return mapa;
  }

  private puntajeRecomendado(a: Atraccion): number {
    return a.calificacion * 20 + Math.min(a.total_resenas, 300) / 10;
  }
}
