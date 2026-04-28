import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { VuelosService } from '../../../core/services/vuelos-api.service';
import { CheckoutStore } from '../../../state/checkout.store';
import { Asiento, ClaseCabina } from '../../../core/models/domain.models';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, MoneyPipe],
  templateUrl: './seat-map.component.html',
  styleUrls: ['./seat-map.component.css'],
})
export class SeatMapComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vuelosService = inject(VuelosService);
  private checkoutStore = inject(CheckoutStore);
  private toast = inject(ToastService);

  asientos = signal<Asiento[]>([]);
  loading = signal(true);
  asientoSeleccionado = signal<Asiento | null>(null);
  claseActiva = signal<ClaseCabina>('ECONOMICA');
  clases: ClaseCabina[] = ['ECONOMICA', 'EJECUTIVA', 'PRIMERA'];
  idVuelo = 0;

  readonly asientosFiltrados = computed(() =>
    this.asientos().filter((a) => a.clase === this.claseActiva()),
  );

  readonly filas = computed(() => {
    const map = new Map<string, Asiento[]>();
    this.asientosFiltrados().forEach((a) => {
      const fila = a.numero_asiento.replace(/[A-Z]/gi, '');
      if (!map.has(fila)) map.set(fila, []);
      map.get(fila)!.push(a);
    });
    return Array.from(map.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  });

  ngOnInit(): void {
    const guidParam = this.route.snapshot.paramMap.get('guid');
    const estado = this.checkoutStore.state();
    this.idVuelo = estado.vuelo?.id_vuelo ?? 0;

    if (!this.idVuelo) {
      this.toast.show('No hay vuelo seleccionado.', 'error');
      this.router.navigate(['/vuelos/resultados']);
      return;
    }

    this.vuelosService.getAsientos(this.idVuelo, { disponible: true }).subscribe({
      next: (res) => { this.asientos.set(res.data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  seleccionar(asiento: Asiento): void {
    if (!asiento.disponible) return;
    this.asientoSeleccionado.set(asiento);
  }

  confirmar(): void {
    const a = this.asientoSeleccionado();
    if (!a) { this.toast.show('Selecciona un asiento primero.', 'error'); return; }

    this.vuelosService.getAsiento(this.idVuelo, a.id_asiento).subscribe({
      next: (res) => {
        if (!res.data.disponible) {
          this.toast.show('Este asiento ya no está disponible. Por favor elige otro.', 'error');
          this.asientoSeleccionado.set(null);
          return;
        }
        this.checkoutStore.setAsiento(res.data);
        this.router.navigate(['/checkout/pasajeros']);
      },
    });
  }

  volver(): void { this.router.navigate(['/vuelos/resultados']); }
}
