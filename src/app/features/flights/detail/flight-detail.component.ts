import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { ServiciosService } from '../../../core/services/servicios.service';
import { CheckoutStore } from '../../../state/checkout.store';
import { SearchStore } from '../../../state/search.store';
import { ServicioDetalle } from '../../../core/models/domain.models';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { MockVuelo } from '../search/flight-results.component';
import { Cotizacion } from '../../../state/checkout.store';
import { calcularIva, calcularTotal } from '../../../core/utils/money.util';

@Component({
  selector: 'app-flight-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './flight-detail.component.html',
  styleUrls: ['./flight-detail.component.css'],
})
export class FlightDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private serviciosService = inject(ServiciosService);
  private checkoutStore = inject(CheckoutStore);
  private toast = inject(ToastService);

  detalle      = signal<ServicioDetalle | null>(null);
  mockVuelo    = signal<MockVuelo | null>(null);
  loading      = signal(true);
  error        = signal<string | null>(null);

  private searchStore = inject(SearchStore);

  ngOnInit(): void {
    const guid = this.route.snapshot.paramMap.get('guid');
    if (!guid) { this.router.navigate(['/vuelos/resultados']); return; }

    this.serviciosService.getDetalle(guid).subscribe({
      next: (res) => {
        this.detalle.set(res.data);
        this.mockVuelo.set(this.generarMock(guid));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el detalle del vuelo.');
        this.loading.set(false);
      },
    });
  }

  seleccionarAsiento(): void {
    const guid = this.route.snapshot.paramMap.get('guid');
    this.router.navigate(['/vuelos', guid, 'asientos']);
  }

  irAlCheckout(): void {
    const d = this.detalle();
    const v = this.mockVuelo();
    if (!d || !v) { this.router.navigate(['/checkout/pasajeros']); return; }

    const criterios   = this.searchStore.criterios();
    const clase       = criterios.clase || 'Económica';
    const pasajeros   = criterios.pasajeros || 1;
    const factorClase = clase.toLowerCase().includes('primera')
      ? 3.5 : clase.toLowerCase().includes('ejecutiva') ? 2.0 : 1.0;

    const subtotal      = Math.round(v.precioBase * factorClase * pasajeros * 100) / 100;
    const iva           = calcularIva(subtotal);
    const cargoServicio = 10;
    const total         = calcularTotal(subtotal, cargoServicio);

    const cotizacion: Cotizacion = {
      guidServicio:          d.guidServicio,
      nombreServicio:        d.nombreComercial ?? d.razonSocial,
      origen:                v.origen,
      destino:               v.destino,
      fechaSalida:           v.fecha,
      horaSalida:            v.salida,
      horaLlegada:           v.llegada,
      duracion:              v.duracion,
      escalas:               v.escalas,
      clase,
      cantidadPasajeros:     pasajeros,
      precioBasePorPasajero: v.precioBase,
      factorClase,
      subtotal,
      iva,
      cargoServicio,
      total,
    };
    this.checkoutStore.setCotizacion(cotizacion);
    this.router.navigate(['/checkout/pasajeros']);
  }

  volver(): void {
    this.router.navigate(['/vuelos/resultados']);
  }

  private generarMock(guid: string): MockVuelo {
    const seed = (guid.charCodeAt(0) + guid.charCodeAt(4)) % 8;
    const horarios = [
      { salida: '06:15', durMin: 90  },
      { salida: '08:30', durMin: 120 },
      { salida: '10:45', durMin: 150 },
      { salida: '13:00', durMin: 180 },
      { salida: '15:20', durMin: 210 },
      { salida: '17:50', durMin: 240 },
      { salida: '19:10', durMin: 270 },
      { salida: '21:30', durMin: 300 },
    ];
    const precios = [89, 115, 135, 158, 179, 205, 230, 265];
    const escalas = [0, 0, 1, 0, 1, 0, 0, 1];

    const { salida, durMin } = horarios[seed];
    const [h, m] = salida.split(':').map(Number);
    const llegMin = h * 60 + m + durMin;
    const llegada = `${String(Math.floor(llegMin / 60) % 24).padStart(2, '0')}:${String(llegMin % 60).padStart(2, '0')}`;
    const hDur = Math.floor(durMin / 60);
    const minDur = durMin % 60;

    const criterios = this.searchStore.criterios();
    return {
      salida,
      llegada,
      duracion:   minDur > 0 ? `${hDur}h ${minDur}min` : `${hDur}h`,
      escalas:    escalas[seed],
      precioBase: precios[seed],
      origen:     criterios.origen  || 'Origen',
      destino:    criterios.destino || 'Destino',
      fecha:      criterios.fechaSalida || '',
    };
  }
}
