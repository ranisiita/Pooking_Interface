import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';

export interface FlightItem {
  guidServicio: string;
  nombreComercial: string;
  tipoServicioNombre: string;
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
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './flight-results.component.html',
  styleUrls: ['./flight-results.component.css'],
})
export class FlightResultsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  paginaActual = signal(1);
  readonly tamanoPagina = 6;
  filtroTermino = signal('');
  ordenamiento = signal<'nombre' | 'precio_asc' | 'precio_desc'>('nombre');
  private readonly resultados = signal<FlightItem[]>([]);

  readonly criterios = signal({
    origen: '',
    destino: '',
    fechaSalida: '',
    pasajeros: 1,
    clase: 'Económica',
  });

  readonly resultadosFiltrados = computed<FlightItem[]>(() => {
    let items = this.resultados();
    const t = this.filtroTermino().toLowerCase();
    if (t) items = items.filter((s) => s.nombreComercial.toLowerCase().includes(t));
    if (this.ordenamiento() === 'nombre') {
      items = [...items].sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial));
    } else if (this.ordenamiento() === 'precio_asc') {
      items = [...items].sort((a, b) => a.precioBase - b.precioBase);
    } else {
      items = [...items].sort((a, b) => b.precioBase - a.precioBase);
    }
    return items;
  });

  readonly totalResultados = computed(() => this.resultadosFiltrados().length);

  readonly totalPaginas = computed(() => {
    return Math.max(1, Math.ceil(this.totalResultados() / this.tamanoPagina));
  });

  readonly paginaResultados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.tamanoPagina;
    return this.resultadosFiltrados().slice(inicio, inicio + this.tamanoPagina);
  });

  ngOnInit(): void {
    const origen = this.route.snapshot.queryParamMap.get('origen') ?? '';
    const destino = this.route.snapshot.queryParamMap.get('destino') ?? '';
    const fechaSalida = this.route.snapshot.queryParamMap.get('fecha') ?? '';
    const pasajeros = Number(this.route.snapshot.queryParamMap.get('pasajeros') ?? 1);
    const clase = this.route.snapshot.queryParamMap.get('clase') ?? 'Económica';
    this.criterios.set({ origen, destino, fechaSalida, pasajeros, clase });
    this.resultados.set(this.generarResultados(this.criterios()));
  }

  cargar(pagina: number): void {
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  seleccionar(servicio: FlightItem): void {
    const results = this.resultados();
    sessionStorage.setItem('flight-results', JSON.stringify(results));
    sessionStorage.setItem('flight-selected', JSON.stringify(servicio));
    this.router.navigate(['/vuelos', servicio.guidServicio], { queryParams: this.criterios() });
  }

  volver(): void {
    this.router.navigate(['/buscar'], { queryParams: { tab: 'vuelos' } });
  }

  private generarResultados(criterios: {
    origen: string;
    destino: string;
    fechaSalida: string;
    pasajeros: number;
    clase: string;
  }): FlightItem[] {
    const proveedores = [
      'AeroAndes',
      'SkyLatam',
      'NubeAir',
      'Pacific Wings',
      'FlySur',
      'Aurora Flights',
      'Condor Plus',
      'VuelaYa',
      'Horizonte Air',
      'Altura Express',
    ];
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
    const precios = [89, 115, 135, 158, 179, 205, 230, 265, 299, 325];
    const escalas = [0, 0, 1, 0, 1, 0, 0, 1, 1, 0];
    return proveedores.map((nombreComercial, i) => {
      const slot = horarios[i % horarios.length];
      const [h, m] = slot.salida.split(':').map(Number);
      const llegMin = h * 60 + m + slot.durMin;
      const llegada = `${String(Math.floor(llegMin / 60) % 24).padStart(2, '0')}:${String(llegMin % 60).padStart(2, '0')}`;
      const hDur = Math.floor(slot.durMin / 60);
      const minDur = slot.durMin % 60;
      return {
        guidServicio: `flight-${i + 1}`,
        nombreComercial,
        tipoServicioNombre: 'Vuelos',
        salida: slot.salida,
        llegada,
        duracion: minDur > 0 ? `${hDur}h ${minDur}min` : `${hDur}h`,
        escalas: escalas[i],
        precioBase: precios[i],
        origen: criterios.origen || 'Origen',
        destino: criterios.destino || 'Destino',
        fecha: criterios.fechaSalida || '',
      };
    });
  }
}
