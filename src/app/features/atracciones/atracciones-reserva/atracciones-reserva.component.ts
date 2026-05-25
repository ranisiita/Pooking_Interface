import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
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
  Horario,
  LineaReserva,
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
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent],
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
  horarios = signal<Horario[]>([]);

  // ── Tickets del horario ──────────────────────────────────
  ticketsLoading = signal(false);
  ticketsError = signal<string | null>(null);
  ticketsHorario = signal<Ticket[]>([]);

  // ── Selecciones ──────────────────────────────────────────
  today = new Date().toISOString().split('T')[0];
  fechaVisita = '';
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

  // ── Fecha de visita ──────────────────────────────────────
  onFechaChange(): void {
    if (!this.fechaVisita) {
      this.fechaError = '';
      this.horarios.set([]);
      this.horarioSeleccionado.set(null);
      this.ticketsHorario.set([]);
      this.cantidades.set({});
      return;
    }
    if (this.fechaVisita < this.today) {
      this.fechaError = 'No puedes elegir una fecha anterior a hoy.';
      return;
    }
    this.fechaError = '';
    this.horarioSeleccionado.set(null);
    this.ticketsHorario.set([]);
    this.cantidades.set({});
    this.cargarHorarios();
  }

  cargarHorarios(): void {
    const d = this.detalle();
    if (!d || !this.fechaVisita) return;
    this.horariosLoading.set(true);
    this.horariosError.set(null);
    this.svc.getHorarios(d.id, this.fechaVisita, this.provider).subscribe({
      next: (resp) => {
        this.horarios.set(resp.data);
        this.horariosLoading.set(false);
      },
      error: () => {
        this.horariosError.set('No pudimos cargar los horarios.');
        this.horarios.set([]);
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
      !!this.fechaVisita &&
      this.fechaVisita >= this.today &&
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
   * Acción "Continuar al pago" del modal de confirmación.
   * Guarda en sessionStorage la reserva creada, el proveedor de origen y los
   * datos del cliente_invitado (para precargar el formulario del receptor de
   * la factura) y navega a la pantalla de pago. El POST real a
   * /reservas/{guid}/pagos/confirmacion lo hace la pantalla de pago.
   */
  continuarAlPago(): void {
    const r = this.reservaCreada();
    if (!r) return;
    try {
      sessionStorage.setItem(
        'atraccion-pago',
        JSON.stringify({
          reserva: r,
          provider: this.provider,
          cliente: this.cliente,
        }),
      );
    } catch {
      // Si sessionStorage no está disponible, la pantalla de pago hará
      // fallback a getReservaDetalle(revGuid, provider).
    }
    this.reservaCreada.set(null);
    this.router.navigate(['/atracciones/reservas', r.rev_guid, 'pago'], {
      queryParams: { provider: this.provider },
    });
  }

  verMisReservas(): void {
    // TODO(navegación): cuando exista la pantalla "Mis reservas" se redirigirá ahí.
    this.reservaCreada.set(null);
    this.router.navigate(['/atracciones']);
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
