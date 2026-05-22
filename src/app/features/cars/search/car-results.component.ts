import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import {
  VehicleItem,
  CriteriosBusquedaAutos,
} from '../shared/car.models';
import {
  VEHICULOS_MOCK,
  LOCALIZACIONES_MOCK,
  CATEGORIAS_MOCK,
} from '../shared/car-mock.data';

@Component({
  selector: 'app-car-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './car-results.component.html',
  styleUrls: ['./car-results.component.css'],
})
export class CarResultsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly localizaciones = LOCALIZACIONES_MOCK;
  readonly categorias = CATEGORIAS_MOCK;

  criterios = signal<CriteriosBusquedaAutos>({
    idLocalizacionRecogida: null,
    idLocalizacionDevolucion: null,
    fechaRecogida: '',
    fechaDevolucion: '',
    nombreCategoria: '',
    transmision: '',
  });

  private readonly todosVehiculos = signal<VehicleItem[]>(VEHICULOS_MOCK);
  expandidos = signal<Set<number>>(new Set());

  paginaActual = signal(1);
  readonly tamanoPagina = 6;

  readonly resultadosFiltrados = computed<VehicleItem[]>(() => {
    const c = this.criterios();
    return this.todosVehiculos().filter((v) => {
      if (c.idLocalizacionRecogida && v.localizacion.idLocalizacion !== c.idLocalizacionRecogida)
        return false;
      if (c.nombreCategoria && v.categoria.nombre !== c.nombreCategoria)
        return false;
      if (c.transmision && v.transmision !== c.transmision) return false;
      return true;
    });
  });

  readonly totalResultados = computed(() => this.resultadosFiltrados().length);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalResultados() / this.tamanoPagina)),
  );

  readonly paginaResultados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.tamanoPagina;
    return this.resultadosFiltrados().slice(inicio, inicio + this.tamanoPagina);
  });

  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (actual <= 3) return [1, 2, 3, '...', total];
    if (actual >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', actual, '...', total];
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const idRec = params.get('idLocalizacionRecogida');
    const idDev = params.get('idLocalizacionDevolucion');
    this.criterios.set({
      idLocalizacionRecogida: idRec ? +idRec : null,
      idLocalizacionDevolucion: idDev ? +idDev : null,
      fechaRecogida: params.get('fechaRecogida') ?? '',
      fechaDevolucion: params.get('fechaDevolucion') ?? '',
      nombreCategoria: params.get('nombreCategoria') ?? '',
      transmision: (params.get('transmision') as '' | 'AUTOMATICA' | 'MANUAL') ?? '',
    });
  }

  buscar(): void {
    const c = this.criterios();
    this.paginaActual.set(1);
    const qp: Record<string, string> = {};
    if (c.idLocalizacionRecogida) qp['idLocalizacionRecogida'] = String(c.idLocalizacionRecogida);
    if (c.idLocalizacionDevolucion) qp['idLocalizacionDevolucion'] = String(c.idLocalizacionDevolucion);
    if (c.fechaRecogida) qp['fechaRecogida'] = c.fechaRecogida;
    if (c.fechaDevolucion) qp['fechaDevolucion'] = c.fechaDevolucion;
    if (c.nombreCategoria) qp['nombreCategoria'] = c.nombreCategoria;
    if (c.transmision) qp['transmision'] = c.transmision;
    this.router.navigate([], { queryParams: qp, replaceUrl: true });
  }

  verDetalle(vehiculo: VehicleItem, event: Event): void {
    event.stopPropagation();
    sessionStorage.setItem('car-results', JSON.stringify(this.resultadosFiltrados()));
    sessionStorage.setItem('car-criterios', JSON.stringify(this.criterios()));
    this.router.navigate(['/autos/detalle', vehiculo.idVehiculo]);
  }

  reservar(vehiculo: VehicleItem, event: Event): void {
    event.stopPropagation();
    sessionStorage.setItem('car-results', JSON.stringify(this.resultadosFiltrados()));
    sessionStorage.setItem('car-criterios', JSON.stringify(this.criterios()));
    sessionStorage.setItem('car-selected', JSON.stringify(vehiculo));
    this.router.navigate(['/autos/checkout', vehiculo.idVehiculo]);
  }

  toggleExpandido(id: number): void {
    const set = new Set(this.expandidos());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.expandidos.set(set);
  }

  estaExpandido(id: number): boolean {
    return this.expandidos().has(id);
  }

  cambiarPagina(p: number | string): void {
    if (typeof p !== 'number') return;
    this.paginaActual.set(Math.min(Math.max(1, p), this.totalPaginas()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setCriterio<K extends keyof CriteriosBusquedaAutos>(key: K, value: CriteriosBusquedaAutos[K]): void {
    this.criterios.set({ ...this.criterios(), [key]: value });
  }

  nombreLocalizacion(id: number | null): string {
    if (!id) return '';
    return this.localizaciones.find((l) => l.idLocalizacion === id)?.nombre ?? '';
  }

  getFuelIcon(fuel: string): string {
    const map: Record<string, string> = {
      GASOLINA: 'local_gas_station',
      DIESEL: 'local_gas_station',
      ELECTRICO: 'bolt',
      HIBRIDO: 'eco',
    };
    return map[fuel] ?? 'local_gas_station';
  }
}
