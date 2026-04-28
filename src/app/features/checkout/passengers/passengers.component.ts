import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { CheckoutStore } from '../../../state/checkout.store';
import { SearchStore } from '../../../state/search.store';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { telefonoEcuatoriano } from '../../../core/utils/validators';
import { TipoIdentificacion, TipoDocumentoPasajero } from '../../../core/models/domain.models';

@Component({
  selector: 'app-passengers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NavbarComponent],
  templateUrl: './passengers.component.html',
  styleUrls: ['./passengers.component.css'],
})
export class PassengersComponent implements OnInit {
  private fb            = inject(FormBuilder);
  private router        = inject(Router);
  private checkoutStore = inject(CheckoutStore);
  private searchStore   = inject(SearchStore);
  private toast         = inject(ToastService);

  form!: FormGroup;
  guardando = signal(false);

  /** Índice del pasajero que se está editando actualmente (0-based) */
  paxActual = signal(0);
  /** Pasajeros que ya fueron visitados (para preservar datos al volver) */
  private paxVisitados = new Set<number>([0]);

  tiposId: TipoIdentificacion[]             = ['CEDULA', 'PASAPORTE', 'RUC', 'TARJETA_IDENTIDAD', 'OTRO'];
  tiposDocPasajero: TipoDocumentoPasajero[] = ['CEDULA', 'PASAPORTE', 'RUC', 'OTRO'];

  readonly cantidadPasajeros = computed(() => Math.max(1, Math.min(9, this.searchStore.criterios().pasajeros || 1)));
  readonly esPrimerPax       = computed(() => this.paxActual() === 0);
  readonly esUltimoPax       = computed(() => this.paxActual() === this.cantidadPasajeros() - 1);
  /** Índices para el indicador de puntos de progreso */
  readonly indicesPax        = computed(() => Array.from({ length: this.cantidadPasajeros() }, (_, i) => i));

  get pasajerosArray(): FormArray { return this.form.get('pasajeros') as FormArray; }
  get grupoActual(): FormGroup    { return this.pasajerosArray.at(this.paxActual()) as FormGroup; }

  ngOnInit(): void {
    const n = this.cantidadPasajeros();

    this.form = this.fb.group({
      // ── Titular de la reserva ─────────────────────────────────────────
      tipo_identificacion:   ['CEDULA', Validators.required],
      numero_identificacion: ['', [Validators.required, Validators.maxLength(30)]],
      nombres:               ['', [Validators.required, Validators.maxLength(160)]],
      apellidos:             ['', Validators.maxLength(160)],
      correo:                ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono:              ['', [Validators.required, telefonoEcuatoriano, Validators.maxLength(30)]],
      direccion:             ['', [Validators.required, Validators.maxLength(250)]],
      fecha_nacimiento:      [''],
      genero:                [''],
      mismo_pasajero:        [true],
      // ── Pasajeros ─────────────────────────────────────────────────────
      pasajeros: this.fb.array(Array.from({ length: n }, () => this.crearGrupoPasajero())),
    });

    // Sincroniza el pasajero 0 con el titular
    this.form.get('mismo_pasajero')!.valueChanges
      .subscribe((same) => this.sincronizar(same));

    ['nombres', 'apellidos', 'tipo_identificacion', 'numero_identificacion', 'fecha_nacimiento']
      .forEach((f) => {
        this.form.get(f)!.valueChanges.subscribe(() => {
          if (this.form.get('mismo_pasajero')?.value && this.paxActual() === 0) {
            this.sincronizar(true);
          }
        });
      });
  }

  private crearGrupoPasajero(): FormGroup {
    return this.fb.group({
      nombre_pasajero:           ['', [Validators.required, Validators.maxLength(100)]],
      apellido_pasajero:         ['', [Validators.required, Validators.maxLength(100)]],
      tipo_documento_pasajero:   ['CEDULA', Validators.required],
      numero_documento_pasajero: ['', [Validators.required, Validators.maxLength(30)]],
      fecha_nacimiento_pasajero: [''],
      requiere_asistencia:       [false],
    });
  }

  private sincronizar(same: boolean): void {
    if (!same || this.pasajerosArray.length === 0) return;
    const f = this.form.value;
    this.pasajerosArray.at(0).patchValue({
      nombre_pasajero:           f.nombres,
      apellido_pasajero:         f.apellidos,
      tipo_documento_pasajero:   f.tipo_identificacion,
      numero_documento_pasajero: f.numero_identificacion,
      fecha_nacimiento_pasajero: f.fecha_nacimiento,
    }, { emitEvent: false });
  }

  /** Avanza al siguiente pasajero, validando el actual antes.
   *  En el pasajero 1 también valida los campos del titular. */
  siguiente(): void {
    if (this.paxActual() === 0) {
      const camposTitular = [
        'tipo_identificacion', 'numero_identificacion', 'nombres',
        'correo', 'telefono', 'direccion',
      ];
      camposTitular.forEach((c) => this.form.get(c)?.markAsTouched());
      if (camposTitular.some((c) => this.form.get(c)?.invalid)) {
        this.toast.show('Completa los datos del titular de la reserva antes de continuar.', 'error');
        return;
      }
    }

    this.grupoActual.markAllAsTouched();
    if (this.grupoActual.invalid) {
      this.toast.show(`Completa los campos requeridos del Pasajero ${this.paxActual() + 1} antes de continuar.`, 'error');
      return;
    }

    const nextIdx = this.paxActual() + 1;

    // Garantiza que el siguiente grupo esté en blanco al visitarlo por primera vez
    if (!this.paxVisitados.has(nextIdx)) {
      this.pasajerosArray.at(nextIdx).reset({
        nombre_pasajero:           '',
        apellido_pasajero:         '',
        tipo_documento_pasajero:   'CEDULA',
        numero_documento_pasajero: '',
        fecha_nacimiento_pasajero: '',
        requiere_asistencia:       false,
      });
      this.paxVisitados.add(nextIdx);
    }

    this.paxActual.set(nextIdx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Regresa al pasajero anterior */
  anterior(): void {
    this.paxActual.update((v) => Math.max(0, v - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  guardar(): void {
    this.grupoActual.markAllAsTouched();
    if (this.grupoActual.invalid) {
      this.toast.show(`Completa los campos requeridos del Pasajero ${this.paxActual() + 1}.`, 'error');
      return;
    }

    const f = this.form.value;

    this.checkoutStore.setCliente({
      id_cliente:            0,
      cliente_guid:          '',
      tipo_identificacion:   f.tipo_identificacion,
      numero_identificacion: f.numero_identificacion,
      nombres:               f.nombres,
      apellidos:             f.apellidos || null,
      correo:                f.correo,
      telefono:              f.telefono,
      direccion:             f.direccion,
      fecha_nacimiento:      f.fecha_nacimiento || null,
      nacionalidad:          null,
      genero:                f.genero || null,
      estado:                'ACT',
    });

    const pasajeros = (f.pasajeros as Record<string, unknown>[]).map((p, i) => ({
      id_pasajero:               i + 1,
      nombre_pasajero:           p['nombre_pasajero'] as string,
      apellido_pasajero:         p['apellido_pasajero'] as string,
      tipo_documento_pasajero:   p['tipo_documento_pasajero'] as TipoDocumentoPasajero,
      numero_documento_pasajero: p['numero_documento_pasajero'] as string,
      fecha_nacimiento_pasajero: (p['fecha_nacimiento_pasajero'] as string) || null,
      requiere_asistencia:       (p['requiere_asistencia'] as boolean) ?? false,
    }));

    this.checkoutStore.setPasajeros(pasajeros);
    this.router.navigate(['/checkout/resumen']);
  }

  volver(): void { this.router.navigate(['/vuelos/resultados']); }

  getError(field: string, error: string): boolean {
    const c = this.form.get(field);
    return !!(c?.touched && c.errors?.[error]);
  }

  getPaxError(field: string, error: string): boolean {
    const c = this.grupoActual?.get(field);
    return !!(c?.touched && c.errors?.[error]);
  }

  labelTipoDoc(t: string): string {
    const m: Record<string, string> = { CEDULA: 'Cédula', PASAPORTE: 'Pasaporte', RUC: 'RUC', OTRO: 'Otro' };
    return m[t] ?? t;
  }

  labelTipoId(t: string): string {
    const m: Record<string, string> = {
      CEDULA: 'Cédula', PASAPORTE: 'Pasaporte', RUC: 'RUC',
      TARJETA_IDENTIDAD: 'Tarjeta de identidad', OTRO: 'Otro',
    };
    return m[t] ?? t;
  }
}
