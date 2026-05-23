import { Component, OnInit, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { FlightItem } from '../../flights/search/flight-results.component';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
})
export class PaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // --- Propiedades para uso compartido (Embebido) ---
  @Input() isStandalone = true;
  @Input() initialStep: 1 | 2 = 1;
  @Input() totalInput = 0;
  @Input() subtotalInput = 0;
  @Input() ivaInput = 0;
  @Input() overrideEmail = '';
  @Input() overrideNombre = '';

  @Output() pagoExitoso = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  guid = '';
  vuelo = signal<FlightItem | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paso 1 = Modal "Tus datos", Paso 2 = Hall de pagos
  paso = signal<1 | 2>(1);
  procesando = signal(false);
  detallesExpandidos = signal(false);

  // Formulario datos personales
  datosPersonales = {
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
  };

  erroresDatos: Partial<Record<keyof typeof this.datosPersonales, string>> = {};

  // Formulario pago
  datosTarjeta = {
    titular: '',
    numero: '',
    expiracion: '',
    cvc: '',
  };

  erroresTarjeta: Partial<Record<keyof typeof this.datosTarjeta, string>> = {};

  readonly subtotal = computed(() => this.isStandalone ? (this.vuelo()?.precioBase ?? 0) : this.subtotalInput);
  readonly iva = computed(() => this.isStandalone ? +(this.subtotal() * 0.094).toFixed(2) : this.ivaInput);
  readonly total = computed(() => this.isStandalone ? +(this.subtotal() + this.iva()).toFixed(2) : this.totalInput);

  ngOnInit(): void {
    this.paso.set(this.initialStep);

    if (this.isStandalone) {
      this.guid = this.route.snapshot.paramMap.get('guid') ?? '';
      if (!this.guid) { this.router.navigate(['/vuelos/resultados']); return; }

      // Precargar datos del usuario desde localStorage si existen
      const nombre = localStorage.getItem('nombre') ?? '';
      const email = localStorage.getItem('email') ?? '';
      this.datosPersonales.nombre = nombre.split(' ')[0] ?? '';
      this.datosPersonales.apellidos = nombre.split(' ').slice(1).join(' ') ?? '';
      this.datosPersonales.email = email;

      const raw = sessionStorage.getItem('flight-results');
      const lista: FlightItem[] = raw ? JSON.parse(raw) : [];
      const vuelo = lista.find((x) => x.guidServicio === this.guid) ?? null;

      if (!vuelo) {
        this.error.set('No se encontró el vuelo. Por favor vuelve a buscar.');
        this.loading.set(false);
        return;
      }

      this.vuelo.set(vuelo);
    } else {
      // Uso embebido
      if (this.overrideNombre) {
        this.datosPersonales.nombre = this.overrideNombre;
      }
      if (this.overrideEmail) {
        this.datosPersonales.email = this.overrideEmail;
      }
    }
    
    this.loading.set(false);
  }

  // ---- Validación paso 1 ----
  private validarDatos(): boolean {
    this.erroresDatos = {};
    const d = this.datosPersonales;

    if (!d.nombre.trim() || d.nombre.trim().length < 4)
      this.erroresDatos['nombre'] = 'Mínimo 4 caracteres.';

    if (!d.apellidos.trim() || d.apellidos.trim().length < 4)
      this.erroresDatos['apellidos'] = 'Mínimo 4 caracteres.';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      this.erroresDatos['email'] = 'Formato de correo inválido.';

    if (!/^\d+$/.test(d.telefono))
      this.erroresDatos['telefono'] = 'El teléfono solo puede contener números.';
    else if (d.telefono.length < 9)
      this.erroresDatos['telefono'] = 'El teléfono debe tener al menos 9 dígitos.';

    return Object.keys(this.erroresDatos).length === 0;
  }

  continuarAlPago(): void {
    if (!this.validarDatos()) return;
    this.paso.set(2);
  }

  // ---- Formateo tarjeta ----
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

  // ---- Validación paso 2 ----
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
    setTimeout(() => {
      this.procesando.set(false);
      if (this.isStandalone) {
        this.router.navigate(['/checkout', this.guid, 'confirmacion']);
      } else {
        this.pagoExitoso.emit();
      }
    }, 1800);
  }

  cancelar(): void {
    if (this.isStandalone) {
      this.router.navigate(['/vuelos/resultados']);
    } else {
      this.onCancel.emit();
    }
  }

  volverAlPaso1(): void {
    if (this.initialStep === 1) {
      this.paso.set(1);
    }
  }

  get hayErroresTarjeta(): boolean {
    return Object.keys(this.erroresTarjeta).length > 0;
  }
}
