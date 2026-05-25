import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { AirportAutocompleteComponent } from '../components/airport-autocomplete/airport-autocomplete.component';
import { FlightService } from '../services/flight.service';
import { AeropuertoSugerencia, FlightItem, FlightSearchParams } from '../shared/flight.models';

export type { FlightItem } from '../shared/flight.models';

@Component({
  selector: 'app-flight-results',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, FormsModule, NavbarComponent, FooterComponent, AirportAutocompleteComponent],
  templateUrl: './flight-results.component.html',
  styleUrls: ['./flight-results.component.css'],
})
export class FlightResultsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private flightService = inject(FlightService);

  // Paginación
  paginaActual = signal(1);
  readonly tamanoPagina = 10;

  // Estado de carga / error
  cargando = signal(false);
  error = signal('');

  // Criterios de búsqueda (para mostrar en la barra flotante)
  criterios = signal({
    origen: '',
    destino: '',
    origenNombre: '',
    destinoNombre: '',
    fechaSalida: '',
    fechaRegreso: '',
    tipoViaje: 'roundtrip' as 'roundtrip' | 'oneway',
  });

  // Aeropuertos seleccionados en la barra flotante
  aeropuertoOrigen: AeropuertoSugerencia | null = null;
  aeropuertoDestino: AeropuertoSugerencia | null = null;

  // Resultados y cards expandidas
  private readonly resultados = signal<FlightItem[]>([]);
  expandidas = signal<Set<string>>(new Set());
  reservandoId = signal<string | null>(null);
  vueloParaConfirmar = signal<FlightItem | null>(null);

  // IATAs de la búsqueda activa (fallback para el modal cuando el proveedor no los devuelve)
  origenIataSearch = signal('');
  destinoIataSearch = signal('');

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
    const origenIata = params.get('origenIata') ?? '';
    const origenNombre = params.get('origenNombre') ?? origenIata;
    const destinoIata = params.get('destinoIata') ?? '';
    const destinoNombre = params.get('destinoNombre') ?? destinoIata;
    const fechaSalida = params.get('fecha') ?? '';
    const fechaRegreso = params.get('fechaRegreso') ?? '';
    const tipoViaje = (params.get('tipoViaje') as 'roundtrip' | 'oneway') ?? 'roundtrip';

    this.criterios.set({
      origen: origenNombre,
      destino: destinoNombre,
      origenNombre,
      destinoNombre,
      fechaSalida,
      fechaRegreso,
      tipoViaje,
    });

    this.origenIataSearch.set(origenIata);
    this.destinoIataSearch.set(destinoIata);

    const searchParams: FlightSearchParams = {
      CodigoIataOrigen: origenIata || undefined,
      CodigoIataDestino: destinoIata || undefined,
      FechaSalida: this.toIsoDateTime(fechaSalida),
    };

    this.cargando.set(true);
    this.error.set('');
    this.flightService
      .buscarVuelos(searchParams)
      .pipe(
        catchError(() => {
          this.error.set('No se pudieron cargar los vuelos. Intenta de nuevo.');
          return of<FlightItem[]>([]);
        }),
      )
      .subscribe(vuelos => {
        this.resultados.set(vuelos);
        this.cargando.set(false);
      });
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

  abrirConfirmacion(vuelo: FlightItem, event: Event): void {
    event.stopPropagation();
    this.vueloParaConfirmar.set(vuelo);
  }

  cancelarReserva(): void {
    this.vueloParaConfirmar.set(null);
  }

  confirmarReserva(): void {
    const vuelo = this.vueloParaConfirmar();
    if (!vuelo) return;
    // No cerrar el modal todavía: se mantiene abierto mostrando el spinner
    this.reservar(vuelo, new MouseEvent('click'));
  }

  reservar(vuelo: FlightItem, event: Event): void {
    event.stopPropagation();

    const proveedorLower = (vuelo.proveedor ?? 'nacho').toLowerCase();
    const idVuelo = vuelo.idVuelo;

    if (!idVuelo) {
      console.error('No se encontró idVuelo en el objeto vuelo');
      return;
    }

    const urlRetorno = window.location.origin + '/vuelos/resultados';
    this.reservandoId.set(vuelo.guidServicio);

    this.flightService.iniciarReservaVuelo(proveedorLower, idVuelo, urlRetorno).subscribe({
      next: (response: unknown) => {
        this.reservandoId.set(null);
        this.vueloParaConfirmar.set(null);
        const res = response as Record<string, unknown>;
        const data = res?.['data'] as Record<string, unknown> | undefined;
        const redirectUrl = data?.['urlRedirect'] as string | undefined;

        if (redirectUrl && typeof redirectUrl === 'string' && redirectUrl.startsWith('http')) {
          window.location.href = redirectUrl;
        } else {
          alert('Reserva iniciada. Serás redirigido al proveedor en breve.');
          console.log('Respuesta sesion-redirect:', response);
        }
      },
      error: (err: { status?: number }) => {
        this.reservandoId.set(null);
        this.vueloParaConfirmar.set(null);
        console.error('Error al iniciar reserva:', err);
        if (err.status === 401) {
          alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
          this.router.navigate(['/login']);
        } else {
          alert('No se pudo iniciar la reserva. Intenta de nuevo.');
        }
      },
    });
  }

  cambiarPagina(pagina: number | string): void {
    if (typeof pagina !== 'number') return;
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onOrigenSeleccionado(a: AeropuertoSugerencia | null): void {
    this.aeropuertoOrigen = a;
    if (a) this.criterios.update(c => ({ ...c, origen: a.display, origenNombre: a.display }));
  }

  onDestinoSeleccionado(a: AeropuertoSugerencia | null): void {
    this.aeropuertoDestino = a;
    if (a) this.criterios.update(c => ({ ...c, destino: a.display, destinoNombre: a.display }));
  }

  buscarDesdeBarraFlotante(): void {
    const origenIata = this.aeropuertoOrigen?.codigoIata ?? '';
    const destinoIata = this.aeropuertoDestino?.codigoIata ?? '';
    const c = this.criterios();

    this.origenIataSearch.set(origenIata);
    this.destinoIataSearch.set(destinoIata);

    const searchParams: FlightSearchParams = {
      CodigoIataOrigen: origenIata || undefined,
      CodigoIataDestino: destinoIata || undefined,
      FechaSalida: this.toIsoDateTime(c.fechaSalida),
    };

    this.paginaActual.set(1);
    this.cargando.set(true);
    this.error.set('');
    this.flightService
      .buscarVuelos(searchParams)
      .pipe(
        catchError(() => {
          this.error.set('No se pudieron cargar los vuelos. Intenta de nuevo.');
          return of<FlightItem[]>([]);
        }),
      )
      .subscribe(vuelos => {
        this.resultados.set(vuelos);
        this.cargando.set(false);
      });
  }

  private toIsoDateTime(fecha: string): string | undefined {
    if (!fecha) return undefined;
    return fecha.includes('T') ? fecha : `${fecha}T00:00:00`;
  }
}
