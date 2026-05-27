import {
  Component, OnInit, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import {
  VehicleItem, Extra, DatosConductor, DatosCliente, CriteriosBusquedaAutos, Localizacion
} from '../shared/car.models';
import { EXTRAS_MOCK } from '../shared/car-mock.data';
import { CarService, ReservaAutoPayload } from '../services/car.service';
import { PaymentComponent } from '../../../components/checkout/payment/payment.component';
import { ConfirmationComponent } from '../../../components/checkout/confirmation/confirmation.component';

type Paso = 1 | 2 | 3;

export interface ExtraConCantidad {
  extra: Extra;
  cantidad: number;
}

@Component({
  selector: 'app-car-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent, PaymentComponent, ConfirmationComponent],
  templateUrl: './car-checkout.component.html',
  styleUrls: ['./car-checkout.component.css'],
})
export class CarCheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carService = inject(CarService);

  vehiculo = signal<VehicleItem | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  paso = signal<Paso>(1);
  procesando = signal(false);
  errorReserva = signal<string | null>(null);
  
  mostrarPago = signal(false);
  mostrarConfirmacion = signal(false);
  reservaGeneradaId = signal<string>('');

  readonly extras = EXTRAS_MOCK;
  localizaciones: Localizacion[] = [];

  // Paso 1: Extras
  extrasSeleccionados = signal<ExtraConCantidad[]>([]);

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

  otrosPasajeros: DatosConductor[] = [];
  erroresPasajeros: any[] = [];

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

  readonly paymentDetails = computed(() => {
    const list: { name: string; value: number }[] = [];
    const car = this.vehiculo();
    if (car) {
      list.push({
        name: `Alquiler de ${car.marca} ${car.modelo} (x${this.cantidadDias()} días)`,
        value: this.subtotalVehiculo()
      });
    }
    this.extrasSeleccionados().forEach((e) => {
      if (e.cantidad > 0) {
        list.push({
          name: `${e.extra.nombre} (x${e.cantidad})`,
          value: e.extra.valorFijo * e.cantidad
        });
      }
    });
    return list;
  });

  readonly localizacionDevolucion = computed(() => {
    if (!this.idLocalizacionDevolucion()) return this.vehiculo()?.localizacion ?? null;
    return this.localizaciones.find(l => l.idLocalizacion === this.idLocalizacionDevolucion())
      ?? this.vehiculo()?.localizacion
      ?? null;
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) { this.router.navigate(['/autos/resultados']); return; }
    const id = +idParam;

    const usuarioGuid = localStorage.getItem('usuarioGuid');
    if (usuarioGuid) {
      this.carService.getClientePorUsuarioGuid(usuarioGuid).subscribe(cliente => {
        if (cliente) {
          this.conductor.nombres = cliente.nombres || '';
          this.conductor.apellidos = cliente.apellidos || '';
          this.conductor.correo = cliente.correo || '';
          this.conductor.telefono = cliente.telefono || '';
          this.conductor.numeroIdentificacion = cliente.numeroIdentificacion || '';
          if (cliente.tipoIdentificacion === 'CI' || cliente.tipoIdentificacion === 'CEDULA') {
             this.conductor.tipoIdentificacion = 'CEDULA';
          } else if (cliente.tipoIdentificacion === 'PAS' || cliente.tipoIdentificacion === 'PASAPORTE') {
             this.conductor.tipoIdentificacion = 'PASAPORTE';
          } else if (cliente.tipoIdentificacion === 'RUC') {
             this.conductor.tipoIdentificacion = 'RUC';
          } else {
             this.conductor.tipoIdentificacion = 'CEDULA'; // default
          }
        } else {
          this.fillConductorFromLocalStorageFallback();
        }
      });
    } else {
      this.fillConductorFromLocalStorageFallback();
    }

    const provider = sessionStorage.getItem('car-provider') ?? undefined;
    const raw = sessionStorage.getItem('car-selected');

    // Siempre cargar localizaciones, pero solo del proveedor si existe
    this.carService.getLocalizaciones(provider).subscribe(locs => this.localizaciones = locs);

    // Inicializar extras con MOCK mientras carga el API
    this.extrasSeleccionados.set(EXTRAS_MOCK.map((e) => ({ extra: e, cantidad: 0 })));

    if (raw && provider) {
      const v: VehicleItem = JSON.parse(raw);
      if (v.idVehiculo === id) {
        this.vehiculo.set(v);
        this.idLocalizacionDevolucion.set(v.localizacion?.idLocalizacion ?? null);
        this.cargarExtras(provider);
        return;
      }
    }

    if (provider) {
      this.carService.getVehiculoById(id, provider).subscribe(v => {
        if (!v) {
          this.error.set('No se encontró el vehículo. Por favor vuelve a buscar.');
          this.loading.set(false);
        } else {
          this.vehiculo.set(v);
          this.idLocalizacionDevolucion.set(v.localizacion?.idLocalizacion ?? null);
          this.cargarExtras(provider);
        }
      });
    } else {
       this.error.set('No se encontró el proveedor del vehículo. Por favor vuelve a buscar.');
       this.loading.set(false);
    }
  }

  private fillConductorFromLocalStorageFallback(): void {
    const nombre = localStorage.getItem('nombre') ?? '';
    const email = localStorage.getItem('email') ?? '';
    this.conductor.nombres = nombre.split(' ')[0] ?? '';
    this.conductor.apellidos = nombre.split(' ').slice(1).join(' ') ?? '';
    this.conductor.correo = email;
  }

  private cargarExtras(provider: string): void {
    this.carService.getExtras(provider).subscribe({
      next: (extras) => {
        if (extras && extras.length > 0) {
          this.extrasSeleccionados.set(extras.map((e) => ({
            extra: { ...e, icono: e.icono ?? 'add_circle' },
            cantidad: 0
          })));
        }
      },
      error: () => {
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  // ─── Paso 1: Extras ───────────────────────────────────────────────────────
  setCantidad(idx: number, delta: number): void {
    const arr = [...this.extrasSeleccionados()];
    arr[idx] = { ...arr[idx], cantidad: Math.max(0, arr[idx].cantidad + delta) };
    this.extrasSeleccionados.set(arr);
  }

  continuarAPaso2(): void { this.paso.set(2); window.scrollTo({ top: 0 }); }

  // ─── Paso 2: Pasajeros ────────────────────────────────────────────────────
  agregarPasajero(): void {
    const max = this.vehiculo()?.capacidadPasajeros ?? 5;
    if (this.otrosPasajeros.length + 1 >= max) {
      return;
    }

    this.otrosPasajeros.push({
      nombres: '',
      apellidos: '',
      tipoIdentificacion: 'CEDULA',
      numeroIdentificacion: '',
      fechaVencimientoLicencia: '',
      edadConductor: null,
      correo: '',
      telefono: '',
      esPrincipal: false,
    });
    this.erroresPasajeros.push({});
  }

  eliminarPasajero(index: number): void {
    this.otrosPasajeros.splice(index, 1);
    this.erroresPasajeros.splice(index, 1);
  }

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

    let pasajerosValidos = true;
    this.erroresPasajeros = this.otrosPasajeros.map(() => ({}));

    this.otrosPasajeros.forEach((p, i) => {
      if (!p.nombres.trim() || p.nombres.trim().length < 2) {
        this.erroresPasajeros[i]['nombres'] = 'Mínimo 2 caracteres.';
        pasajerosValidos = false;
      }
      if (!p.apellidos.trim() || p.apellidos.trim().length < 2) {
        this.erroresPasajeros[i]['apellidos'] = 'Mínimo 2 caracteres.';
        pasajerosValidos = false;
      }
      if (!p.numeroIdentificacion.trim()) {
        this.erroresPasajeros[i]['numeroIdentificacion'] = 'Campo requerido.';
        pasajerosValidos = false;
      }
      if (!p.fechaVencimientoLicencia) {
        this.erroresPasajeros[i]['fechaVencimientoLicencia'] = 'Campo requerido.';
        pasajerosValidos = false;
      }
      if (!p.edadConductor || p.edadConductor < 18) {
        this.erroresPasajeros[i]['edadConductor'] = 'Mínimo 18 años.';
        pasajerosValidos = false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo)) {
        this.erroresPasajeros[i]['correo'] = 'Correo inválido.';
        pasajerosValidos = false;
      }
      if (!p.telefono.trim() || p.telefono.trim().length < 7) {
        this.erroresPasajeros[i]['telefono'] = 'Mínimo 7 dígitos.';
        pasajerosValidos = false;
      }
    });

    return Object.keys(this.erroresConductor).length === 0 && pasajerosValidos;
  }

  continuarAPaso3(): void {
    if (!this.validarConductor()) return;
    this.paso.set(3);
    window.scrollTo({ top: 0 });
  }

  // ─── Paso 3: Iniciar Pago ───────────────────────────────────────────────────
  iniciarPago(): void {
    const v = this.vehiculo();
    if (!v || !v.provider) return;

    this.procesando.set(true);
    this.errorReserva.set(null);

    const rawCrit = sessionStorage.getItem('car-criterios');
    let rec = v.disponibilidad?.fechaRecogida ?? '';
    let dev = v.disponibilidad?.fechaDevolucion ?? '';

    if (rawCrit) {
      const crit: CriteriosBusquedaAutos = JSON.parse(rawCrit);
      if (crit.fechaRecogida) rec = crit.fechaRecogida;
      if (crit.fechaDevolucion) dev = crit.fechaDevolucion;
    }

    const idLocRec = v.localizacion?.idLocalizacion ?? 0;

    this.carService.verificarDisponibilidad(v.idVehiculo, v.provider, rec, dev, idLocRec).subscribe(disponible => {
      this.procesando.set(false);
      if (!disponible) {
        this.errorReserva.set('Lo sentimos, el vehículo ya no está disponible para estas fechas.');
        return;
      }

      this.mostrarPago.set(true);
    });
  }
  
  cancelarPago(): void {
    this.mostrarPago.set(false);
  }

  // ─── Procesar POST a /reservas (después del pago simulado) ────────────────
  procesarReservaAPI(): void {
    const v = this.vehiculo();
    if (!v || !v.provider) return;
    
    this.procesando.set(true);

    const rawCrit = sessionStorage.getItem('car-criterios');
    let rec = v.disponibilidad?.fechaRecogida ?? '';
    let dev = v.disponibilidad?.fechaDevolucion ?? '';

    if (rawCrit) {
      const crit: CriteriosBusquedaAutos = JSON.parse(rawCrit);
      if (crit.fechaRecogida) rec = crit.fechaRecogida;
      if (crit.fechaDevolucion) dev = crit.fechaDevolucion;
    }

    const idLocRec = v.localizacion?.idLocalizacion ?? 0;
    const idLocDev = this.idLocalizacionDevolucion() ?? idLocRec;

    const payload: ReservaAutoPayload = {
      idVehiculo: v.idVehiculo,
      idLocalizacionRecogida: idLocRec,
      idLocalizacionDevolucion: idLocDev,
      fechaInicio: rec,
      fechaFin: dev,
      horaInicio: this.horaRecogida(),
      horaFin: this.horaDevolucion(),
      cliente: {
        nombres: this.conductor.nombres,
        apellidos: this.conductor.apellidos,
        tipoIdentificacion: this.conductor.tipoIdentificacion,
        numeroIdentificacion: this.conductor.numeroIdentificacion,
        correo: this.conductor.correo,
        telefono: this.conductor.telefono,
      },
      conductores: [
        {
          nombres: this.conductor.nombres,
          apellidos: this.conductor.apellidos,
          tipoIdentificacion: this.conductor.tipoIdentificacion,
          numeroIdentificacion: this.conductor.numeroIdentificacion,
          fechaVencimientoLicencia: this.conductor.fechaVencimientoLicencia,
          edadConductor: this.conductor.edadConductor,
          correo: this.conductor.correo,
          telefono: this.conductor.telefono,
          esPrincipal: true,
        },
        ...this.otrosPasajeros.map(p => ({
          nombres: p.nombres,
          apellidos: p.apellidos,
          tipoIdentificacion: p.tipoIdentificacion,
          numeroIdentificacion: p.numeroIdentificacion,
          fechaVencimientoLicencia: p.fechaVencimientoLicencia,
          edadConductor: p.edadConductor,
          correo: p.correo,
          telefono: p.telefono,
          esPrincipal: false,
        }))
      ],
      extras: this.extrasResumen().map(e => ({
        idExtra: e.extra.idExtra,
        cantidad: e.cantidad,
      })),
    };

    this.carService.crearReserva(v.provider, payload).subscribe(reserva => {
      this.procesando.set(false);
      this.mostrarPago.set(false);

      if (!reserva) {
        this.errorReserva.set('No se pudo crear la reserva. Por favor contacta soporte.');
        return;
      }

      const guidCliente = localStorage.getItem('guidCliente') || '';
      const payloadCliente = {
        guidCliente: guidCliente,
        guidServicioRef: "1541e52c-4923-4f67-b5fb-6d4733483fee",
        nombreServicioSnap: `${reserva.vehiculo?.marca} ${reserva.vehiculo?.modelo}`,
        tipoServicioSnap: "2",
        nombreProveedor: v.provider,
        idReservaExterna: reserva.codigoReserva,
        fechaInicio: reserva.fechaInicio ? new Date(`${reserva.fechaInicio}T00:00:00Z`).toISOString() : new Date().toISOString(),
        fechaFin: reserva.fechaFin ? new Date(`${reserva.fechaFin}T00:00:00Z`).toISOString() : new Date().toISOString(),
        canalorigen: "Pooking",
        montoTotal: reserva.total,
        moneda: "USD",
        observaciones: "Reserva de vehículo"
      };

      this.carService.registrarReservaCliente(payloadCliente).subscribe();

      sessionStorage.removeItem('car-selected');
      sessionStorage.removeItem('car-provider');
      sessionStorage.removeItem('car-criterios');
      
      this.reservaGeneradaId.set(String(reserva.idReserva || reserva.codigoReserva));
      this.mostrarConfirmacion.set(true);
    });
  }

  volver(p: Paso): void { this.paso.set(p); window.scrollTo({ top: 0 }); }

  cancelar(): void { this.router.navigate(['/autos/resultados']); }

  irAInicio(): void { this.router.navigate(['/']); }
}
