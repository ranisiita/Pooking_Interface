import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
<<<<<<< Updated upstream

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
=======
import { Lodging, Room, LodgingService } from '../../services/lodging.service';
import { PaymentComponent } from '../../components/checkout/payment/payment.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { BookingReservasService, TIPO_SERVICIO_GUIDS } from '../../shared/services/booking-reservas.service';
>>>>>>> Stashed changes

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
<<<<<<< Updated upstream
=======
  private lodgingService = inject(LodgingService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private bookingReservasService = inject(BookingReservasService);
  private provider = 'juan';
>>>>>>> Stashed changes

  // Lodging dataset
  lodgings: Lodging[] = [
    {
      id: 1,
      nombre: 'Hotel Las Velas Quito',
      tipo: 'Hotel',
      categoria: 4,
      calidad: 'Negocios',
      direccion: 'Av. Amazonas N34-123, Quito, Pichincha · Ecuador',
      ciudad: 'Quito',
      descripcion: 'Hotel céntrico para viajes de negocio y turismo.',
      imagenes: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=720&q=80'],
      precio: 25,
      valoracion: 4.6,
      ratingTexto: 'Muy bueno',
      reviewsCount: 25,
      checkIn: '14:00',
      checkOut: '12:00',
      habitaciones: [
        {
          id: 1, nombre: 'Habitación Estándar', piso: 'Piso 1–3', cama: 'Cama matrimonial',
          capacidad: '2 adultos · 1 niño', metros: 25, precio: 25, disponibles: 5,
          imagen: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'
        },
        {
          id: 2, nombre: 'Suite Junior', piso: 'Piso 4–7', cama: 'Cama King',
          capacidad: '3 adultos · 2 niños', metros: 45, precio: 85, disponibles: 1,
          imagen: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'
        }
      ]
    },
    {
      id: 2,
      nombre: 'Casa del Arco Boutique',
      tipo: 'Hostal',
      categoria: 4,
      calidad: 'Familia',
      direccion: 'García Moreno 362, Centro Histórico, Quito',
      ciudad: 'Quito',
      descripcion: 'Hostal boutique en el corazón del Centro Histórico.',
      imagenes: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=720&q=80'],
      precio: 52,
      valoracion: 4.8,
      ratingTexto: 'Excelente',
      reviewsCount: 41,
      checkIn: '15:00',
      checkOut: '11:00',
      habitaciones: [
        {
          id: 1, nombre: 'Habitación Colonial', piso: 'Piso 1', cama: 'Cama matrimonial',
          capacidad: '2 adultos', metros: 22, precio: 52, disponibles: 3,
          imagen: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'
        }
      ]
    }
<<<<<<< Updated upstream
  ];
=======
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
          if (clienteGuid) {
            localStorage.setItem('clienteGuid', clienteGuid);
            localStorage.setItem('guidCliente', clienteGuid);
          }
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
>>>>>>> Stashed changes

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

  ngOnInit(): void {
<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
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
        if (this.numeroIdentificacion.length !== 20) {
          return 'El pasaporte debe tener exactamente 20 caracteres';
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
      if (!/^\d{10}$/.test(this.telefono)) {
        return 'El teléfono debe tener exactamente 10 dígitos';
      }
    }

    return '';
  }

  isFieldError(field: string): boolean {
    return !!this.getFieldErrorMsg(field);
  }

  // Submit Reserva
  submitReserva(): void {
    if (this.activeTab === 'nuevo') {
      const fields = ['tipoIdentificacion', 'numeroIdentificacion', 'nombres', 'correo', 'telefono'];
      fields.forEach(field => this.touchedFields.add(field));

      let hasErrors = false;
      for (const field of fields) {
        if (this.isFieldError(field)) {
          hasErrors = true;
        }
      }

      if (hasErrors) {
        const el = document.getElementById('tab-nuevo');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    if (this.nights <= 0) {
      this.fechaError = true;
      const el = document.getElementById('fechaFin');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

<<<<<<< Updated upstream
    // Mock confirmation code
    const rand = Math.floor(Math.random() * 9000 + 1000);
    this.successCode = `RES-20260520-${rand}`;
    this.mockTotal = this.total;
    this.showSuccess = true;
=======
    // Validar que haya al menos una habitación seleccionada
    const hasRoom = this.roomSelections.some(r => r.selected);
    console.log('[DEBUG] hasRoom selected:', hasRoom, this.roomSelections);
    if (!hasRoom) {
      console.log('[DEBUG] submitReserva blocked: No room selected.');
      this.errorMsg.set('Por favor selecciona al menos una habitación.');
      this.cdr.detectChanges();
      return;
    }

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
>>>>>>> Stashed changes
  }

  closeSuccess(): void {
    this.showSuccess = false;
    this.router.navigate(['/']);
  }
}
