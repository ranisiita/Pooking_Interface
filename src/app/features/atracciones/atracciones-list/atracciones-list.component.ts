import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { AtraccionesService } from '../services/atracciones.service';
import {
  Atraccion,
  AtraccionesListResponse,
  AtraccionesQuery,
  FilterStats,
  FilterOption,
  FiltrosData,
  Pagination,
  Sorter,
} from '../models/atracciones.models';

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
  private svc = inject(AtraccionesService);

  // ── Estado del listado ───────────────────────────────────
  loading = signal(true);
  error = signal<string | null>(null);
  response = signal<AtraccionesListResponse | null>(null);
  filtros = signal<FiltrosData | null>(null);
  filtrosLoading = signal(true);

  // Derivados
  readonly atracciones = computed<Atraccion[]>(() => this.response()?.data ?? []);
  readonly pagination = computed<Pagination | null>(() => this.response()?.pagination ?? null);
  readonly filterStats = computed<FilterStats | null>(
    () => this.response()?.filterStats ?? null,
  );
  readonly sorters = computed<Sorter[]>(() => this.response()?.sorters ?? []);

  // ── Buscador del hero (formulario, se aplica al pulsar "Buscar") ──
  busqueda = { ciudad: '', fecha: '', tipo: '' };
  today = new Date().toISOString().split('T')[0];
  errorFecha = '';

  // ── Filtros aplicados (single-value, según contrato) ────
  filtroDestino = signal<string | null>(null); // tagname
  filtroTipo = signal<string | null>(null);
  filtroEtiqueta = signal<string | null>(null);
  filtroCalificacionMin = signal<number | null>(null);
  filtroHoraInicio = signal<string | null>(null);
  filtroIdioma = signal<string | null>(null);
  filtroSoloDisponibles = signal(false);

  // ── Paginación y orden ──────────────────────────────────
  ordenarPor = signal<string>('trending');
  page = signal(1);
  readonly limit = 4;

  ngOnInit(): void {
    this.cargarFiltros();

    // Lectura inicial de queryParams: solo siembra el formulario del hero.
    // Los filtros laterales tagname-based los gestiona el sidebar.
    const params = this.route.snapshot.queryParamMap;
    this.busqueda = {
      ciudad: params.get('ciudad') ?? '',
      fecha: params.get('fecha') ?? '',
      tipo: params.get('tipo') ?? '',
    };
    if (this.busqueda.tipo) this.filtroTipo.set(this.busqueda.tipo);

    this.aplicarFiltros();
  }

  // ── Carga de opciones de filtro (GET /atracciones/filtros) ──
  cargarFiltros(): void {
    this.filtrosLoading.set(true);
    this.svc.getFiltros().subscribe({
      next: (resp) => {
        this.filtros.set(resp.data);
        this.filtrosLoading.set(false);
      },
      error: () => {
        this.filtros.set(null);
        this.filtrosLoading.set(false);
      },
    });
  }

  // ── Listado (GET /atracciones) ──────────────────────────
  aplicarFiltros(): void {
    this.loading.set(true);
    this.error.set(null);
    const query = this.armarQuery();
    this.svc.getAtracciones(query).subscribe({
      next: (resp) => {
        this.response.set(resp);
        // Si la API devuelve un defaultSorter distinto y aún no hemos elegido
        // orden, lo respetamos. Útil cuando se conecte el backend real.
        if (!this.ordenarPor() && resp.defaultSorter) {
          this.ordenarPor.set(resp.defaultSorter.value);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar las atracciones. Inténtalo de nuevo.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Construye los query params usando tagname donde aplica.
   * Listo para reemplazar el mock por HttpClient.params en el futuro.
   */
  armarQuery(): AtraccionesQuery {
    const q: AtraccionesQuery = {
      ordenar_por: this.ordenarPor(),
      page: this.page(),
      limit: this.limit,
    };
    // ciudad: prioriza el tagname seleccionado en el sidebar; si no, usa el
    // texto del hero (la API real ignorará texto libre que no sea tagname).
    if (this.filtroDestino()) {
      q.ciudad = this.filtroDestino()!;
    } else if (this.busqueda.ciudad.trim()) {
      q.ciudad = this.busqueda.ciudad.trim();
    }
    if (this.filtroTipo()) q.tipo = this.filtroTipo()!;
    if (this.filtroEtiqueta()) q.etiqueta = this.filtroEtiqueta()!;
    if (this.filtroCalificacionMin() != null) q.calificacion_min = this.filtroCalificacionMin()!;
    if (this.filtroHoraInicio()) q.hora_inicio = this.filtroHoraInicio()!;
    if (this.filtroIdioma()) q.idioma = this.filtroIdioma()!;
    if (this.filtroSoloDisponibles()) q.disponible = true;
    return q;
  }

  // ── Hero search ─────────────────────────────────────────
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

    // Mapea el texto del hero a tagname si coincide con un destinationFilter.
    const tagDestino = this.tagnameDeDestino(this.busqueda.ciudad);
    this.filtroDestino.set(tagDestino);
    this.filtroTipo.set(this.busqueda.tipo || null);
    this.page.set(1);

    const queryParams: Record<string, string> = {};
    if (this.busqueda.ciudad.trim()) queryParams['ciudad'] = this.busqueda.ciudad.trim();
    if (this.busqueda.fecha) queryParams['fecha'] = this.busqueda.fecha;
    if (this.busqueda.tipo) queryParams['tipo'] = this.busqueda.tipo;
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });

    this.aplicarFiltros();
  }

  // ── Toggles del sidebar (single-value por contrato) ────
  toggleDestino(opt: FilterOption): void {
    if (opt.productCount === 0) return;
    this.filtroDestino.update((v) => (v === opt.tagname ? null : opt.tagname));
    // Mantiene el texto del hero sincronizado con la selección lateral.
    this.busqueda.ciudad = this.filtroDestino() ? opt.name : '';
    this.page.set(1);
    this.aplicarFiltros();
  }

  toggleTipo(opt: FilterOption): void {
    if (opt.productCount === 0) return;
    this.filtroTipo.update((v) => (v === opt.tagname ? null : opt.tagname));
    this.busqueda.tipo = this.filtroTipo() ?? '';
    this.page.set(1);
    this.aplicarFiltros();
  }

  toggleEtiqueta(opt: FilterOption): void {
    if (opt.productCount === 0) return;
    this.filtroEtiqueta.update((v) => (v === opt.tagname ? null : opt.tagname));
    this.page.set(1);
    this.aplicarFiltros();
  }

  toggleCalificacion(opt: FilterOption): void {
    if (opt.productCount === 0) return;
    const valor = Number(opt.tagname);
    this.filtroCalificacionMin.update((v) => (v === valor ? null : valor));
    this.page.set(1);
    this.aplicarFiltros();
  }

  toggleHora(opt: FilterOption): void {
    if (opt.productCount === 0) return;
    this.filtroHoraInicio.update((v) => (v === opt.tagname ? null : opt.tagname));
    this.page.set(1);
    this.aplicarFiltros();
  }

  toggleIdioma(opt: FilterOption): void {
    if (opt.productCount === 0) return;
    this.filtroIdioma.update((v) => (v === opt.tagname ? null : opt.tagname));
    this.page.set(1);
    this.aplicarFiltros();
  }

  toggleSoloDisponibles(): void {
    this.filtroSoloDisponibles.update((v) => !v);
    this.page.set(1);
    this.aplicarFiltros();
  }

  // ── Orden y paginación ─────────────────────────────────
  setOrden(value: string): void {
    if (this.ordenarPor() === value) return;
    this.ordenarPor.set(value);
    this.page.set(1);
    this.aplicarFiltros();
  }

  setPage(p: number): void {
    const total = this.pagination()?.total_pages ?? 1;
    const n = Math.max(1, Math.min(total, p));
    if (n === this.page()) return;
    this.page.set(n);
    this.aplicarFiltros();
  }

  // ── Misc ───────────────────────────────────────────────
  get hayFiltrosActivos(): boolean {
    return !!(
      this.filtroDestino() ||
      this.filtroTipo() ||
      this.filtroEtiqueta() ||
      this.filtroCalificacionMin() != null ||
      this.filtroHoraInicio() ||
      this.filtroIdioma() ||
      this.filtroSoloDisponibles()
    );
  }

  limpiarFiltros(): void {
    this.filtroDestino.set(null);
    this.filtroTipo.set(null);
    this.filtroEtiqueta.set(null);
    this.filtroCalificacionMin.set(null);
    this.filtroHoraInicio.set(null);
    this.filtroIdioma.set(null);
    this.filtroSoloDisponibles.set(false);
    this.busqueda.tipo = '';
    this.busqueda.ciudad = '';
    this.page.set(1);
    this.aplicarFiltros();
  }

  reintentar(): void {
    this.aplicarFiltros();
  }

  formatearDuracion(min: number): string {
    const horas = Math.floor(min / 60);
    const m = min % 60;
    if (horas === 0) return `${m} min`;
    return m > 0 ? `${horas} h ${m} min` : `${horas} h`;
  }

  idiomaLabel(tag: string): string {
    // 1) Prioriza el `name` que devuelve el backend en /filtros — el contrato
    //    no garantiza que el tagname sea siempre ISO 639-1 (`es`, `en`), puede
    //    venir `español`, `inglés`, etc. Usamos lo que diga el backend.
    const fromApi = this.filtros()?.supportedLanguageFilters?.find((f) => f.tagname === tag);
    if (fromApi?.name) return fromApi.name;
    // 2) Fallback: mapa local de códigos ISO comunes.
    if (IDIOMA_LABELS[tag]) return IDIOMA_LABELS[tag];
    // 3) Último recurso: el tag tal cual lo entregó la API.
    return tag;
  }

  /** Devuelve el `name` legible de un destinationFilter dado su tagname. */
  destinoNombre(tagname: string): string {
    const lista = this.filtros()?.destinationFilters ?? [];
    return lista.find((d) => d.tagname === tagname)?.name ?? tagname;
  }

  /** Devuelve el `name` legible de un labelFilter dado su tagname. */
  etiquetaNombre(tagname: string): string {
    const lista = this.filtros()?.labelFilters ?? [];
    return lista.find((e) => e.tagname === tagname)?.name ?? tagname;
  }

  verDetalle(a: Atraccion): void {
    // TODO: la pantalla de detalle (atracciones-detail) aún no existe.
    // Cuando se conecte la API real puede usarse `a._links.self` o el `id`.
    this.router.navigate(['/atracciones', a.id]);
  }

  seleccionar(a: Atraccion): void {
    // TODO: el flujo de reserva (POST /api/v2/reservas) se implementará después.
    this.router.navigate(['/atracciones', a.id]);
  }

  // ── Utilidades internas ────────────────────────────────
  private tagnameDeDestino(text: string): string | null {
    const t = text.trim().toLowerCase();
    if (!t) return null;
    const lista = this.filtros()?.destinationFilters ?? [];
    const m = lista.find((f) => f.name.toLowerCase() === t || f.tagname === t);
    return m?.tagname ?? null;
  }
}
