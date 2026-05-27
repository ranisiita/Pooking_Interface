import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { PaymentComponent } from '../../../components/checkout/payment/payment.component';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';
import {
  ACTIVE_ATTRACTION_PROVIDER,
  ALL_ATTRACTION_PROVIDERS,
  ATTRACTION_PROVIDER_LABELS,
  AtraccionesService,
} from '../services/atracciones.service';
import {
  AtraccionDetalle,
  AttractionProvider,
  ClienteInvitado,
  FacturaCreada,
  Horario,
  LineaReserva,
  PagoConfirmacionBody,
  ReservaCreada,
  ReservaPayload,
  Ticket,
} from '../models/atracciones.models';
import {
  BookingReservaPayload,
  BookingReservasService,
  TIPO_SERVICIO_GUIDS,
} from '../../../shared/services/booking-reservas.service';

type EstadoCarga = 'loading' | 'success' | 'not_found' | 'error';
type CampoCliente =
  | 'tipo_identificacion'
  | 'numero_identificacion'
  | 'nombres'
  | 'apellidos'
  | 'correo'
  | 'telefono';

@Component({
  selector: 'app-atracciones-reserva',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NavbarComponent,
    FooterComponent,
    PaymentComponent,
    DatePickerComponent,
  ],
  templateUrl: './atracciones-reserva.component.html',
  styleUrls: ['./atracciones-reserva.component.css'],
})
export class AtraccionesReservaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(AtraccionesService);
  private booking = inject(BookingReservasService);

  // ── Carga del detalle ────────────────────────────────────
  estado = signal<EstadoCarga>('loading');
  errorMsg = signal<string | null>(null);
  detalle = signal<AtraccionDetalle | null>(null);

  /** Proveedor de origen de la atracción (viaja por queryParam). */
  provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER;

  // ── Horarios ─────────────────────────────────────────────
  horariosLoading = signal(false);
  horariosError = signal<string | null>(null);
  /** Lista cruda de horarios devuelta por el backend (próximos N días). */
  horariosCrudos = signal<Horario[]>([]);
  /** Días a mostrar desde `fechaInicio`. Valores: 1, 3, 7, 15. */
  rangoDias = signal<1 | 3 | 7 | 15>(7);
  /** Horarios visibles tras aplicar el filtro por rango. */
  readonly horarios = computed<Horario[]>(() => {
    const inicio = this.fechaInicio();
    const fin = this.fechaFinRango();
    if (!inicio || !fin) return this.horariosCrudos();
    return this.horariosCrudos().filter((h) => h.fecha >= inicio && h.fecha <= fin);
  });
  /** Fecha "hasta" derivada de fechaInicio + rangoDias. */
  readonly fechaFinRango = computed<string>(() => {
    const inicio = this.fechaInicio();
    const dias = this.rangoDias();
    if (!inicio) return '';
    const d = new Date(inicio + 'T00:00:00');
    d.setDate(d.getDate() + (dias - 1));
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  });

  // ── Tickets del horario ──────────────────────────────────
  ticketsLoading = signal(false);
  ticketsError = signal<string | null>(null);
  ticketsHorario = signal<Ticket[]>([]);

  // ── Selecciones ──────────────────────────────────────────
  today = new Date().toISOString().split('T')[0];
  /** Fecha "desde" del filtro de horarios. Default: hoy. */
  fechaInicio = signal<string>(this.today);
  fechaError = '';
  horarioSeleccionado = signal<Horario | null>(null);
  cantidades = signal<Record<string, number>>({});

  // ── Cliente invitado (template-driven, como booking) ────
  cliente: ClienteInvitado = {
    tipo_identificacion: '',
    numero_identificacion: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    direccion: '',
  };
  touched: Record<string, boolean> = {};

  // ── Estado final ─────────────────────────────────────────
  payloadListo = signal<ReservaPayload | null>(null);
  reservaCreada = signal<ReservaCreada | null>(null);
  enviando = signal(false);
  errorReserva = signal<string | null>(null);
  /** Aviso suave si el registro en /clientes/reservas falló o se omitió. */
  advertenciaRegistro = signal<string | null>(null);

  // ── Hall de pagos embebido (mismo <app-payment> que usa lodging) ──
  mostrarPago = signal(false);
  enviandoPago = signal(false);
  errorPago = signal<string | null>(null);
  factura = signal<FacturaCreada | null>(null);
  /** Datos del receptor editados dentro de `<app-payment>` (paso 1). */
  private datosReceptorPago: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
  } | null = null;

  // ── Computed ─────────────────────────────────────────────
  readonly totalTickets = computed(() =>
    Object.values(this.cantidades()).reduce((acc, n) => acc + (n || 0), 0),
  );

  readonly subtotalEstimado = computed(() => {
    const tickets = this.ticketsHorario();
    const cants = this.cantidades();
    return tickets.reduce((acc, t) => acc + (cants[t.tck_guid] ?? 0) * t.precio, 0);
  });

  readonly monedaActiva = computed(() => {
    const t = this.ticketsHorario();
    return t[0]?.moneda ?? this.detalle()?.moneda ?? 'USD';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.estado.set('not_found');
      return;
    }
    const provQp = this.route.snapshot.queryParamMap.get('provider');
    if (provQp && (ALL_ATTRACTION_PROVIDERS as string[]).includes(provQp)) {
      this.provider = provQp as AttractionProvider;
    }
    this.cargarDetalle(id);
  }

  // ── Carga inicial ────────────────────────────────────────
  cargarDetalle(id: string): void {
    this.estado.set('loading');
    this.svc.getAtraccionDetalle(id, this.provider).subscribe({
      next: (resp) => {
        this.detalle.set(resp.data);
        this.estado.set('success');
        // Carga los horarios futuros una sola vez; el filtro por rango es local.
        this.cargarHorarios();
      },
      error: (err) => {
        if (err?.status === 404) this.estado.set('not_found');
        else {
          this.estado.set('error');
          this.errorMsg.set('No pudimos cargar la atracción.');
        }
      },
    });
  }

  // ── Filtro de fecha / rango ──────────────────────────────
  onFechaInicioChange(nueva: string): void {
    if (!nueva) {
      this.fechaError = '';
      this.fechaInicio.set('');
      return;
    }
    if (nueva < this.today) {
      this.fechaError = 'No puedes elegir una fecha anterior a hoy.';
      return;
    }
    this.fechaError = '';
    this.fechaInicio.set(nueva);
    this.limpiarSeleccionFueraDelRango();
  }

  /** Cambia el rango en días (1, 3, 7 o 15). */
  setRango(dias: 1 | 3 | 7 | 15): void {
    if (this.rangoDias() === dias) return;
    this.rangoDias.set(dias);
    this.limpiarSeleccionFueraDelRango();
  }

  /** Si el horario seleccionado queda fuera del rango activo, lo limpia. */
  private limpiarSeleccionFueraDelRango(): void {
    const sel = this.horarioSeleccionado();
    if (!sel) return;
    const enRango = this.horarios().some((h) => h.hor_guid === sel.hor_guid);
    if (!enRango) {
      this.horarioSeleccionado.set(null);
      this.ticketsHorario.set([]);
      this.cantidades.set({});
    }
  }

  /**
   * Carga todos los horarios futuros del backend en una sola consulta.
   * El filtro por rango se aplica localmente en el `computed` `horarios`.
   */
  cargarHorarios(): void {
    const d = this.detalle();
    if (!d) return;
    this.horariosLoading.set(true);
    this.horariosError.set(null);
    this.svc.getHorarios(d.id, undefined, this.provider).subscribe({
      next: (resp) => {
        this.horariosCrudos.set(resp.data ?? []);
        this.horariosLoading.set(false);
        this.limpiarSeleccionFueraDelRango();
      },
      error: () => {
        this.horariosError.set('No pudimos cargar los horarios disponibles.');
        this.horariosCrudos.set([]);
        this.horariosLoading.set(false);
      },
    });
  }

  // ── Horario ──────────────────────────────────────────────
  seleccionarHorario(h: Horario): void {
    this.horarioSeleccionado.set(h);
    this.cargarTicketsHorario(h.hor_guid);
  }

  cargarTicketsHorario(horGuid: string): void {
    const d = this.detalle();
    if (!d) return;
    this.ticketsLoading.set(true);
    this.ticketsError.set(null);
    this.svc.getHorarioTickets(d.id, horGuid, this.provider).subscribe({
      next: (resp) => {
        this.ticketsHorario.set(resp.data.items);
        // Reset cantidades a 0 para cada ticket nuevo.
        const mapa: Record<string, number> = {};
        for (const t of resp.data.items) mapa[t.tck_guid] = 0;
        this.cantidades.set(mapa);
        this.ticketsLoading.set(false);
      },
      error: () => {
        this.ticketsError.set('No pudimos cargar los tickets de este horario.');
        this.ticketsHorario.set([]);
        this.cantidades.set({});
        this.ticketsLoading.set(false);
      },
    });
  }

  // ── Cantidades por ticket ────────────────────────────────
  incrementar(tckGuid: string): void {
    const cupos = this.horarioSeleccionado()?.cupos ?? Number.POSITIVE_INFINITY;
    this.cantidades.update((m) => {
      const actual = m[tckGuid] ?? 0;
      if (this.totalTickets() >= cupos) return m;
      return { ...m, [tckGuid]: actual + 1 };
    });
  }

  decrementar(tckGuid: string): void {
    this.cantidades.update((m) => {
      const actual = m[tckGuid] ?? 0;
      return { ...m, [tckGuid]: Math.max(0, actual - 1) };
    });
  }

  // ── Validaciones del cliente (mismo patrón que booking) ──
  onTouch(campo: CampoCliente): void {
    this.touched[campo] = true;
  }

  isFieldError(campo: CampoCliente): boolean {
    if (!this.touched[campo]) return false;
    return !!this.getFieldErrorMsg(campo);
  }

  getFieldErrorMsg(campo: CampoCliente): string {
    const v = (this.cliente as any)[campo] as string;
    if (!v || !v.trim()) {
      return 'Este campo es obligatorio.';
    }
    if (campo === 'correo') {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      if (!ok) return 'Ingresa un correo válido.';
    }
    if (campo === 'telefono') {
      const ok = /^[0-9+\s-]{7,15}$/.test(v.trim());
      if (!ok) return 'Ingresa un teléfono válido.';
    }
    if (campo === 'numero_identificacion') {
      if (v.trim().length < 5) return 'Debe tener al menos 5 caracteres.';
    }
    return '';
  }

  // ── Validación global de la reserva ──────────────────────
  get puedeReservar(): boolean {
    return (
      !!this.fechaInicio() &&
      this.fechaInicio() >= this.today &&
      !!this.horarioSeleccionado() &&
      this.totalTickets() > 0 &&
      this.clienteValido()
    );
  }

  clienteValido(): boolean {
    const camposReq: CampoCliente[] = [
      'tipo_identificacion',
      'numero_identificacion',
      'nombres',
      'apellidos',
      'correo',
      'telefono',
    ];
    return camposReq.every((c) => {
      const v = (this.cliente as any)[c] as string;
      if (!v || !v.trim()) return false;
      if (c === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return false;
      if (c === 'telefono' && !/^[0-9+\s-]{7,15}$/.test(v.trim())) return false;
      if (c === 'numero_identificacion' && v.trim().length < 5) return false;
      return true;
    });
  }

  // ── Construcción del payload (sin enviar la API real) ───
  reservar(): void {
    // Marca todos los campos como touched para que se vean los errores.
    (['tipo_identificacion', 'numero_identificacion', 'nombres', 'apellidos', 'correo', 'telefono'] as CampoCliente[])
      .forEach((c) => (this.touched[c] = true));

    if (!this.puedeReservar) return;

    const d = this.detalle()!;
    const horario = this.horarioSeleccionado()!;
    const cants = this.cantidades();

    const lineas: LineaReserva[] = this.ticketsHorario()
      .map((t) => ({ tck_guid: t.tck_guid, cantidad: cants[t.tck_guid] ?? 0 }))
      .filter((l) => l.cantidad > 0);

    const payload: ReservaPayload = {
      at_guid: d.id,
      hor_guid: horario.hor_guid,
      fecha_visita: horario.fecha,
      lineas,
      origen_canal: 'BOOKING',
      cliente_invitado: {
        tipo_identificacion: this.cliente.tipo_identificacion,
        numero_identificacion: this.cliente.numero_identificacion.trim(),
        nombres: this.cliente.nombres.trim(),
        apellidos: this.cliente.apellidos.trim(),
        correo: this.cliente.correo.trim(),
        telefono: this.cliente.telefono.trim(),
        direccion: (this.cliente.direccion ?? '').trim() || undefined,
      },
    };

    // POST real a /{provider}/api/v2/reservas (provider de origen de la atracción).
    this.payloadListo.set(payload);
    this.enviando.set(true);
    this.errorReserva.set(null);
    this.advertenciaRegistro.set(null);
    this.svc.crearReserva(payload, this.provider).subscribe({
      next: (resp) => {
        this.reservaCreada.set(resp.data);
        this.enviando.set(false);
        console.info('[Reserva] Respuesta del backend:', resp);
        // Persiste la imagen real de la atracción indexada por rev_guid,
        // para que el historial (Profile) pueda mostrarla luego — el
        // endpoint general /clientes/reservas no devuelve la imagen.
        this.persistirImagenAtraccion(resp.data.rev_guid);
        // Registro en la base general de clientes/Booking en cuanto tenemos
        // rev_guid. La reserva nace PENDIENTE; la actualización de estado
        // a PAGADA se hará después en el flujo de pago si aplica.
        this.registrarEnClientes(resp.data);
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorReserva.set(this.mensajeErrorReserva(err));
        console.error('[Reserva] Error al crear reserva:', err);
      },
    });
  }

  /**
   * Guarda en localStorage la imagen real de la atracción indexada por
   * `rev_guid`. El historial (Profile) lee esto para mostrar la imagen
   * correcta en la card de cada reserva (el backend general
   * `/clientes/reservas` no la expone).
   *
   * Estructura en storage:
   *   pooking_atracciones_images = { "<rev_guid>": "<url>", ... }
   */
  private persistirImagenAtraccion(revGuid: string): void {
    if (!revGuid) return;
    const imagen = this.detalle()?.imagen_principal;
    if (!imagen) return;
    try {
      const raw = localStorage.getItem('pooking_atracciones_images') ?? '{}';
      const map = JSON.parse(raw);
      map[revGuid] = imagen;
      // Si el storage crece demasiado, podaríamos por LRU — por ahora se
      // queda chico (cada entrada es pequeña). No expira.
      localStorage.setItem('pooking_atracciones_images', JSON.stringify(map));
      console.info('[Reserva] Imagen de atracción persistida para', revGuid);
    } catch (e) {
      console.warn('[Reserva] No se pudo persistir la imagen de atracción:', e);
    }
  }

  /**
   * Registra la reserva recién creada en el endpoint del middleware
   * `POST /clientes/reservas` para que aparezca en la tabla general de
   * reservas del cliente. Es best-effort: si falla, el flujo de pago sigue
   * adelante pero queda advertencia en consola y `advertenciaRegistro`.
   *
   * NOTA: se ejecuta a nivel de creación (estado PENDIENTE). Si el flujo
   * de pago confirma con éxito, esa misma reserva en atracciones queda en
   * PAGADA — pero en el registro general permanece como PENDIENTE hasta
   * que el backend exponga un endpoint de actualización de estado.
   */
  private registrarEnClientes(r: ReservaCreada): void {
    const guidCliente = BookingReservasService.obtenerGuidCliente();
    // Logs temporales — TODO(debug): retirar tras validación en prod.
    console.info('[Reserva] guidCliente leído de localStorage:', guidCliente);
    console.info('[Reserva] provider de origen:', this.provider);
    console.info('[Reserva] rev_guid:', r.rev_guid);

    if (!guidCliente) {
      console.warn(
        '[Reserva] Sin guidCliente — no se registra en /clientes/reservas (usuario invitado).',
      );
      // No bloqueamos el flujo del usuario; se le avisa en el modal.
      this.advertenciaRegistro.set(
        'Tu reserva quedó creada con el proveedor, pero como invitado no la asociamos a tu historial. Inicia sesión la próxima vez para guardar tus reservas.',
      );
      return;
    }

    const payload: BookingReservaPayload = {
      guidCliente,
      guidServicioRef: TIPO_SERVICIO_GUIDS.ATRACCIONES,
      nombreServicioSnap: r.atraccion_nombre,
      // Mismo patrón que cars (`"2"` para vehículos). Atracciones = 3 según
      // la tabla de tipos de servicio del backend.
      tipoServicioSnap: '3',
      nombreProveedor: ATTRACTION_PROVIDER_LABELS[this.provider] ?? this.provider,
      idReservaExterna: r.rev_guid,
      fechaInicio: BookingReservasService.combinarFechaHora(r.hor_fecha, r.hor_hora_inicio),
      fechaFin: BookingReservasService.combinarFechaHora(r.hor_fecha, r.hor_hora_fin),
      // El valor real que aceptan la tabla y los demás flujos es "Pooking"
      // (con P mayúscula), no "BOOKING". Confirmado revisando cars.
      canalOrigen: 'Pooking',
      montoTotal: r.rev_total,
      moneda: r.moneda,
      // Código corto del estado para alinearse con el formato general
      // ("PEND" en vez de "PENDIENTE"). El estado a nivel de microservicio
      // de atracciones sí sigue siendo "PENDIENTE" — esto es solo para la
      // descripción legible que se guarda en observaciones.
      observaciones: `Reserva atracción ${r.atraccion_nombre} - Código ${r.rev_codigo} - Estado PEND`,
    };

    console.info('[Reserva] URL final:', this.booking.endpointUrl);
    console.info('[Reserva] canalOrigen:', payload.canalOrigen);
    console.info('[Reserva] tipoServicioSnap:', payload.tipoServicioSnap);
    console.info('[Reserva] Payload /clientes/reservas:', payload);

    this.booking.registrarReserva(payload).subscribe({
      next: (resp) => {
        console.info(
          '[Reserva] /clientes/reservas OK · idReservaExterna=',
          payload.idReservaExterna,
          '· response=',
          resp,
        );
      },
      error: (err) => {
        console.error(
          '[Reserva] /clientes/reservas FALLÓ · status=',
          err?.status,
          '· body=',
          err?.error,
          '· err=',
          err,
        );
        this.advertenciaRegistro.set(
          'Tu reserva quedó creada con el proveedor, pero no pudimos guardarla en tu historial en este momento. Guarda el código de reserva por si necesitas referenciarla.',
        );
      },
    });
  }

  /**
   * Extrae un mensaje legible del error HTTP. El contrato devuelve
   * `{ status, message, details: string[], timestamp, path }` para errores;
   * priorizamos `details[0]`, luego `message`, y caemos a un mensaje genérico.
   */
  private mensajeErrorReserva(err: any): string {
    const body = err?.error;
    if (Array.isArray(body?.details) && body.details.length) return body.details[0];
    if (typeof body?.message === 'string' && body.message) return body.message;
    if (err?.status === 409) return 'El horario ya no tiene cupos disponibles. Elige otro horario.';
    if (err?.status === 404) return 'La atracción o el horario ya no están disponibles.';
    if (err?.status === 400) return 'Hay datos inválidos en la reserva. Revisa el formulario.';
    return 'No pudimos crear la reserva. Inténtalo nuevamente en unos segundos.';
  }

  /**
   * Acción "Continuar al pago" del modal "Reserva creada".
   * Abre el overlay del componente compartido `<app-payment>` SOBRE la
   * misma pantalla — mismo patrón que usa alojamiento. NO navega a una
   * pantalla separada y NO usa sessionStorage.
   */
  continuarAlPago(): void {
    const r = this.reservaCreada();
    if (!r) return;
    this.errorPago.set(null);
    this.mostrarPago.set(true);
  }

  // ── Eventos del componente compartido <app-payment> ──────────────
  onDatosEditadosPago(datos: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
  }): void {
    this.datosReceptorPago = datos;
  }

  onPagoExitoso(): void {
    this.procesarConfirmacionPago();
  }

  onCancelarPago(): void {
    this.mostrarPago.set(false);
    this.errorPago.set(null);
  }

  /**
   * POST real al microservicio del proveedor para confirmar el pago:
   *   /{provider}/api/v2/reservas/{rev_guid}/pagos/confirmacion
   *
   * Se usa el provider de origen de la reserva (el mismo donde se creó).
   * Si el receptor de la factura fue editado en `<app-payment>`, se usan
   * esos datos; si no, se caen al `cliente_invitado` original.
   */
  private procesarConfirmacionPago(): void {
    const r = this.reservaCreada();
    if (!r) return;
    if (this.enviandoPago()) return;

    const body = this.armarBodyConfirmacion(r);
    this.enviandoPago.set(true);
    this.errorPago.set(null);

    this.svc.confirmarPago(r.rev_guid, body, this.provider).subscribe({
      next: (resp) => {
        this.factura.set(resp.data);
        this.mostrarPago.set(false);
        this.enviandoPago.set(false);
        console.info('[Pago] Factura emitida:', resp.data);
      },
      error: (err) => {
        this.enviandoPago.set(false);
        const detalle = this.detalleErrPago(err);
        if (err?.status === 400 && /confirmad|paga/i.test(detalle)) {
          this.errorPago.set('Esta reserva ya fue confirmada anteriormente.');
        } else {
          this.errorPago.set(this.mensajeErrorPago(err));
        }
        console.error('[Pago] Error al confirmar pago:', err);
      },
    });
  }

  private armarBodyConfirmacion(r: ReservaCreada): PagoConfirmacionBody {
    const editado = this.datosReceptorPago;
    return {
      nombre_receptor: (editado?.nombre ?? this.cliente.nombres ?? '').trim(),
      apellido_receptor: (editado?.apellidos ?? this.cliente.apellidos ?? '').trim(),
      correo_receptor: (editado?.email ?? this.cliente.correo ?? '').trim(),
      telefono_receptor: (editado?.telefono ?? this.cliente.telefono ?? '').trim() || undefined,
      observacion: `Pago reserva ${r.atraccion_nombre}`,
    };
  }

  private detalleErrPago(err: any): string {
    const body = err?.error;
    if (Array.isArray(body?.details) && body.details.length) return String(body.details[0]);
    if (typeof body?.message === 'string') return body.message;
    return '';
  }

  private mensajeErrorPago(err: any): string {
    const detalle = this.detalleErrPago(err);
    if (detalle) return detalle;
    if (err?.status === 0) {
      const lbl = ATTRACTION_PROVIDER_LABELS[this.provider] ?? this.provider;
      return `El proveedor ${lbl} no está disponible en este momento.`;
    }
    if (err?.status === 404) return 'No se encontró la reserva para confirmar el pago.';
    if (err?.status === 400) return 'Hay datos inválidos en la confirmación.';
    if (err?.status === 500) return 'Error interno del servidor de pagos. Intenta más tarde.';
    return 'No pudimos confirmar el pago. Intenta nuevamente en unos segundos.';
  }

  // ── Helpers de presentación para el modal de factura ─────────────
  nombreCompletoCliente(): string {
    return `${(this.cliente.nombres ?? '').trim()} ${(this.cliente.apellidos ?? '').trim()}`.trim();
  }

  correoClientePago(): string {
    return (this.cliente.correo ?? '').trim();
  }

  detallesLineas(): { name: string; value: number }[] {
    const r = this.reservaCreada();
    if (!r?.detalle) return [];
    return r.detalle.map((l) => ({
      name: `${l.cantidad} × ${l.tck_tipo_participante}`,
      value: l.subtotal,
    }));
  }

  formatearFechaEmision(iso: string | undefined | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  cerrarFactura(): void {
    this.factura.set(null);
    this.reservaCreada.set(null);
    this.router.navigate(['/atracciones']);
  }

  verMisReservas(): void {
    // Lleva al historial del perfil con la pestaña de Atracciones abierta.
    this.reservaCreada.set(null);
    this.factura.set(null);
    this.mostrarPago.set(false);
    this.router.navigate(['/profile'], { queryParams: { tab: 'atracciones' } });
  }

  cerrarConfirmacion(): void {
    this.reservaCreada.set(null);
  }

  reintentar(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargarDetalle(id);
  }

  volverAlDetalle(): void {
    const d = this.detalle();
    if (d) this.router.navigate(['/atracciones', d.id]);
    else this.router.navigate(['/atracciones']);
  }

  volverAlListado(): void {
    this.router.navigate(['/atracciones']);
  }

  // ── Helpers de presentación ─────────────────────────────
  formatearDuracion(min: number): string {
    const horas = Math.floor(min / 60);
    const m = min % 60;
    if (horas === 0) return `${m} min`;
    return m > 0 ? `${horas} h ${m} min` : `${horas} h`;
  }

  cantidadDe(tck: string): number {
    return this.cantidades()[tck] ?? 0;
  }

  trackHorario(_: number, h: Horario): string {
    return h.hor_guid;
  }

  trackTicket(_: number, t: Ticket): string {
    return t.tck_guid;
  }
}
