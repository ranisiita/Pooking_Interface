import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';

interface ReservaAuto {
  idReserva: number;
  codigoReserva: string;
  estado: string;
  total: number;
  subtotalVehiculo: number;
  subtotalExtras: number;
  iva: number;
  conductor: { nombres: string; apellidos: string; correo: string };
  vehiculo: { marca: string; modelo: string; anio: number; imagenUrl: string };
  extras: { extra: { nombre: string; valorFijo: number }; cantidad: number }[];
}

@Component({
  selector: 'app-car-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './car-payment.component.html',
  styleUrls: ['./car-payment.component.css'],
})
export class CarPaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  idReserva = 0;
  reserva = signal<ReservaAuto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  paso = signal<1 | 2>(1);
  procesando = signal(false);
  detallesExpandidos = signal(false);

  datosTarjeta = {
    titular: '',
    numero: '',
    expiracion: '',
    cvc: '',
  };
  erroresTarjeta: Partial<Record<keyof typeof this.datosTarjeta, string>> = {};

  readonly total = computed(() => this.reserva()?.total ?? 0);
  readonly subtotal = computed(() =>
    (this.reserva()?.subtotalVehiculo ?? 0) + (this.reserva()?.subtotalExtras ?? 0)
  );
  readonly iva = computed(() => this.reserva()?.iva ?? 0);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) { this.router.navigate(['/autos/resultados']); return; }
    this.idReserva = +idParam;

    const raw = sessionStorage.getItem('car-reserva');
    if (!raw) {
      this.error.set('No se encontraron los datos de la reserva. Por favor vuelve al inicio.');
      this.loading.set(false);
      return;
    }

    try {
      this.reserva.set(JSON.parse(raw));
    } catch {
      this.error.set('Error al cargar los datos de la reserva.');
    }
    this.loading.set(false);
  }

  // ─── Formateo tarjeta ───────────────────────────────────────────────────
  formatearNumero(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    this.datosTarjeta.numero = val;
    input.value = val;
  }

  formatearExpiracion(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + ' / ' + val.slice(2);
    this.datosTarjeta.expiracion = val;
    input.value = val;
  }

  soloDigitosCvc(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.datosTarjeta.cvc = input.value.replace(/\D/g, '').slice(0, 3);
    input.value = this.datosTarjeta.cvc;
  }

  // ─── Validación tarjeta ─────────────────────────────────────────────────
  private validarTarjeta(): boolean {
    this.erroresTarjeta = {};
    const t = this.datosTarjeta;

    if (!t.titular.trim() || t.titular.trim().length < 4)
      this.erroresTarjeta['titular'] = 'El nombre debe tener al menos 4 caracteres.';

    if (t.numero.replace(/\s/g, '').length !== 16)
      this.erroresTarjeta['numero'] = 'El número de tarjeta debe tener 16 dígitos.';

    if (!/^\d{2} \/ \d{2}$/.test(t.expiracion)) {
      this.erroresTarjeta['expiracion'] = 'Formato inválido. Usa MM / AA.';
    } else {
      const [mm, yy] = t.expiracion.split(' / ').map(Number);
      const ahora = new Date();
      if (mm < 1 || mm > 12 || new Date(2000 + yy, mm - 1) < new Date(ahora.getFullYear(), ahora.getMonth()))
        this.erroresTarjeta['expiracion'] = 'La tarjeta ha caducado.';
    }

    if (t.cvc.length < 3)
      this.erroresTarjeta['cvc'] = 'El CVC debe tener 3 dígitos.';

    return Object.keys(this.erroresTarjeta).length === 0;
  }

  pagar(): void {
    if (!this.validarTarjeta()) return;
    this.procesando.set(true);
    // Simulación de procesamiento de pago (1.8 s)
    setTimeout(() => {
      this.procesando.set(false);
      // Limpiar datos sensibles de la sesión
      sessionStorage.removeItem('car-selected');
      sessionStorage.removeItem('car-provider');
      sessionStorage.removeItem('car-criterios');
      this.router.navigate(['/autos/confirmacion', this.idReserva]);
    }, 1800);
  }

  cancelar(): void {
    this.router.navigate(['/autos/resultados']);
  }

  get hayErroresTarjeta(): boolean {
    return Object.keys(this.erroresTarjeta).length > 0;
  }
}
