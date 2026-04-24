import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {

  showTransition: boolean = true;
  activeTab: string = 'alojamiento';

  tabs = [
    { key: 'alojamiento',  icon: 'hotel',              label: 'Alojamiento' },
    { key: 'vuelos',       icon: 'flight',             label: 'Vuelos' },
    { key: 'coches',       icon: 'directions_car',     label: 'Alquiler de Coches' },
    { key: 'atracciones',  icon: 'confirmation_number', label: 'Atracciones' }
  ];

  // Alojamiento
  aloj = { destino: '', llegada: '', salida: '', habitaciones: 1, adultos: 2, ninos: 0 };

  // Vuelos
  vuelos = { origen: '', destino: '', salida: '', regreso: '', pasajeros: 1, clase: 'Económica' };

  // Coches
  coches = { lugar: '', recogida: '', devolucion: '' };

  // Atracciones
  atracciones = { destino: '', fecha: '' };

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });

    // Ocultar transición después de 2 segundos
    setTimeout(() => {
      this.showTransition = false;
    }, 2000);
  }

  setTab(key: string) {
    this.activeTab = key;
  }
}
