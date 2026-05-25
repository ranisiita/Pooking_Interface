import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import {
  ACTIVE_ATTRACTION_PROVIDER,
  ALL_ATTRACTION_PROVIDERS,
  ATTRACTION_PROVIDER_LABELS,
  AtraccionesService,
} from '../services/atracciones.service';
import {
  AttractionProvider,
  ClienteInvitado,
  FacturaCreada,
  PagoConfirmacionBody,
  ReservaCreada,
} from '../models/atracciones.models';
// (El registro general en /clientes/reservas se hace al crear la reserva,
//  en `atracciones-reserva.component.ts`. Aquí solo confirmamos pago.)

type EstadoPago =
  | 'loading'
  | 'ready'
  | 'enviando'
  | 'pagado'
  | 'ya_pagado'
  | 'error'
  | 'not_found';

type CampoReceptor =
  | 'nombre_receptor'
  | 'apellido_receptor'
  | 'correo_receptor'
  | 'telefono_receptor';

const STORAGE_KEY = 'atraccion-pago';

@Component({
  selector: 'app-atracciones-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './atracciones-pago.component.html',
  styleUrls: ['./atracciones-pago.component.css'],
})
export class AtraccionesPagoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(AtraccionesService);

  // ── Estado de la pantalla ───────────────────────────────
  estado = signal<EstadoPago>('loading');
  errorMsg = signal<string | null>(null);
  reserva = signal<ReservaCreada | null>(null);
  factura = signal<FacturaCreada | null>(null);

  /** Proveedor de origen de la reserva. */
  provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER;

  // ── Formulario del receptor de la factura ──────────────
  receptor: PagoConfirmacionBody = {
    nombre_receptor: '',
    apellido_receptor: '',
    correo_receptor: '',
    telefono_receptor: '',
    observacion: '',
  };
  touched: Record<string, boolean> = {};

  // ── Tarjeta simulada (NO se envía a ningún backend) ─────
  datosTarjeta = {
    titular: '',
    numero: '',
    expiracion: '',
    cvc: '',
  };
  erroresTarjeta: Partial<Record<keyof typeof this.datosTarjeta, string>> = {};
  tarjetaTouched: Record<string, boolean> = {};

  // ── Derivados ──────────────────────────────────────────
  readonly providerLabel = computed(() =>
    ATTRACTION_PROVIDER_LABELS[this.provider] ?? this.provider,
  );

  ngOnInit(): void {
    const revGuid = this.route.snapshot.paramMap.get('revGuid');
    if (!revGuid) {
      this.estado.set('not_found');
      return;
    }

    const provQp = this.route.snapshot.queryParamMap.get('provider');
    if (provQp && (ALL_ATTRACTION_PROVIDERS as string[]).includes(provQp)) {
      this.provider = provQp as AttractionProvider;
    }

    // 1) Intento hidratar desde sessionStorage (flujo recién creado en reserva)
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        const saved = JSON.parse(raw) as {
          reserva?: ReservaCreada;
          provider?: AttractionProvider;
          cliente?: ClienteInvitado;
        };
        if (saved.reserva?.rev_guid === revGuid) {
          this.reserva.set(saved.reserva);
          if (saved.provider) this.provider = saved.provider;
          if (saved.cliente) this.precargarReceptor(saved.cliente, saved.reserva.atraccion_nombre);
          this.estado.set(saved.reserva.rev_estado === 'PAGADA' ? 'ya_pagado' : 'ready');
          return;
        }
      } catch {
        // sessionStorage corrupto — cae al fetch
      }
    }

    // 2) Fallback: pedir el detalle al backend con el provider declarado
    this.svc.getReservaDetalle(revGuid, this.provider).subscribe({
      next: (resp) => {
        this.reserva.set(resp.data);
        if (resp.data.rev_estado === 'PAGADA') {
          this.estado.set('ya_pagado');
        } else {
          this.estado.set('ready');
        }
      },
      error: (err) => {
        if (err?.status === 404) {
          this.estado.set('not_found');
        } else {
          this.estado.set('error');
          this.errorMsg.set(this.mensajeErrorPago(err));
        }
      },
    });
  }

  private precargarReceptor(cliente: ClienteInvitado, atraccionNombre: string): void {
    this.receptor = {
      nombre_receptor: (cliente.nombres ?? '').trim(),
      apellido_receptor: (cliente.apellidos ?? '').trim(),
      correo_receptor: (cliente.correo ?? '').trim(),
      telefono_receptor: (cliente.telefono ?? '').trim(),
      observacion: `Pago reserva ${atraccionNombre}`,
    };
  }

  // ── Validación de receptor ──────────────────────────────
  onTouch(campo: CampoReceptor): void {
    this.touched[campo] = true;
  }

  isFieldError(campo: CampoReceptor): boolean {
    if (!this.touched[campo]) return false;
    return !!this.getFieldErrorMsg(campo);
  }

  getFieldErrorMsg(campo: CampoReceptor): string {
    const v = ((this.receptor as any)[campo] as string) ?? '';
    if (campo === 'telefono_receptor') {
      // Opcional según contrato
      if (!v.trim()) return '';
      if (!/^[0-9+\s-]{7,15}$/.test(v.trim())) return 'Ingresa un teléfono válido.';
      return '';
    }
    if (!v.trim()) return 'Este campo es obligatorio.';
    if (campo === 'correo_receptor') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Ingresa un correo válido.';
    }
    return '';
  }

  formularioValido(): boolean {
    const requeridos: CampoReceptor[] = [
      'nombre_receptor',
      'apellido_receptor',
      'correo_receptor',
    ];
    for (const c of requeridos) {
      if (this.getFieldErrorMsg(c)) return false;
    }
    if (this.getFieldErrorMsg('telefono_receptor')) return false;
    return true;
  }

  // ── Validación / formateo de tarjeta simulada ───────────
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

  onTouchTarjeta(campo: keyof typeof this.datosTarjeta): void {
    this.tarjetaTouched[campo] = true;
  }

  private validarTarjeta(): boolean {
    this.erroresTarjeta = {};
    const t = this.datosTarjeta;

    if (!t.titular.trim() || t.titular.trim().length < 4) {
      this.erroresTarjeta['titular'] = 'El nombre debe tener al menos 4 caracteres.';
    }
    if (t.numero.replace(/\s/g, '').length !== 16) {
      this.erroresTarjeta['numero'] = 'El número de tarjeta debe tener 16 dígitos.';
    }
    if (!/^\d{2} \/ \d{2}$/.test(t.expiracion)) {
      this.erroresTarjeta['expiracion'] = 'Formato inválido. Usa MM / AA.';
    } else {
      const [mm, yy] = t.expiracion.split(' / ').map(Number);
      const ahora = new Date();
      if (
        mm < 1 ||
        mm > 12 ||
        new Date(2000 + yy, mm - 1) < new Date(ahora.getFullYear(), ahora.getMonth())
      ) {
        this.erroresTarjeta['expiracion'] = 'La tarjeta ha caducado.';
      }
    }
    if (t.cvc.length < 3) {
      this.erroresTarjeta['cvc'] = 'El CVC debe tener 3 dígitos.';
    }
    // Marca touched para que se muestren errores
    (['titular', 'numero', 'expiracion', 'cvc'] as Array<keyof typeof this.datosTarjeta>).forEach(
      (c) => (this.tarjetaTouched[c] = true),
    );
    return Object.keys(this.erroresTarjeta).length === 0;
  }

  hayErrorTarjeta(campo: keyof typeof this.datosTarjeta): boolean {
    return !!this.erroresTarjeta[campo] && !!this.tarjetaTouched[campo];
  }

  errorTarjetaMsg(campo: keyof typeof this.datosTarjeta): string {
    return this.erroresTarjeta[campo] ?? '';
  }

  // ── Acción principal: validar tarjeta → POST confirmar pago → registro general
  pagar(): void {
    const r = this.reserva();
    if (!r) return;
    if (this.estado() === 'enviando') return;

    // 1) Marca touched receptor + valida ambos formularios.
    (['nombre_receptor', 'apellido_receptor', 'correo_receptor', 'telefono_receptor'] as CampoReceptor[])
      .forEach((c) => (this.touched[c] = true));

    const tarjetaOk = this.validarTarjeta();
    const receptorOk = this.formularioValido();
    if (!tarjetaOk || !receptorOk) return;

    const body: PagoConfirmacionBody = {
      nombre_receptor: this.receptor.nombre_receptor.trim(),
      apellido_receptor: this.receptor.apellido_receptor.trim(),
      correo_receptor: this.receptor.correo_receptor.trim(),
      telefono_receptor: this.receptor.telefono_receptor?.trim() || undefined,
      observacion: this.receptor.observacion?.trim() || undefined,
    };

    this.estado.set('enviando');
    this.errorMsg.set(null);

    // 2) Confirma pago en el microservicio del proveedor.
    this.svc.confirmarPago(r.rev_guid, body, this.provider).subscribe({
      next: (resp) => {
        this.factura.set(resp.data);
        // El registro general en /clientes/reservas ya ocurrió al crear la
        // reserva (estado PENDIENTE). No se vuelve a registrar aquí para no
        // generar filas duplicadas. La actualización de estado a PAGADA en
        // el historial general se hará cuando el backend exponga un endpoint
        // de update — por ahora la verdad del estado vive en atracciones.
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
        this.estado.set('pagado');
      },
      error: (err) => {
        const detalle = this.detalleErr(err);
        if (err?.status === 400 && /confirmad|paga/i.test(detalle)) {
          this.estado.set('ya_pagado');
          this.errorMsg.set('Esta reserva ya fue confirmada anteriormente.');
        } else {
          this.estado.set('error');
          this.errorMsg.set(this.mensajeErrorPago(err));
        }
      },
    });
  }

  private detalleErr(err: any): string {
    const body = err?.error;
    if (Array.isArray(body?.details) && body.details.length) return String(body.details[0]);
    if (typeof body?.message === 'string') return body.message;
    return '';
  }

  private mensajeErrorPago(err: any): string {
    const detalle = this.detalleErr(err);
    if (detalle) return detalle;
    if (err?.status === 0) {
      return `El proveedor ${this.providerLabel()} no está disponible en este momento.`;
    }
    if (err?.status === 404) return 'No se encontró la reserva para confirmar el pago.';
    if (err?.status === 400) return 'Hay datos inválidos en la confirmación. Revisa el formulario.';
    if (err?.status === 500) return 'Error interno del servidor de pagos. Intenta más tarde.';
    return 'No pudimos confirmar el pago. Intenta nuevamente en unos segundos.';
  }

  // ── Acciones secundarias ────────────────────────────────
  reintentar(): void {
    this.errorMsg.set(null);
    if (this.reserva()) this.estado.set('ready');
    else this.ngOnInit();
  }

  volverALaReserva(): void {
    const r = this.reserva();
    // No tenemos el id de atracción aquí (la reserva solo trae rev_guid).
    // Volvemos al listado, que es la salida más segura.
    this.router.navigate(['/atracciones']);
  }

  irAlListado(): void {
    this.router.navigate(['/atracciones']);
  }

  // ── Helpers de presentación ────────────────────────────
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
}
