import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';

type FlightClass = 'Económica' | 'Ejecutiva' | 'Primera clase';
interface FlightSearchCriteria {
  origen: string;
  destino: string;
  fechaSalida: string;
  fechaRegreso: string;
  pasajeros: number;
  clase: FlightClass;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly tabsValidas = new Set(['alojamiento', 'vuelos', 'coches', 'atracciones']);

  activeTab = 'alojamiento';

  tabs = [
    { key: 'alojamiento',  icon: 'hotel',              label: 'Alojamiento' },
    { key: 'vuelos',       icon: 'flight',             label: 'Vuelos' },
    { key: 'coches',       icon: 'directions_car',     label: 'Alquiler de Coches' },
    { key: 'atracciones',  icon: 'confirmation_number', label: 'Atracciones' },
  ];

  aloj = { destino: '', llegada: '', salida: '', habitaciones: 1, adultos: 2, ninos: 0 };
  vuelos = { origen: '', destino: '', salida: '', regreso: '', pasajeros: 1, clase: 'Económica' };
  flightFormError = '';
  coches = { lugar: '', recogida: '', devolucion: '' };
  atracciones = { destino: '', fecha: '' };

  ngOnInit(): void {
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

  buscarVuelos(): void {
    const { origen, destino, salida, regreso, pasajeros, clase } = this.vuelos;
    if (!origen.trim() || !destino.trim() || !salida) {
      window.alert('Por favor completa origen, destino y fecha de salida.');
      return;
    }
    if (!this.isCityTextOnly(origen) || !this.isCityTextOnly(destino)) {
      this.flightFormError = 'Origen y destino solo permiten letras y espacios.';
      return;
    }
    if (regreso && regreso < salida) {
      this.flightFormError = 'La fecha de regreso no puede ser anterior a la fecha de salida.';
      return;
    }
    this.flightFormError = '';

    const criterios: FlightSearchCriteria = {
      origen: origen.trim(),
      destino: destino.trim(),
      fechaSalida: salida,
      fechaRegreso: regreso,
      pasajeros,
      clase: clase as FlightClass,
    };
    sessionStorage.setItem('flight-search-criteria', JSON.stringify(criterios));
    this.router.navigate(['/vuelos/resultados'], {
      queryParams: { origen: criterios.origen, destino: criterios.destino, fecha: criterios.fechaSalida, pasajeros, clase },
    });
  }

  onCityInput(field: 'origen' | 'destino', event: Event): void {
    const input = event.target as HTMLInputElement;
    const saneado = input.value.replace(/[^a-zA-Z\u00C0-\u017F\s]/g, '');
    this.vuelos[field] = saneado;
    if (this.flightFormError) {
      this.flightFormError = '';
    }
  }

  private isCityTextOnly(value: string): boolean {
    return /^[a-zA-Z\u00C0-\u017F\s]+$/.test(value.trim());
  }
}
