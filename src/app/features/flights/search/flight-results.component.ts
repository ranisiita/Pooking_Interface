import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SearchStore } from '../../../state/search.store';
import { ServiciosService } from '../../../core/services/servicios.service';
import { Servicio } from '../../../core/models/domain.models';

export interface MockVuelo {
  salida: string;
  llegada: string;
  duracion: string;
  escalas: number;
  precioBase: number;
  origen: string;
  destino: string;
  fecha: string;
}

@Component({
  selector: 'app-flight-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, PaginationComponent],
  templateUrl: './flight-results.component.html',
  styleUrls: ['./flight-results.component.css'],
})
export class FlightResultsComponent implements OnInit {
  private router = inject(Router);
  readonly searchStore = inject(SearchStore);
  private serviciosService = inject(ServiciosService);

  paginaActual = signal(1);
  tamanoPagina = 10;
  filtroTermino = signal('');
  ordenamiento = signal<'nombre' | 'precio'>('nombre');

  readonly resultadosFiltrados = computed(() => {
    let items = this.searchStore.resultados();
    const t = this.filtroTermino().toLowerCase();
    if (t) items = items.filter((s) => s.razonSocial.toLowerCase().includes(t));
    if (this.ordenamiento() === 'nombre') {
      items = [...items].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    }
    return items;
  });

  readonly totalPaginas = computed(() => {
    const meta = this.searchStore.paginacion();
    return meta?.totalPaginas ?? meta?.total_pages ?? 1;
  });

  ngOnInit(): void {
    if (!this.searchStore.hasResults()) {
      const guidTipo = this.searchStore.guidTipoVuelos();
      if (guidTipo) this.cargar(1);
    }
  }

  cargar(pagina: number): void {
    this.paginaActual.set(pagina);
    const guidTipo = this.searchStore.guidTipoVuelos();
    if (!guidTipo) return;
    this.searchStore.setLoading(true);
    this.serviciosService
      .list({ guidTipo, paginaActual: pagina, tamanoPagina: this.tamanoPagina })
      .subscribe({
        next: (res) => this.searchStore.setResultados(res.data ?? [], res.meta),
        error: () => this.searchStore.setLoading(false),
      });
  }

  seleccionar(servicio: Servicio): void {
    this.router.navigate(['/vuelos', servicio.guidServicio]);
  }

  volver(): void {
    this.router.navigate(['/buscar'], { queryParams: { tab: 'vuelos' } });
  }

  /**
   * Genera datos de vuelo simulados de forma determinista según el GUID del proveedor,
   * de modo que cada aerolínea muestre siempre los mismos datos en la sesión.
   */
  getMockVuelo(servicio: Servicio): MockVuelo {
    // Semilla determinista basada en los primeros chars del GUID
    const seed = (servicio.guidServicio.charCodeAt(0) + servicio.guidServicio.charCodeAt(4)) % 8;

    const horarios = [
      { salida: '06:15', durMin: 90 },
      { salida: '08:30', durMin: 120 },
      { salida: '10:45', durMin: 150 },
      { salida: '13:00', durMin: 180 },
      { salida: '15:20', durMin: 210 },
      { salida: '17:50', durMin: 240 },
      { salida: '19:10', durMin: 270 },
      { salida: '21:30', durMin: 300 },
    ];
    const precios   = [89, 115, 135, 158, 179, 205, 230, 265];
    const escalas   = [0, 0, 1, 0, 1, 0, 0, 1];

    const { salida, durMin } = horarios[seed];
    const [h, m] = salida.split(':').map(Number);
    const llegMin = h * 60 + m + durMin;
    const llegada = `${String(Math.floor(llegMin / 60) % 24).padStart(2, '0')}:${String(llegMin % 60).padStart(2, '0')}`;
    const hDur    = Math.floor(durMin / 60);
    const minDur  = durMin % 60;
    const duracion = minDur > 0 ? `${hDur}h ${minDur}min` : `${hDur}h`;

    const criterios = this.searchStore.criterios();

    return {
      salida,
      llegada,
      duracion,
      escalas:    escalas[seed],
      precioBase: precios[seed],
      origen:     criterios.origen  || 'Origen',
      destino:    criterios.destino || 'Destino',
      fecha:      criterios.fechaSalida || '',
    };
  }
}
