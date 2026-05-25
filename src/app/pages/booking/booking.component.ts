import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

interface Room {
  id: number;
  nombre: string;
  piso: string;
  cama: string;
  capacidad: string;
  metros: number;
  precio: number;
  disponibles: number;
  imagen: string;
}

interface Lodging {
  id: number;
  nombre: string;
  tipo: string;
  categoria: number;
  calidad: string;
  direccion: string;
  ciudad: string;
  descripcion: string;
  imagenes: string[];
  precio: number;
  valoracion: number;
  ratingTexto: string;
  reviewsCount: number;
  checkIn: string;
  checkOut: string;
  habitaciones: Room[];
}
import { Lodging, Room, LodgingService } from '../../services/lodging.service';
import { PaymentComponent } from '../../components/checkout/payment/payment.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { BookingReservasService, TIPO_SERVICIO_GUIDS } from '../../shared/services/booking-reservas.service';


@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PaymentComponent, NavbarComponent, FooterComponent],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private lodgingService = inject(LodgingService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private provider = 'juan';

  // Login Modal State
  mostrarLoginModal = signal(false);
  loginData = { identificador: '', password: '' };
  showPassword = false;
  loginStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  generalError = '';

  get isLoggedIn(): boolean {
    try {
      return !!localStorage.getItem('token');
    } catch {
      return false;
    }
  }

  onLoginModalSubmit() {
    if (!this.loginData.identificador || !this.loginData.password) return;

    this.loginStatus = 'loading';
    this.generalError = '';

    const apiUrl = `${environment.apiGatewayUrl}/api/v2/booking/auth/login`;

    this.http.post(apiUrl, this.loginData).subscribe({
      next: (response: any) => {
        console.log('Login successful via modal', response);
        
        const token = response?.data?.token || response?.token;
        const usuarioGuid = response?.data?.usuarioGuid || response?.usuarioGuid;
        const clienteGuid = response?.data?.clienteGuid || response?.clienteGuid || response?.data?.guidCliente || response?.guidCliente || response?.data?.guid || response?.guid;
        const roles = response?.data?.roles || response?.roles || [];
        
        if (token) {
          localStorage.setItem('token', token);
          if (usuarioGuid) localStorage.setItem('usuarioGuid', usuarioGuid);
          if (clienteGuid) localStorage.setItem('clienteGuid', clienteGuid);
          localStorage.setItem('roles', JSON.stringify(roles));
          console.log('Saved to localStorage via modal:', { token, usuarioGuid, clienteGuid, roles });
        } else {
          console.warn('Token missing in response', response);
        }
        
        this.loginStatus = 'success';
        setTimeout(() => {
          this.mostrarLoginModal.set(false);
          this.loginData = { identificador: '', password: '' };
          this.loginStatus = 'idle';
          this.submitReserva(); // Automatically proceed to reservation!
          this.cdr.detectChanges();
        }, 1200);
      },
      error: (err) => {
        this.loginStatus = 'error';
        let body = err?.error;
        if (typeof body === 'string') {
          try { body = JSON.parse(body); } catch (e) { /* ignore */ }
        }
      ]
    }
  ];

        console.log('🚨 [Login Modal] HTTP status:', err.status);
        console.log('🚨 [Login Modal] err.error (body):', body);

        let messages: string[] = [];
        if (Array.isArray(body?.errors)) {
          messages = body.errors;
        } else if (body?.errors && typeof body.errors === 'object') {
          messages = Object.values(body.errors).flat() as string[];
        }

        let rawMessage = body?.message 
          ?? body?.title 
          ?? body?.detail 
          ?? (typeof body === 'string' ? body : null) 
          ?? `Error ${err.status}: Credenciales inválidas.`;
          
        let finalMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);

        if (messages.length > 0) {
          this.generalError = messages.join(' • ');
        } else {
          this.generalError = finalMessage;
        }
        this.cdr.detectChanges();
      }
    });
  }


  lodging: Lodging | null = null;

  // Active Tab: 'nuevo' | 'existente'
  activeTab: 'nuevo' | 'existente' = 'nuevo';

  // Form Fields
  tipoIdentificacion = '';
  numeroIdentificacion = '';
  nombres = '';
  apellidos = '';
  correo = '';
  telefono = '';
  direccion = '';
  observaciones = '';

  // Dates
  fechaInicio = '2026-05-20';
  fechaFin = '2026-05-22';
  fechaError = false;

  // Room selections status inside the lodging
  roomSelections: {
    selected: boolean;
    roomsCount: number;
    adultsCount: number;
    kidsCount: number;
  }[] = [];

  // Success Modal
  showSuccess = false;
  successCode = '';
  mockTotal = 0;

  // Payment hall state
  mostrarPago = signal(false);
  procesandoReserva = signal(false);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    // Intentar decodificar clienteGuid del token JWT si existe en localStorage
    try {
      const token = localStorage.getItem('token');
      const uGuid = localStorage.getItem('usuarioGuid');
      if (token && !localStorage.getItem('clienteGuid') && !localStorage.getItem('guidCliente')) {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payloadBase64 = parts[1];
          let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
          const pad = base64.length % 4;
          if (pad) {
            base64 += '='.repeat(4 - pad);
          }
          const decodedStr = atob(base64);
          const utf8Decoded = decodeURIComponent(
            decodedStr.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
          );
          const parsed = JSON.parse(utf8Decoded);
          console.log('[DEBUG] Decoded active JWT token in booking component:', parsed);

          const resolved = parsed.clienteGuid 
            || parsed.guidCliente 
            || parsed.guid 
            || parsed['clienteGuid']
            || parsed['guidCliente']
            || parsed['guid']
            || parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
            || parsed['sub']
            || '';

          if (resolved) {
            if (resolved !== uGuid) {
              localStorage.setItem('clienteGuid', resolved);
              localStorage.setItem('guidCliente', resolved);
              console.log('[DEBUG] Extracted and saved clienteGuid from active JWT:', resolved);
            } else {
              const otherKeys = ['clienteGuid', 'guidCliente', 'cliente_guid'];
              let foundAlternative = '';
              for (const key of otherKeys) {
                if (parsed[key] && parsed[key] !== uGuid) {
                  foundAlternative = parsed[key];
                  break;
                }
              }
              if (foundAlternative) {
                localStorage.setItem('clienteGuid', foundAlternative);
                localStorage.setItem('guidCliente', foundAlternative);
                console.log('[DEBUG] Extracted and saved alternative clienteGuid from active JWT:', foundAlternative);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[ERROR] Failed to decode active token in booking component:', e);
    }

    this.route.params.subscribe(params => {
      const id = +params['id'] || 1;
      this.lodging = this.lodgings.find(l => l.id === id) || this.lodgings[0];
      
      // Initialize room selections based on lodging rooms
      if (this.lodging) {
        this.roomSelections = this.lodging.habitaciones.map((room, index) => ({
          selected: index === 0, // default select first room
          roomsCount: 1,
          adultsCount: 2,
          kidsCount: index === 0 ? 1 : 0
        }));

      }
    } catch (e) {
      console.error('[ERROR] Failed to decode active token in booking component:', e);
    }

    this.route.params.subscribe(params => {
      const id = params['id'];
      this.route.queryParams.subscribe(qParams => {
        this.provider = qParams['provider'] || 'juan';
        this.fechaInicio = qParams['llegada'] || '2026-05-20';
        this.fechaFin = qParams['salida'] || '2026-05-22';
        
        const adults = qParams['adultos'] ? +qParams['adultos'] : 2;
        const kids = qParams['ninos'] ? +qParams['ninos'] : 0;
        const seleccionStr = qParams['seleccion'];

        let selectionsData: any[] = [];
        if (seleccionStr) {
          try {
            selectionsData = JSON.parse(seleccionStr);
          } catch (e) {
            console.error('Error parsing room selections:', e);
          }
        }

        this.lodgingService.getLodgingById(id, this.provider, this.fechaInicio, this.fechaFin, adults, kids).subscribe(lodging => {
          if (lodging) {
            this.lodging = lodging;
            
            // Initialize room selections based on serialized selected rooms
            if (this.lodging && this.lodging.habitaciones) {
              this.roomSelections = this.lodging.habitaciones.map((room) => {
                const selMatch = selectionsData.find((s: any) => s.roomId === room.id);
                return {
                  selected: !!selMatch,
                  roomsCount: selMatch ? selMatch.habitaciones : 1,
                  adultsCount: selMatch ? selMatch.adultos : 1,
                  kidsCount: selMatch ? selMatch.ninos : 0
                };
              });
            }
            this.cdr.detectChanges();
          }
        });
      });
    });
  }

  // Set active tab
  setTab(tab: 'nuevo' | 'existente'): void {
    this.activeTab = tab;
  }

  // Toggle room card selection
  toggleRoom(index: number): void {
    const selectedCount = this.roomSelections.filter(r => r.selected).length;
    if (this.roomSelections[index].selected && selectedCount === 1) {
      // Cannot deselect the only selected room
      return;
    }
    this.roomSelections[index].selected = !this.roomSelections[index].selected;
  }

  // Increment/Decrement helper
  count(index: number, field: 'roomsCount' | 'adultsCount' | 'kidsCount', min: number, delta: number): void {
    const currentValue = this.roomSelections[index][field];
    const newValue = Math.max(min, currentValue + delta);
    this.roomSelections[index][field] = newValue;
  }

  // Get nights between dates
  get nights(): number {
    if (!this.fechaInicio || !this.fechaFin) return 0;
    const diff = (new Date(this.fechaFin).getTime() - new Date(this.fechaInicio).getTime()) / 86400000;
    const nights = diff > 0 ? diff : 0;
    
    // Set date error if check-out is before or equal to check-in
    this.fechaError = (new Date(this.fechaFin) <= new Date(this.fechaInicio));
    return nights;
  }

  // Date formatting helpers
  fmtDate(val: string): string {
    if (!val) return '—';
    return new Date(val + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  fmtDateLong(val: string): string {
    if (!val) return '—';
    return new Date(val + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Date banner formatting
  get nightsLabel(): string {
    const nightsVal = this.nights;
    if (nightsVal > 0) {
      const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
      return `${nightsVal} noche${nightsVal !== 1 ? 's' : ''} · ${fmt(this.fechaInicio)} → ${fmt(this.fechaFin)}`;
    }
    return '—';
  }

  // Get selected rooms list for rendering
  get selectedLines(): { name: string; rooms: number; price: number; lineTotal: number }[] {
    const lines: { name: string; rooms: number; price: number; lineTotal: number }[] = [];
    if (!this.lodging) return lines;

    this.lodging.habitaciones.forEach((room, index) => {
      const sel = this.roomSelections[index];
      if (sel && sel.selected) {
        const lineTotal = room.precio * this.nights * sel.roomsCount;
        lines.push({
          name: room.nombre,
          rooms: sel.roomsCount,
          price: room.precio,
          lineTotal: Math.max(0, lineTotal)
        });
      }
    });

    return lines;
  }

  get paymentDetails(): { name: string; value: number }[] {
    return this.selectedLines.map(line => ({
      name: `${line.name} (x${line.rooms} hab. x ${this.nights}n)`,
      value: line.lineTotal
    }));
  }

  // Calculations
  get subtotal(): number {
    return this.selectedLines.reduce((acc, line) => acc + line.lineTotal, 0);
  }

  get iva(): number {
    return this.subtotal * 0.15;
  }

  get total(): number {
    return this.subtotal + this.iva;
  }

  get guestText(): string {
    let adults = 0;
    let kids = 0;
    let rooms = 0;

    this.roomSelections.forEach(sel => {
      if (sel.selected) {
        adults += sel.adultsCount;
        kids += sel.kidsCount;
        rooms += sel.roomsCount;
      }
    });

    if (rooms === 0) return '—';
    return `${adults} adulto${adults !== 1 ? 's' : ''} · ${kids} niño${kids !== 1 ? 's' : ''} · ${rooms} hab.`;
  }

  // Form errors styling classes helpers
  touchedFields = new Set<string>();

  onTouch(field: string): void {
    this.touchedFields.add(field);
  }

  getFieldErrorMsg(field: string): string {
    if (this.activeTab !== 'nuevo') return '';
    if (!this.touchedFields.has(field)) return '';

    if (field === 'tipoIdentificacion') {
      if (!this.tipoIdentificacion) return 'Selecciona el tipo de identificación';
    }

    if (field === 'numeroIdentificacion') {
      if (!this.numeroIdentificacion) return 'El número de identificación es requerido';
      if (this.tipoIdentificacion === 'CED') {
        if (!/^\d{10}$/.test(this.numeroIdentificacion)) {
          return 'La cédula debe tener exactamente 10 dígitos';
        }
      } else if (this.tipoIdentificacion === 'RUC') {
        if (!/^\d{13}$/.test(this.numeroIdentificacion)) {
          return 'El RUC debe tener exactamente 13 dígitos';
        }
      } else if (this.tipoIdentificacion === 'PAS') {
        if (this.numeroIdentificacion.length < 5 || this.numeroIdentificacion.length > 20) {
          return 'El pasaporte debe tener entre 5 y 20 caracteres';
        }
      }
    }

    if (field === 'nombres') {
      if (!this.nombres.trim()) return 'Los nombres son requeridos';
    }

    if (field === 'correo') {
      if (!this.correo) return 'El correo electrónico es requerido';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.correo)) {
        return 'El correo debe tener un dominio válido (ejemplo@dominio.com)';
      }
    }

    if (field === 'telefono') {
      if (!this.telefono) return 'El teléfono es requerido';
      if (!/^\d{9,15}$/.test(this.telefono)) {
        return 'El teléfono debe tener entre 9 y 15 dígitos';
      }
    }

    if (field === 'direccion') {
      if (!this.direccion.trim()) return 'La dirección es requerida';
    }

    return '';
  }

  isFieldError(field: string): boolean {
    return !!this.getFieldErrorMsg(field);
  }

  // Submit Reserva (abre el Hall de Pagos)
  submitReserva(): void {
    console.log('[DEBUG] submitReserva triggered');
    console.log('[DEBUG] activeTab:', this.activeTab);

    // Validar si el usuario está autenticado antes de continuar
    if (!this.isLoggedIn) {
      console.log('[DEBUG] submitReserva blocked: User not logged in. Opening login modal.');
      this.mostrarLoginModal.set(true);
      this.cdr.detectChanges();
      return;
    }
    
    if (this.activeTab === 'nuevo') {
      const fields = ['tipoIdentificacion', 'numeroIdentificacion', 'nombres', 'correo', 'telefono', 'direccion'];
      fields.forEach(field => this.touchedFields.add(field));

      let hasErrors = false;
      for (const field of fields) {
        const errMsg = this.getFieldErrorMsg(field);
        if (errMsg) {
          console.log(`[DEBUG] Validation Error in field "${field}":`, errMsg);
          hasErrors = true;
        }
      }

      if (hasErrors) {
        console.log('[DEBUG] submitReserva blocked due to form field validation errors.');
        
        // Scroll to the first field with an error and focus it
        for (const field of fields) {
          if (this.isFieldError(field)) {
            const el = document.getElementById(field);
            if (el) {
              console.log(`[DEBUG] Scrolling to invalid field: ${field}`);
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
              break;
            }
          }
        }
        
        this.cdr.detectChanges();
        return;
      }
    }

    console.log('[DEBUG] Number of nights:', this.nights);
    if (this.nights <= 0) {
      console.log('[DEBUG] submitReserva blocked: nights <= 0');
      this.fechaError = true;
      const el = document.getElementById('fechaFin');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.cdr.detectChanges();
      return;
    }

    // Validar que haya al menos una habitación seleccionada
    const hasRoom = this.roomSelections.some(r => r.selected);
    console.log('[DEBUG] hasRoom selected:', hasRoom, this.roomSelections);
    if (!hasRoom) {
      console.log('[DEBUG] submitReserva blocked: No room selected.');
      this.errorMsg.set('Por favor selecciona al menos una habitación.');
      this.cdr.detectChanges();
      return;
    }

    // Mock confirmation code
    const rand = Math.floor(Math.random() * 9000 + 1000);
    this.successCode = `RES-20260520-${rand}`;
    this.mockTotal = this.total;
    this.showSuccess = true;
    // Abre el hall de pagos en lugar de hacer la reserva directamente
    console.log('[DEBUG] Form and selections validated. Opening payment hall (mostrarPago => true).');
    this.mostrarPago.set(true);
    this.cdr.detectChanges();
  }

  cancelarPago(): void {
    console.log('[DEBUG] cancelarPago triggered. Closing payment hall (mostrarPago => false).');
    this.mostrarPago.set(false);
    this.cdr.detectChanges();
  }

  actualizarDatosHuesped(datos: any): void {
    if (!datos) return;
    console.log('[DEBUG] Guest details updated from payment modal:', datos);
    
    if (datos.nombre) {
      const partes = datos.nombre.trim().split(' ');
      this.nombres = partes[0] || '';
      this.apellidos = partes.slice(1).join(' ') || datos.apellidos || '';
    }
    if (datos.apellidos) {
      this.apellidos = datos.apellidos;
    }
    if (datos.email) {
      this.correo = datos.email;
    }
    if (datos.telefono) {
      this.telefono = datos.telefono;
    }
    this.cdr.detectChanges();
  }

  // Se llama al completarse el pago simulado de forma exitosa
  procesarPagoYReserva(): void {
    console.log('[DEBUG] procesarPagoYReserva triggered. Initiating API request...');
    this.procesandoReserva.set(true);
    this.cdr.detectChanges();

    const habitacionesPayload = this.roomSelections
      .map((sel, index) => {
        if (!sel.selected) return null;
        const room = this.lodging!.habitaciones![index];
        return {
          tipoHabitacionGuid: room.id,
          numHabitaciones: sel.roomsCount,
          numAdultos: sel.adultsCount,
          numNinos: sel.kidsCount
        };
      })
      .filter(h => h !== null) as any[];

    const payload = {
      sucursalGuid: this.lodging!.id,
      fechaInicio: this.fechaInicio + 'T14:00:00.000Z',
      fechaFin: this.fechaFin + 'T12:00:00.000Z',
      observaciones: this.observaciones || 'Reserva desde marketplace',
      esWalkin: false,
      origenCanalReserva: 'MARKETPLACE',
      cliente: {
        tipoIdentificacion: this.tipoIdentificacion,
        numeroIdentificacion: this.numeroIdentificacion,
        nombres: this.nombres,
        apellidos: this.apellidos || '',
        correo: this.correo,
        telefono: this.telefono,
        direccion: this.direccion
      },
      habitaciones: habitacionesPayload
    };

    console.log('[DEBUG] payload created:', payload);

    this.lodgingService.crearReserva(this.provider, payload).subscribe({
      next: (res) => {
        console.log('[DEBUG] API response received successfully:', res);
        this.procesandoReserva.set(false);
        this.mostrarPago.set(false); // Cierra pasarela de pagos
        if (res) {
          this.successCode = res.codigoReserva || `RES-20260520-${Math.floor(Math.random() * 9000 + 1000)}`;
          this.mockTotal = res.totalReserva || this.total;
          this.showSuccess = true;

          // AHORA: Guardar reserva centralizada en la base de datos (middleware)
          const guidCliente = localStorage.getItem('guidCliente') || localStorage.getItem('clienteGuid') || localStorage.getItem('usuarioGuid') || '3fa85f64-5717-4562-b3fc-2c963f66afa6';
          const token = localStorage.getItem('token');
          const usuarioGuid = localStorage.getItem('usuarioGuid');
          const storedClienteGuid = localStorage.getItem('guidCliente') || localStorage.getItem('clienteGuid');

          const saveToMiddleware = (resolvedClienteGuid: string) => {
            const middlewarePayload = {
              guidCliente: resolvedClienteGuid,
              guidServicioRef: TIPO_SERVICIO_GUIDS.ALOJAMIENTO,
              nombreServicioSnap: this.lodging?.nombre || this.provider, // Nombre real del alojamiento
              tipoServicioSnap: 'alojamiento',
              nombreProveedor: this.provider,
              idReservaExterna: res.reservaGuid || `guid-${this.successCode}`,
              fechaInicio: this.fechaInicio + 'T14:00:00.000Z',
              fechaFin: this.fechaFin + 'T12:00:00.000Z',
              canalOrigen: 'Pooking',
              montoTotal: res.totalReserva || this.total,
              moneda: 'USD',
              observaciones: this.observaciones || 'Reserva desde marketplace'
            };

            console.log('[DEBUG] Sending reservation payload to middleware:', middlewarePayload);
            this.bookingReservasService.registrarReserva(middlewarePayload).subscribe({
              next: (midRes) => {
                console.log('[DEBUG] Reservation saved to database successfully:', midRes);
              },
              error: (midErr) => {
                console.error('[ERROR] Failed to save reservation to database:', midErr);
              }
            });
          };

          if (storedClienteGuid) {
            console.log('[DEBUG] Using stored clienteGuid from localStorage:', storedClienteGuid);
            saveToMiddleware(storedClienteGuid);
          } else if (token && usuarioGuid) {
            const headers = new HttpHeaders({
              'Authorization': `Bearer ${token}`
            });
            this.http.get(`${environment.apiGatewayUrl}/api/v1/clientes/usuario/${usuarioGuid}`, { headers }).subscribe({
              next: (cliRes: any) => {
                const actualClienteGuid = cliRes?.data?.guidCliente || cliRes?.data?.clienteGuid || cliRes?.data?.guid || usuarioGuid;
                console.log('[DEBUG] Fetched actual clienteGuid:', actualClienteGuid, 'for usuarioGuid:', usuarioGuid);
                if (actualClienteGuid && actualClienteGuid !== usuarioGuid) {
                  localStorage.setItem('clienteGuid', actualClienteGuid);
                  localStorage.setItem('guidCliente', actualClienteGuid);
                }
                saveToMiddleware(actualClienteGuid);
              },
              error: (cliErr) => {
                console.warn('[WARNING] Failed to fetch actual clienteGuid. Falling back to usuarioGuid:', cliErr);
                saveToMiddleware(usuarioGuid);
              }
            });
          } else {
            saveToMiddleware(guidCliente);
          }
        } else {
          this.errorMsg.set('Hubo un error al procesar tu reserva con el proveedor. Por favor intenta de nuevo.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ERROR] API request failed:', err);
        this.procesandoReserva.set(false);
        this.mostrarPago.set(false);
        this.errorMsg.set('Hubo un error de red al procesar tu reserva. Por favor intenta de nuevo.');
        this.cdr.detectChanges();
      }
    });

  }

  closeSuccess(): void {
    console.log('[DEBUG] closeSuccess triggered. Routing to profile page...');
    this.showSuccess = false;
    this.router.navigate(['/profile']);
  }
}
