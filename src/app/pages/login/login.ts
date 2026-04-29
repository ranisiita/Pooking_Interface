import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FormsModule, FooterComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginData = { username: '', password: '' };

  // Blur tracking
  touched: Record<string, boolean> = {};

  // Backend field errors
  backendErrors: Record<string, string[]> = {};
  generalError = '';

  loginStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  showPassword = false;

  // Toast popup state
  toastVisible = false;
  toastMessage = '';
  toastType: 'error' | 'success' = 'error';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Field validators ──────────────────────────────────
  get usernameError(): string {
    if (!this.touched['username']) return '';
    if (!this.loginData.username) return 'El usuario es requerido.';
    return this.backendErrors['username']?.[0] ?? '';
  }

  get passwordError(): string {
    if (!this.touched['password']) return '';
    if (!this.loginData.password) return 'La contraseña es requerida.';
    return this.backendErrors['password']?.[0] ?? '';
  }

  touch(field: string) {
    this.touched[field] = true;
  }

  showToast(message: string, type: 'error' | 'success' = 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType    = type;
    this.toastVisible = true;
    this.cdr.detectChanges(); // <-- Forzar actualización de pantalla
    this.toastTimer   = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.detectChanges();
    }, 5000);
  }

  dismissToast(): void {
    this.toastVisible = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  onLogin() {
    // Touch all fields to show any pending errors
    this.touched['username'] = true;
    this.touched['password'] = true;
    if (!this.loginData.username || !this.loginData.password) return;

    this.loginStatus = 'loading';
    this.generalError = '';
    this.backendErrors = {};

    const apiUrl =
      'https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/auth/login';

    this.http.post(apiUrl, this.loginData).subscribe({
      next: (response: any) => {
        this.zone.run(() => {
          console.log('Login successful', response);
          this.loginStatus = 'success';
          setTimeout(() => this.router.navigate(['/']), 2000);
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.loginStatus = 'error';
          
          let body = err?.error;
          if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { /* ignore */ }
          }

          console.log('🚨 [Login] HTTP status:', err.status);
          console.log('🚨 [Login] err.error (body):', body);

          let messages: string[] = [];
          if (Array.isArray(body?.errors)) {
            messages = body.errors;
          } else if (body?.errors && typeof body.errors === 'object') {
            this.backendErrors = body.errors; // Guardar para mapeo de campos
            messages = Object.values(body.errors).flat() as string[];
          }

          // Extraer mensaje general y forzar a string
          let rawMessage = body?.message 
            ?? body?.title 
            ?? body?.detail 
            ?? (typeof body === 'string' ? body : null) 
            ?? `Error ${err.status}: Credenciales inválidas. Por favor intenta de nuevo.`;
            
          let finalMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);

          if (messages.length > 0) {
            const errorMsg = messages.join(' • ');
            this.generalError = errorMsg;
            
            // Mostrar toast inmediatamente
            this.showToast(errorMsg); 
          } else {
            this.generalError = finalMessage;
            
            // Mostrar toast inmediatamente
            this.showToast(finalMessage);
          }
        });
      },
    });
  }
}
