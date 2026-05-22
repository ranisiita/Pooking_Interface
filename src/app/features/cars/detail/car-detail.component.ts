import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { VehicleItem } from '../shared/car.models';
import { VEHICULOS_MOCK, EXTRAS_MOCK } from '../shared/car-mock.data';

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './car-detail.component.html',
  styleUrls: ['./car-detail.component.css'],
})
export class CarDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  vehiculo = signal<VehicleItem | null>(null);
  readonly extras = EXTRAS_MOCK;

  readonly specs = computed(() => {
    const v = this.vehiculo();
    if (!v) return [];
    return [
      { icon: 'people',            label: 'Pasajeros',    value: `${v.capacidadPasajeros} personas` },
      { icon: 'work',              label: 'Maletas',       value: `${v.capacidadMaletas} maletas` },
      { icon: 'door_front',        label: 'Puertas',       value: `${v.numeroPuertas} puertas` },
      { icon: 'settings',          label: 'Transmisión',   value: v.transmision === 'AUTOMATICA' ? 'Automática' : 'Manual' },
      { icon: 'local_gas_station', label: 'Combustible',   value: v.combustible.charAt(0) + v.combustible.slice(1).toLowerCase() },
      { icon: 'ac_unit',           label: 'Aire acond.',   value: v.aireAcondicionado ? 'Sí' : 'No' },
      { icon: 'palette',           label: 'Color',         value: v.color },
      { icon: 'calendar_today',    label: 'Año',           value: `${v.anio}` },
    ];
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) { this.goBack(); return; }
    const id = +idParam;
    const raw = sessionStorage.getItem('car-results');
    const lista: VehicleItem[] = raw ? JSON.parse(raw) : VEHICULOS_MOCK;
    const v = lista.find((x) => x.idVehiculo === id) ?? VEHICULOS_MOCK.find((x) => x.idVehiculo === id) ?? null;
    this.vehiculo.set(v);
  }

  reservar(): void {
    const v = this.vehiculo();
    if (!v) return;
    sessionStorage.setItem('car-selected', JSON.stringify(v));
    this.router.navigate(['/autos/checkout', v.idVehiculo]);
  }

  goBack(): void {
    this.router.navigate(['/autos/resultados']);
  }
}
