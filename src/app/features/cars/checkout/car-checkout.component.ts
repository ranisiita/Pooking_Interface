import {
  Component, OnInit, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import {
  VehicleItem, Extra, DatosConductor, DatosCliente
} from '../shared/car.models';
import {
  VEHICULOS_MOCK, EXTRAS_MOCK, LOCALIZACIONES_MOCK
} from '../shared/car-mock.data';

type Paso = 1 | 2 | 3;

export interface ExtraConCantidad {
  extra: Extra;
  cantidad: number;
}

@Component({
  selector: 'app-car-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './car-checkout.component.html',
  styleUrls: ['./car-checkout.component.css'],
})
export class CarCheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  vehiculo = signal<VehicleItem | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  paso = signal<Paso>(1);
  procesando = signal(false);
  codigoReserva = signal<string | null>(null);

  readonly extras = EXTRAS_MOCK;
  readonly localizaciones = LOCALIZACIONES_MOCK;

  // Paso 1: Extras
  extrasSeleccionados = signal<ExtraConCantidad[]>(
    EXTRAS_MOCK.map((e) => ({ extra: e, cantidad: 0 }))
  );

  // Paso 2: Conductor
  conductor: DatosConductor = {
    nombres: '',
    apellidos: '',
    tipoIdentificacion: 'CEDULA',
    numeroIdentificacion: '',
    fechaVencimientoLicencia: '',
    edadConductor: null,
    correo: '',
    telefono: '',
    esPrincipal: true,
  };

  // Fechas
  idLocalizacionDevolucion = signal<number | null>(null);
  horaRecogida = signal('08:00');
  horaDevolucion = signal('10:00');

  erroresConductor: Partial<Record<keyof DatosConductor, string>> = {};

  // ── Computed prices ──
  readonly subtotalVehiculo = computed(() => this.vehiculo()?.precio.subtotalVehiculo ?? 0);

  readonly subtotalExtras = computed(() =>
    this.extrasSeleccionados()
      .reduce((acc, e) => acc + e.extra.valorFijo * e.cantidad, 0)
  );

  readonly subtotal = computed(() => +(this.subtotalVehiculo() + this.subtotalExtras()).toFixed(2));
  readonly iva = computed(() => +(this.subtotal() * 0.15).toFixed(2));
  readonly total = computed(() => +(this.subtotal() + this.iva()).toFixed(2));

  readonly extrasResumen = computed(() =>
    this.extrasSeleccionados().filter((e) => e.cantidad > 0)
  );

  readonly cantidadDias = computed(() => this.vehiculo()?.disponibilidad.cantidadDias ?? 1);

  readonly localizacionDevolucion = computed(() => {
    const id = this.idLocalizacionDevolucion();
    return id ? this.localizaciones.find((l) => l.idLocalizacion === id) ?? null : null;
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) { this.router.navigate(['/autos/resultados']); return; }
    const id = +idParam;

    const nombre = localStorage.getItem('nombre') ?? '';
    const email = localStorage.getItem('email') ?? '';
    this.conductor.nombres = nombre.split(' ')[0] ?? '';
    this.conductor.apellidos = nombre.split(' ').slice(1).join(' ') ?? '';
    this.conductor.correo = email;

    const raw = sessionStorage.getItem('car-selected');
    const rawList = sessionStorage.getItem('car-results');
    const lista: VehicleItem[] = rawList ? JSON.parse(rawList) : VEHICULOS_MOCK;

    let v: VehicleItem | null = raw ? JSON.parse(raw) : null;
    if (!v || v.idVehiculo !== id) {
      v = lista.find((x) => x.idVehiculo === id) ?? VEHICULOS_MOCK.find((x) => x.idVehiculo === id) ?? null;
    }

    if (!v) {
      this.error.set('No se encontró el vehículo. Por favor vuelve a buscar.');
      this.loading.set(false);
      return;
    }

    this.vehiculo.set(v);
    this.idLocalizacionDevolucion.set(v.localizacion.idLocalizacion);
    this.loading.set(false);
  }

  // ─── Paso 1: Extras ───────────────────────────────────────────────────────
  setCantidad(idx: number, delta: number): void {
    const arr = [...this.extrasSeleccionados()];
    arr[idx] = { ...arr[idx], cantidad: Math.max(0, arr[idx].cantidad + delta) };
    this.extrasSeleccionados.set(arr);
  }

  continuarAPaso2(): void { this.paso.set(2); window.scrollTo({ top: 0 }); }

  // ─── Paso 2: Conductor ────────────────────────────────────────────────────
  private validarConductor(): boolean {
    this.erroresConductor = {};
    const c = this.conductor;

    if (!c.nombres.trim() || c.nombres.trim().length < 2)
      this.erroresConductor['nombres'] = 'Mínimo 2 caracteres.';

    if (!c.apellidos.trim() || c.apellidos.trim().length < 2)
      this.erroresConductor['apellidos'] = 'Mínimo 2 caracteres.';

    if (!c.numeroIdentificacion.trim())
      this.erroresConductor['numeroIdentificacion'] = 'Campo requerido.';

    if (!c.fechaVencimientoLicencia)
      this.erroresConductor['fechaVencimientoLicencia'] = 'Campo requerido.';
    else if (new Date(c.fechaVencimientoLicencia) <= new Date())
      this.erroresConductor['fechaVencimientoLicencia'] = 'La licencia debe estar vigente.';

    if (!c.edadConductor || c.edadConductor < 18)
      this.erroresConductor['edadConductor'] = 'Mínimo 18 años.';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo))
      this.erroresConductor['correo'] = 'Correo inválido.';

    if (!c.telefono.trim() || c.telefono.trim().length < 7)
      this.erroresConductor['telefono'] = 'Mínimo 7 dígitos.';

    return Object.keys(this.erroresConductor).length === 0;
  }

  continuarAPaso3(): void {
    if (!this.validarConductor()) return;
    this.paso.set(3);
    window.scrollTo({ top: 0 });
  }

  // ─── Paso 3: Confirmar ────────────────────────────────────────────────────
  confirmarReserva(): void {
    this.procesando.set(true);
    setTimeout(() => {
      this.procesando.set(false);
      const year = new Date().getFullYear();
      const num = String(Math.floor(Math.random() * 90000) + 10000);
      this.codigoReserva.set(`RC-${year}-${num}`);
      this.paso.set(3);
      window.scrollTo({ top: 0 });
    }, 1800);
  }

  volver(p: Paso): void { this.paso.set(p); window.scrollTo({ top: 0 }); }

  cancelar(): void { this.router.navigate(['/autos/resultados']); }

  irAInicio(): void { this.router.navigate(['/']); }
}
