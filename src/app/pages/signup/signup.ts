import { Component, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { usernameValidator, correoValidator, passwordValidator, usernameAvailableValidator } from '../../shared/validators/usuario.validators';
import { tipoIdentificacionValidator, numeroIdentificacionValidator, nombresValidator, apellidosValidator, razonSocialValidator, telefonoValidator } from '../../shared/validators/cliente.validators';
import { passwordMatchValidator } from '../../shared/validators/password-match.validator';
import { COUNTRY_CODES } from '../../shared/data/country-codes';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup implements OnDestroy {
  currentStep = 1;

  step1Form: FormGroup;
  step2Form: FormGroup;

  countryCodes = COUNTRY_CODES;

  signupStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  generalError = '';

  // Password visibility toggles
  showPassword        = false;
  showConfirmPassword = false;

  // Custom Dropdown state
  isPrefixDropdownOpen = false;

  // Toast popup state
  toastVisible = false;
  toastMessage = '';
  toastType: 'error' | 'success' = 'error';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private tipoSub: Subscription;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.step1Form = this.fb.group(
      {
        username:        ['', [usernameValidator()], [usernameAvailableValidator(this.http)]],
        correo:          ['', correoValidator()],
        password:        ['', passwordValidator()],
        confirmPassword: [''],
      },
      { validators: passwordMatchValidator('password', 'confirmPassword') }
    );

    this.step2Form = this.fb.group({
      tipo_identificacion:  ['', tipoIdentificacionValidator()],
      numero_identificacion: ['', numeroIdentificacionValidator()],
      nombres:    [''],
      apellidos:  [''],
      razon_social: [''],
      prefijo_telefono: ['+593'],
      telefono:   ['', telefonoValidator()],
      direccion:  [''],
    });

    // Update conditional validators whenever tipo changes
    this.tipoSub = this.step2Form
      .get('tipo_identificacion')!
      .valueChanges.subscribe((tipo: string) => this.updateConditionalValidators(tipo));
  }

  ngOnDestroy(): void {
    this.tipoSub.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Conditional validators (cliente) ──────────────────
  private updateConditionalValidators(tipo: string): void {
    const isPersonaNatural = ['CI', 'PASS', 'EXT'].includes(tipo);
    const isRUC = tipo === 'RUC';

    const numero     = this.step2Form.get('numero_identificacion')!;
    const nombres    = this.step2Form.get('nombres')!;
    const apellidos  = this.step2Form.get('apellidos')!;
    const razonSocial = this.step2Form.get('razon_social')!;

    // Actualizar validator de número con las reglas del tipo seleccionado
    numero.setValidators(numeroIdentificacionValidator(tipo));

    nombres.setValidators(isPersonaNatural ? nombresValidator() : null);
    apellidos.setValidators(isPersonaNatural ? apellidosValidator() : null);
    razonSocial.setValidators(isRUC ? razonSocialValidator() : null);

    [numero, nombres, apellidos, razonSocial].forEach(c => c.updateValueAndValidity());
  }

  // ── Computed helpers ───────────────────────────────────────
  get isRUC(): boolean {
    return this.step2Form.get('tipo_identificacion')?.value === 'RUC';
  }

  get isPersonaNatural(): boolean {
    return ['CI', 'PASS', 'EXT'].includes(
      this.step2Form.get('tipo_identificacion')?.value ?? ''
    );
  }

  // ── Error message extractor ────────────────────────────────
  /** Returns the first error message for a control, or '' if none / not touched. */
  getError(form: FormGroup, field: string): string {
    const ctrl = form.get(field);
    if (!ctrl?.touched || !ctrl.errors) return '';
    return (Object.values(ctrl.errors)[0] as string) ?? '';
  }

  /** Error for confirmPassword (reads group-level mismatch error). */
  get confirmPasswordError(): string {
    const ctrl = this.step1Form.get('confirmPassword');
    if (!ctrl?.touched) return '';
    if (!ctrl.value) return 'Debes confirmar tu contraseña.';
    const err = this.step1Form.errors?.['passwordMismatch'];
    return typeof err === 'string' ? err : '';
  }

  // ── Password strength & rules (UI only) ───────────────────
  get passwordValue(): string {
    return this.step1Form.get('password')?.value ?? '';
  }

  get passwordStrength(): { label: string; score: number; color: string } {
    const p = this.passwordValue;
    if (!p) return { label: '', score: 0, color: '' };
    let score = 0;
    if (p.length >= 8)           score++;
    if (/[A-Z]/.test(p))         score++;
    if (/[0-9]/.test(p))         score++;
    if (/[^A-Za-z0-9]/.test(p))  score++;
    const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
    const colors = ['', '#e74c3c', '#e67e22', '#3498db', '#27ae60'];
    return { label: labels[score], score, color: colors[score] };
  }

  // ── Custom Dropdown Handlers ──────────────────────────────
  togglePrefixDropdown(event: Event): void {
    event.stopPropagation();
    this.isPrefixDropdownOpen = !this.isPrefixDropdownOpen;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.isPrefixDropdownOpen = false;
  }

  selectPrefix(code: string): void {
    this.step2Form.get('prefijo_telefono')?.setValue(code);
    this.isPrefixDropdownOpen = false;
  }

  get selectedPrefixFlag(): string {
    const code = this.step2Form.get('prefijo_telefono')?.value;
    return this.countryCodes.find(c => c.code === code)?.flag || '🌐';
  }

  get passwordRules() {
    const p = this.passwordValue;
    return {
      length:    p.length >= 8,
      uppercase: /[A-Z]/.test(p),
      number:    /[0-9]/.test(p),
      special:   /[^A-Za-z0-9]/.test(p),
    };
  }

  // ── Navigation ─────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep === 1) {
      this.step1Form.markAllAsTouched();
      if (this.step1Form.invalid) {
        this.showToast('Por favor corrige los errores marcados antes de continuar.');
        return;
      }
    } else if (this.currentStep === 2) {
      this.step2Form.markAllAsTouched();
      if (this.step2Form.invalid) {
        this.showToast('Por favor corrige los errores marcados antes de continuar.');
        return;
      }
    }
    this.currentStep++;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  // ── Toast helper ───────────────────────────────────────────
  showToast(message: string, type: 'error' | 'success' = 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType    = type;
    this.toastVisible = true;
    this.toastTimer   = setTimeout(() => (this.toastVisible = false), 5000);
  }

  dismissToast(): void {
    this.toastVisible = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Submit ─────────────────────────────────────────────────
  onSignup(): void {
    this.signupStatus = 'loading';
    this.generalError = '';

    const s1 = this.step1Form.value;
    const s2 = this.step2Form.value;

    const baseUrl = 'https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1';

    // Payload para crear la cuenta de usuario
    const userPayload = {
      username:   s1.username,
      correo:     s1.correo,
      password:   s1.password,
      nombreRol:  'CLIENTE',
      creadoPorUsuario: "admin" // Según Swagger
    };

    // 1. Crear el usuario
    this.http.post(`${baseUrl}/auth/registro`, userPayload).subscribe({
      next: (userRes: any) => {
        // Extraemos el ID del usuario recién creado. Ajusta esta propiedad según cómo responde tu backend
        // (por ejemplo, userRes.data.id, userRes.id, userRes.usuarioId)
        const usuarioId = userRes?.data?.id || userRes?.id || userRes?.idUsuario || userRes?.usuarioId;

        const clientePayload = {
          idUsuario:            usuarioId, // Según Swagger es idUsuario
          nombres:              s2.nombres      || "",
          apellidos:            s2.apellidos    || "",
          razonSocial:          s2.razon_social || "",
          tipoIdentificacion:   s2.tipo_identificacion,
          numeroIdentificacion: s2.numero_identificacion,
          correo:               s1.correo, // REQUERIDO: Debes pasarlo desde el step1
          telefono:             s2.telefono ? `${s2.prefijo_telefono}${s2.telefono}` : "",
          direccion:            s2.direccion    || "",
          creadoPorUsuario:     "admin", // Según tu captura de éxito, el backend registró "admin"
          modificacionIp:       "",
          servicioOrigen:       "Angular_Web"
        };

        // 2. Crear el cliente
        this.http.post(`${baseUrl}/clientes`, clientePayload).subscribe({
          next: () => {
            this.signupStatus = 'success';
            this.showToast('¡Cuenta y perfil creados exitosamente!', 'success');
            setTimeout(() => this.router.navigate(['/login']), 2500);
          },
          error: (clientErr) => {
            this.signupStatus = 'error';
            console.error('[Signup] Error al crear cliente:', clientErr);
            
            const body = clientErr?.error;
            let specificError = '';

            // Si el backend (ASP.NET) devuelve los errores en un objeto 'errors': { "Cedula": ["Ya existe"] }
            if (body?.errors && typeof body.errors === 'object') {
              specificError = Object.values(body.errors).flat().join(' ');
            }

            const mensajeApi = specificError 
              || body?.message 
              || body?.title 
              || 'Error al guardar el perfil del cliente.';
              
            this.generalError = 'Hubo un error al guardar tu perfil: ' + mensajeApi;
            this.showToast(this.generalError);
          }
        });
      },
      error: (err) => {
        this.signupStatus = 'error';
        const body = err?.error;
        
        console.log('[Signup] HTTP status:', err.status);
        console.log('[Signup] err.error (body):', body);

        let messages: string[] = [];
        
        // Extraer los mensajes de error reales, ya sea que vengan como Array o como Objeto
        if (Array.isArray(body?.errors)) {
          messages = body.errors;
        } else if (body?.errors && typeof body.errors === 'object') {
          // Convierte { "Email": ["Ya registrado"], "Password": ["Débil"] } a ["Ya registrado", "Débil"]
          messages = Object.values(body.errors).flat() as string[];
        }

        const mensajeApi = body?.message 
          ?? body?.title 
          ?? 'Error al registrar el usuario. Inténtalo de nuevo.';

        if (messages.length > 0) {
          // Une todos los errores si hay varios, para mostrarlos en el popup
          const errorMsg = messages.join(' • ');
          this.generalError = errorMsg;
          this.showToast(errorMsg); 
          this.mapBackendErrors(messages); // También los marca en rojo en los campos de texto
        } else {
          this.generalError = mensajeApi;
          this.showToast(mensajeApi);
        }
      },
    });
  }

  /**
   * Recibe el array errors[] del backend y mapea cada mensaje al campo
   * del formulario correspondiente usando palabras clave (en español).
   * Los mensajes no mapeables se acumulan en generalError.
   */
  private mapBackendErrors(messages: string[]): void {
    const FIELD_MAP: Array<{ keywords: string[]; form: FormGroup; field: string }> = [
      { keywords: ['usuario', 'username'],    form: this.step1Form, field: 'username' },
      { keywords: ['correo', 'email'],        form: this.step1Form, field: 'correo' },
      { keywords: ['contraseña', 'password'], form: this.step1Form, field: 'password' },
      { keywords: ['tipo'],                   form: this.step2Form, field: 'tipo_identificacion' },
      { keywords: ['identificaci'],           form: this.step2Form, field: 'numero_identificacion' },
      { keywords: ['nombre'],                 form: this.step2Form, field: 'nombres' },
      { keywords: ['apellido'],               form: this.step2Form, field: 'apellidos' },
      { keywords: ['raz'],                    form: this.step2Form, field: 'razon_social' },
      { keywords: ['teléfono', 'telefono'],   form: this.step2Form, field: 'telefono' },
      { keywords: ['direcci'],                form: this.step2Form, field: 'direccion' },
    ];

    const step2Fields = [
      'tipo_identificacion', 'numero_identificacion',
      'nombres', 'apellidos', 'razon_social', 'telefono', 'direccion',
    ];

    let hasStep2Error = false;
    const unmapped: string[] = [];

    messages.forEach(msg => {
      const lower = msg.toLowerCase();
      const match = FIELD_MAP.find(m => m.keywords.some(k => lower.includes(k)));

      if (match) {
        const ctrl = match.form.get(match.field);
        ctrl?.setErrors({ backend: msg });
        ctrl?.markAsTouched();
        if (step2Fields.includes(match.field)) hasStep2Error = true;
      } else {
        unmapped.push(msg);
      }
    });

    // Regresar al paso donde están los errores
    this.currentStep = hasStep2Error ? 2 : 1;

    // Mensajes no mapeados → bloque general visible en el template
    this.generalError = unmapped.join(' • ');
  }
}
