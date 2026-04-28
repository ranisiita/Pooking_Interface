import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SearchStore } from '../../state/search.store';
import { ServiciosService } from '../../core/services/servicios.service';
import { TiposServicioService } from '../../core/services/tipos-servicio.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { LoadingService } from '../../shared/ui/spinner/loading.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchStore = inject(SearchStore);
  private serviciosService = inject(ServiciosService);
  private tiposServicioService = inject(TiposServicioService);
  private toast = inject(ToastService);
  readonly loading = inject(LoadingService);

  activeTab = 'alojamiento';

  tabs = [
    { key: 'alojamiento',  icon: 'hotel',              label: 'Alojamiento' },
    { key: 'vuelos',       icon: 'flight',             label: 'Vuelos' },
    { key: 'coches',       icon: 'directions_car',     label: 'Alquiler de Coches' },
    { key: 'atracciones',  icon: 'confirmation_number', label: 'Atracciones' },
  ];

  aloj = { destino: '', llegada: '', salida: '', habitaciones: 1, adultos: 2, ninos: 0 };
  vuelos = { origen: '', destino: '', salida: '', regreso: '', pasajeros: 1, clase: 'Económica' };
  coches = { lugar: '', recogida: '', devolucion: '' };
  atracciones = { destino: '', fecha: '' };

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['tab']) this.activeTab = params['tab'];
    });
  }

  setTab(key: string): void { this.activeTab = key; }

  buscarVuelos(): void {
    const { origen, destino, salida, regreso, pasajeros, clase } = this.vuelos;
    if (!origen.trim() || !destino.trim() || !salida) {
      this.toast.show('Por favor completa origen, destino y fecha de salida.', 'error');
      return;
    }

    this.searchStore.setCriterios({
      origen: origen.trim(),
      destino: destino.trim(),
      fechaSalida: salida,
      fechaRegreso: regreso,
      pasajeros,
      clase,
      esIdaVuelta: !!regreso,
      termino: `${origen.trim()} ${destino.trim()}`.trim(),
    });

    const guidTipo = this.searchStore.guidTipoVuelos();

    if (!guidTipo) {
      this.tiposServicioService.getPorNombre('Vuelos').subscribe({
        next: (tipoRes) => {
          const guidEncontrado = tipoRes.data?.guidTipoServicio;
          if (!guidEncontrado) {
            this.toast.show('Servicio de vuelos no disponible en este momento.', 'error');
            return;
          }
          this.searchStore.setGuidTipoVuelos(guidEncontrado);
          this.ejecutarBusquedaVuelos(guidEncontrado, origen, destino, salida, pasajeros, clase);
        },
        error: () => this.toast.show('Servicio de vuelos no disponible en este momento.', 'error'),
      });
      return;
    }

    this.ejecutarBusquedaVuelos(guidTipo, origen, destino, salida, pasajeros, clase);
  }

  private ejecutarBusquedaVuelos(
    guidTipo: string,
    origen: string,
    destino: string,
    salida: string,
    pasajeros: number,
    clase: string,
  ): void {
    this.searchStore.setLoading(true);
    this.serviciosService
      .list({ guidTipo, paginaActual: 1, tamanoPagina: 10 })
      .subscribe({
        next: (res) => {
          this.searchStore.setResultados(res.data ?? [], res.meta);
          this.router.navigate(['/vuelos/resultados'], {
            queryParams: { origen, destino, fecha: salida, pasajeros, clase },
          });
        },
        error: () => {
          this.searchStore.setLoading(false);
        },
      });
  }
}
