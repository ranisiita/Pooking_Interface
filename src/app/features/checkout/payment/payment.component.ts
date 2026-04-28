import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CheckoutStore } from '../../../state/checkout.store';
import { ReservasService } from '../../../core/services/vuelos-api.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, MoneyPipe],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
})
export class PaymentComponent implements OnInit {
  private router = inject(Router);
  private checkoutStore = inject(CheckoutStore);
  private reservasService = inject(ReservasService);
  private toast = inject(ToastService);

  readonly state = this.checkoutStore.state;
  procesando = signal(false);
  resultadoSimulado = signal<'APROBADO' | 'RECHAZADO' | null>(null);

  ngOnInit(): void {
    if (!this.state().reserva) {
      this.toast.show('No hay reserva activa.', 'error');
      this.router.navigate(['/vuelos/resultados']);
    }
  }

  pagar(resultado: 'APROBADO' | 'RECHAZADO'): void {
    const reserva = this.state().reserva;
    if (!reserva) return;

    this.procesando.set(true);
    this.resultadoSimulado.set(null);

    // Simula tiempo de proceso
    setTimeout(() => {
      const estadoNuevo = resultado === 'APROBADO' ? 'CON' : 'CAN';
      this.reservasService
        .updateEstado(reserva.id_reserva, {
          estado_reserva: estadoNuevo,
          motivo_cancelacion: resultado === 'RECHAZADO' ? 'Pago rechazado por pasarela' : undefined,
        })
        .subscribe({
          next: (res) => {
            this.checkoutStore.setReserva(res.data);
            this.procesando.set(false);
            this.resultadoSimulado.set(resultado);
            if (resultado === 'APROBADO') {
              this.toast.show('¡Pago aprobado! Generando factura y boleto...', 'success');
              setTimeout(() => this.router.navigate(['/checkout/confirmacion']), 1500);
            } else {
              this.toast.show('Pago rechazado. La reserva ha sido cancelada.', 'error');
            }
          },
          error: () => { this.procesando.set(false); },
        });
    }, 1500);
  }

  volver(): void { this.router.navigate(['/checkout/resumen']); }
}
