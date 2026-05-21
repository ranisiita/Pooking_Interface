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

  // Paginación
  paginaActual = signal(1);
  readonly tamanoPagina = 10;

  // Criterios de búsqueda (para mostrar en la barra flotante)
  criterios = signal({
    origen: '',
    destino: '',
    fechaSalida: '',
    fechaRegreso: '',
    tipoViaje: 'roundtrip' as 'roundtrip' | 'oneway',
  });

  // Resultados y cards expandidas
  private readonly resultados = signal<FlightItem[]>([]);
  expandidas = signal<Set<string>>(new Set());

  readonly resultadosFiltrados = computed<FlightItem[]>(() => this.resultados());

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
    this.criterios.set({
      origen: params.get('origen') ?? '',
      destino: params.get('destino') ?? '',
      fechaSalida: params.get('fecha') ?? '',
      fechaRegreso: params.get('fechaRegreso') ?? '',
      tipoViaje: (params.get('tipoViaje') as 'roundtrip' | 'oneway') ?? 'roundtrip',
    });
    this.resultados.set(this.generarResultados());
  }

  toggleDetalle(guid: string): void {
    const set = new Set(this.expandidas());
    if (set.has(guid)) set.delete(guid);
    else set.add(guid);
    this.expandidas.set(set);
  }

  estaExpandido(guid: string): boolean {
    return this.expandidas().has(guid);
  }

  reservar(vuelo: FlightItem, event: Event): void {
    event.stopPropagation();
    sessionStorage.setItem('flight-results', JSON.stringify(this.resultados()));
    sessionStorage.setItem('flight-selected', JSON.stringify(vuelo));
    this.router.navigate(['/checkout', vuelo.guidServicio]);
  }

  cambiarPagina(pagina: number | string): void {
    if (typeof pagina !== 'number') return;
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private generarResultados(): FlightItem[] {
    const c = this.criterios();
    const proveedores = [
      { nombre: 'NachoFlights', codigo: 'NF0104', avion: 'Boeing 787' },
      { nombre: 'SkyExpress', codigo: 'SE2301', avion: 'Airbus A320' },
      { nombre: 'AeroAndes', codigo: 'AA1502', avion: 'Boeing 737' },
      { nombre: 'SkyLatam', codigo: 'SL3408', avion: 'Airbus A321' },
      { nombre: 'NubeAir', codigo: 'NA0720', avion: 'Boeing 737 MAX' },
      { nombre: 'Pacific Wings', codigo: 'PW1190', avion: 'Airbus A319' },
      { nombre: 'FlySur', codigo: 'FS2204', avion: 'Boeing 787' },
      { nombre: 'Aurora Flights', codigo: 'AF3310', avion: 'Airbus A320neo' },
      { nombre: 'Condor Plus', codigo: 'CP0815', avion: 'Boeing 737' },
      { nombre: 'Altura Express', codigo: 'AE1650', avion: 'Airbus A321' },
    ];
    const horarios = [
      { salida: '07:30', durMin: 270 },
      { salida: '14:15', durMin: 345 },
      { salida: '06:15', durMin: 90 },
      { salida: '08:30', durMin: 120 },
      { salida: '10:45', durMin: 150 },
      { salida: '13:00', durMin: 180 },
      { salida: '15:20', durMin: 210 },
      { salida: '17:50', durMin: 240 },
      { salida: '19:10', durMin: 270 },
      { salida: '21:30', durMin: 300 },
    ];
    const precios = [320, 285, 89, 115, 135, 158, 179, 205, 230, 265];
    const escalas = [0, 1, 0, 0, 1, 0, 1, 0, 0, 1];

    return proveedores.map((p, i) => {
      const slot = horarios[i];
      const [h, m] = slot.salida.split(':').map(Number);
      const llegMin = h * 60 + m + slot.durMin;
      const llegada = `${String(Math.floor(llegMin / 60) % 24).padStart(2, '0')}:${String(llegMin % 60).padStart(2, '0')}`;
      const hDur = Math.floor(slot.durMin / 60);
      const minDur = slot.durMin % 60;
      return {
        guidServicio: `flight-${i + 1}`,
        nombreComercial: p.nombre,
        tipoServicioNombre: 'Vuelos',
        salida: slot.salida,
        llegada,
        duracion: minDur > 0 ? `${hDur}h ${minDur}m` : `${hDur}h`,
        escalas: escalas[i],
        precioBase: precios[i],
        origen: c.origen || 'MAD',
        destino: c.destino || 'BCN',
        fecha: c.fechaSalida || '',
        _codigo: p.codigo,
        _avion: p.avion,
      } as FlightItem & { _codigo: string; _avion: string };
    });
  }
}
