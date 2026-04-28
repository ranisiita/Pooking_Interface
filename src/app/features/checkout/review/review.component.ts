import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CheckoutStore } from '../../../state/checkout.store';
import { ReservasService } from '../../../core/services/vuelos-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { calcularIva, calcularTotal } from '../../../core/utils/money.util';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NavbarComponent, MoneyPipe],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css'],
})
export class ReviewComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private checkoutStore = inject(CheckoutStore);
  private reservasService = inject(ReservasService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly state = this.checkoutStore.state;
  showLoginModal = signal(false);
  guardando = signal(false);

  loginForm = this.fb.group({
    correo:     ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  readonly subtotal = computed(() => {
    const vuelo = this.state().vuelo;
    const asiento = this.state().asiento;
    return (vuelo?.precio_base ?? 0) + (asiento?.precio_extra ?? 0);
  });

  readonly iva = computed(() => calcularIva(this.subtotal()));
  readonly total = computed(() => calcularTotal(this.subtotal()));

  ngOnInit(): void {
    const s = this.state();
    if (!s.vuelo && !s.reserva) {
      this.toast.show('No hay reserva en progreso.', 'error');
      this.router.navigate(['/vuelos/resultados']);
    }
  }

  confirmarReserva(): void {
    if (!this.auth.isAuthenticated()) {
      this.showLoginModal.set(true);
      return;
    }
    this._crearReserva();
  }

  loginYReservar(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    const { correo, contrasena } = this.loginForm.value;
    this.guardando.set(true);

    // Mock login: en producción reemplazar por AuthService.login(correo, contrasena)
    setTimeout(() => {
      this.auth.login('mock-jwt-token', { nombre: 'Usuario', email: correo ?? '' });
      this.showLoginModal.set(false);
      this.guardando.set(false);
      this._crearReserva();
    }, 600);
  }

  private _crearReserva(): void {
    const s = this.state();
    if (!s.cliente || !s.pasajeros.length) {
      this.toast.show('Datos de pasajero incompletos.', 'error');
      this.router.navigate(['/checkout/pasajeros']);
      return;
    }
    if (!s.vuelo || !s.asiento) {
      this.toast.show('No hay vuelo o asiento seleccionado.', 'error');
      return;
    }

    this.guardando.set(true);
    const now = new Date().toISOString();

    this.reservasService.create({
      id_cliente:       s.cliente.id_cliente,
      id_pasajero:      s.pasajeros[0].id_pasajero,
      id_vuelo:         s.vuelo.id_vuelo,
      id_asiento:       s.asiento.id_asiento,
      fecha_inicio:     s.vuelo.fecha_hora_salida,
      fecha_fin:        s.vuelo.fecha_hora_llegada,
      subtotal_reserva: this.subtotal(),
      valor_iva:        this.iva(),
      total_reserva:    this.total(),
      contacto_email:   s.cliente.correo,
      contacto_telefono: s.cliente.telefono,
    }).subscribe({
      next: (res) => {
        this.checkoutStore.setReserva(res.data);
        this.guardando.set(false);
        this.router.navigate(['/checkout/pago']);
      },
      error: () => { this.guardando.set(false); },
    });
  }

  volver(): void { this.router.navigate(['/checkout/pasajeros']); }
}
