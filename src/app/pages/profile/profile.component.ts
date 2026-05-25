import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LodgingService } from '../../services/lodging.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  private http = inject(HttpClient);
  private router = inject(Router);
  private lodgingService = inject(LodgingService);
  private cdr = inject(ChangeDetectorRef);


  user: any = null;
  isLoading = true;
  errorMessage = '';

  // Reservas de Alojamiento, Atracciones y Automóviles
  activeTab: 'alojamiento' | 'atracciones' | 'automoviles' = 'alojamiento';
  reservations: any[] = [];
  attractionReservations: any[] = [];
  carReservations: any[] = [];
  isLoadingReservations = true;
  selectedReserva: any = null;

  setTab(tab: 'alojamiento' | 'atracciones' | 'automoviles'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    let token = null;
    let guid = null;
    try {
      token = localStorage.getItem('token');
      guid = localStorage.getItem('usuarioGuid');
    } catch {}

    // Intentar decodificar clienteGuid del token JWT si existe en localStorage
    if (token) {
      try {
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
          console.log('[DEBUG] Decoded active JWT token in profile component:', parsed);

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
            if (resolved !== guid) {
              localStorage.setItem('clienteGuid', resolved);
              console.log('[DEBUG] Profile: Extracted and saved clienteGuid from active JWT:', resolved);
            } else {
              const otherKeys = ['clienteGuid', 'guidCliente', 'cliente_guid'];
              let foundAlternative = '';
              for (const key of otherKeys) {
                if (parsed[key] && parsed[key] !== guid) {
                  foundAlternative = parsed[key];
                  break;
                }
              }
              if (foundAlternative) {
                localStorage.setItem('clienteGuid', foundAlternative);
                console.log('[DEBUG] Profile: Extracted and saved alternative clienteGuid from active JWT:', foundAlternative);
              }
            }
          }
        }
      } catch (e) {
        console.error('[ERROR] Profile: Failed to decode active token:', e);
      }
    }

    if (!token || !guid) {
      // Iniciar sesión como huésped invitado
      this.isLoading = false;
      this.user = {
        name: 'Huésped Invitado',
        email: 'invitado@pooking.ec',
        memberSince: new Date().toLocaleDateString('es-EC'),
        level: 'Explorador',
        avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        stats: { trips: 0, reviews: 0, points: 0 }
      };
      this.cargarReservasDesdeMiddleware();
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(`${environment.apiGatewayUrl}/api/v1/clientes/usuario/${guid}`, { headers })
    const resolvedGuid = localStorage.getItem('clienteGuid') || guid;

    this.http.get(`${environment.apiGatewayUrl}/api/v1/clientes/usuario/${resolvedGuid}`, { headers })
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response && response.data) {
            const data = response.data;

            // Extraer y guardar guidCliente en localStorage para consistencia de la app
            const actualGuidCliente = data.guidCliente || data.clienteGuid || data.guid;
            if (actualGuidCliente) {
              localStorage.setItem('guidCliente', actualGuidCliente);
              localStorage.setItem('clienteGuid', actualGuidCliente);
            }

            this.user = {
              name: `${data.nombres} ${data.apellidos}`,
              email: data.correo,
              memberSince: data.fechaRegistroUtc ? new Date(data.fechaRegistroUtc).toLocaleDateString('es-EC') : 'N/A',
              level: 'Viajero Frecuente',
              avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
              stats: { trips: 0, reviews: 0, points: 0 },
              ...data
            };
          }
          this.cargarReservasDesdeMiddleware();
        },
        error: (err) => {
          console.error('Error fetching profile', err);
          this.isLoading = false;
          
          if (err.status === 403) {
            this.errorMessage = 'No tienes permiso para ver este perfil o la cuenta no es de un cliente.';
          } else {
            this.errorMessage = 'No se pudo cargar el perfil.';
          }
          
          return this.lodgingService.getReservaByGuid(providerName, externalId).pipe(
            catchError(err => {
              console.warn(`Error getting lodging reservation details for ${externalId}:`, err);
              return of(null);
            }),
            map(res => {
              if (res) {
                return {
                  ...res,
                  provider: providerName,
                  lodgingName: bk.nombreHotel || bk.nombreServicioSnap || 'Alojamiento',
                  lodgingImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
                  cliente: {
                    nombres: this.user?.name || 'Invitado',
                    correo: this.user?.email || 'invitado@example.com',
                    telefono: '—',
                    direccion: '—'
                  }
                };
              } else {
                // Mock Fallback resiliente
                const cod = externalId.startsWith('guid-') ? externalId.substring(5) : `RES-${externalId.substring(0, 8).toUpperCase()}`;
                return {
                  reservaGuid: externalId,
                  codigoReserva: cod,
                  clienteGuid: bk.guidCliente || guid,
                  sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                  fechaReservaUtc: new Date().toISOString(),
                  fechaInicio: bk.fechaInicio || (new Date().toISOString()),
                  fechaFin: bk.fechaFin || (new Date(new Date().getTime() + 172800000).toISOString()),
                  subtotalReserva: bk.montoTotal ? (bk.montoTotal / 1.15) : 180.00,
                  valorIva: bk.montoTotal ? (bk.montoTotal * 0.15 / 1.15) : 27.00,
                  totalReserva: bk.montoTotal || 207.00,
                  descuentoAplicado: 0,
                  saldoPendiente: bk.montoTotal || 207.00,
                  origenCanalReserva: bk.canalOrigen || 'MARKETPLACE',
                  estadoReserva: 'PEN',
                  provider: providerName,
                  lodgingName: bk.nombreServicioSnap || 'Alojamiento Premium',
                  lodgingImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
                  cliente: {
                    nombres: this.user?.name || 'Invitado',
                    correo: this.user?.email || 'invitado@example.com',
                    telefono: '—',
                    direccion: '—'
                  },
                  habitaciones: [
                    {
                      reservaHabitacionGuid: 'res-hab-guid-mock',
                      habitacionGuid: 'hab-guid-mock',
                      fechaInicio: bk.fechaInicio || (new Date().toISOString()),
                      fechaFin: bk.fechaFin || (new Date(new Date().getTime() + 172800000).toISOString()),
                      numAdultos: 2,
                      numNinos: 0,
                      precioNocheAplicado: bk.montoTotal ? (bk.montoTotal / 2.3) : 90.00,
                      subtotalLinea: bk.montoTotal ? (bk.montoTotal / 1.15) : 180.00,
                      valorIvaLinea: bk.montoTotal ? (bk.montoTotal * 0.15 / 1.15) : 27.00,
                      descuentoLinea: 0,
                      totalLinea: bk.montoTotal || 207.00,
                      estadoDetalle: 'PEN',
                      tipoHabitacion: 'Suite Ejecutiva'
                    }
                  ]
                };
              }
            })
          );
        });

        // ── 2. MAPEAR ATRACCIONES ──
        let attractionRequests = attractionItems.map((bk: any) => {
          const providerName = bk.nombreProveedor || 'jorge';
          const externalId = bk.idReservaExterna || bk.reservaGuid;
          const cod = externalId.startsWith('guid-') ? externalId.substring(5) : `RES-${externalId.substring(0, 8).toUpperCase()}`;
          return of({
            reservaGuid: externalId,
            codigoReserva: cod,
            clienteGuid: bk.guidCliente || guid,
            sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            fechaReservaUtc: new Date().toISOString(),
            fechaInicio: bk.fechaInicio || new Date().toISOString(),
            fechaFin: bk.fechaFin || new Date().toISOString(),
            subtotalReserva: bk.montoTotal ? (bk.montoTotal / 1.15) : 120.00,
            valorIva: bk.montoTotal ? (bk.montoTotal * 0.15 / 1.15) : 18.00,
            totalReserva: bk.montoTotal || 138.00,
            descuentoAplicado: 0,
            saldoPendiente: bk.montoTotal || 138.00,
            origenCanalReserva: bk.canalOrigen || 'MARKETPLACE',
            estadoReserva: 'CON',
            provider: providerName,
            tipoServicio: 'atraccion',
            lodgingName: bk.nombreServicioSnap || 'Atracción Turística Premium',
            lodgingImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
            cliente: {
              nombres: this.user?.name || 'Invitado',
              correo: this.user?.email || 'invitado@example.com',
              telefono: '—',
              direccion: '—'
            },
            habitaciones: []
          });
        });

        // ── 3. MAPEAR AUTOMÓVILES ──
        let carRequests = carItems.map((bk: any) => {
          const providerName = bk.nombreProveedor || 'kelvin';
          const externalId = bk.idReservaExterna || bk.reservaGuid;
          const cod = externalId.startsWith('guid-') ? externalId.substring(5) : `RES-${externalId.substring(0, 8).toUpperCase()}`;
          return of({
            reservaGuid: externalId,
            codigoReserva: cod,
            clienteGuid: bk.guidCliente || guid,
            sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            fechaReservaUtc: new Date().toISOString(),
            fechaInicio: bk.fechaInicio || new Date().toISOString(),
            fechaFin: bk.fechaFin || new Date().toISOString(),
            subtotalReserva: bk.montoTotal ? (bk.montoTotal / 1.15) : 150.00,
            valorIva: bk.montoTotal ? (bk.montoTotal * 0.15 / 1.15) : 22.50,
            totalReserva: bk.montoTotal || 172.50,
            descuentoAplicado: 0,
            saldoPendiente: bk.montoTotal || 172.50,
            origenCanalReserva: bk.canalOrigen || 'MARKETPLACE',
            estadoReserva: 'CON',
            provider: providerName,
            tipoServicio: 'auto',
            lodgingName: bk.nombreServicioSnap || 'Vehículo Sedán Familiar',
            lodgingImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80',
            cliente: {
              nombres: this.user?.name || 'Invitado',
              correo: this.user?.email || 'invitado@example.com',
              telefono: '—',
              direccion: '—'
            },
            habitaciones: []
          });
        });

        // ForkJoin de Alojamientos
        if (lodgingRequests.length === 0 && filteredBookings.length > 0 && items.length === 0) {
          // Fallback a reservas locales si no hay nada en la API pero sí local para este usuario
          this.cargarReservasLocales();
          return;
        }

        const lodgingObs = lodgingRequests.length > 0 ? forkJoin(lodgingRequests) : of([]);
        const attractionObs = attractionRequests.length > 0 ? forkJoin(attractionRequests) : of([]);
        const carObs = carRequests.length > 0 ? forkJoin(carRequests) : of([]);

        forkJoin([lodgingObs, attractionObs, carObs]).subscribe({
          next: (res: any) => {
            const [lodgings, attractions, cars] = res;
            this.reservations = (lodgings || []).filter((r: any) => r !== null);
            this.attractionReservations = (attractions || []).filter((r: any) => r !== null);
            this.carReservations = (cars || []).filter((r: any) => r !== null);
            
            this.isLoadingReservations = false;
            if (this.user) {
              this.user.stats.trips = this.reservations.length + this.attractionReservations.length + this.carReservations.length;
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error combining reservation requests:', err);
            this.isLoadingReservations = false;
            this.cdr.detectChanges();
          }
      this.reservations = [];
      this.attractionReservations = [];
      this.carReservations = [];
      this.isLoadingReservations = false;
      if (this.user) this.user.stats.trips = 0;
      this.cdr.detectChanges();
      return;
    }

    const guidCliente = localStorage.getItem('guidCliente') || localStorage.getItem('clienteGuid') || guid;
    const url = `${environment.apiGatewayUrl}/api/v2/booking/reservas/cliente/${guidCliente}`;
    this.http.get<any>(url).pipe(
      catchError(err => {
        console.error('[ERROR] Error fetching reservations from database:', err);
        return of([]);
      })
    ).subscribe({
      next: (response: any) => {
        let items: any[] = [];
        if (response) {
          if (response.data && response.data.items && Array.isArray(response.data.items)) {
            items = response.data.items;
          } else if (response.data && Array.isArray(response.data)) {
            items = response.data;
          } else if (Array.isArray(response)) {
            items = response;
          } else if (response.items && Array.isArray(response.items)) {
            items = response.items;
          }
        }
        console.log('[DEBUG] Fetched reservations from middleware:', items);

        // Agrupación por tipo de servicio
        const lodgingItems = items.filter((item: any) => 
          (item.tipoServicioSnap || '').toLowerCase() === 'alojamiento' || 
          (item.nombreServicioSnap || '').toLowerCase() === 'alojamiento'
        );
        const attractionItems = items.filter((item: any) => 
          (item.tipoServicioSnap || '').toLowerCase() === 'atraccion' || 
          (item.tipoServicioSnap || '').toLowerCase() === 'atracciones'
        );
        const carItems = items.filter((item: any) => 
          (item.tipoServicioSnap || '').toLowerCase() === 'auto' || 
          (item.tipoServicioSnap || '').toLowerCase() === 'automoviles' || 
          (item.tipoServicioSnap || '').toLowerCase() === 'vehiculo'
        );

        // ── 1. MAPEAR ALOJAMIENTOS DINÁMICAMENTE ──
        let lodgingRequests = lodgingItems.map((bk: any) => {
          const providerName = bk.nombreProveedor || 'juan';
          const externalId = bk.idReservaExterna || bk.reservaGuid;
          
          return this.lodgingService.getReservaByGuid(providerName, externalId).pipe(
            catchError(err => {
              console.warn(`Error getting lodging reservation details for ${externalId}:`, err);
              return of(null);
            }),
            map(res => {
              if (res) {
                return {
                  ...res,
                  provider: providerName,
                  lodgingName: bk.nombreHotel || bk.nombreServicioSnap || 'Alojamiento',
                  lodgingImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
                  cliente: {
                    nombres: this.user?.name || 'Invitado',
                    correo: this.user?.email || 'invitado@example.com',
                    telefono: '—',
                    direccion: '—'
                  }
                };
              } else {
                return null;
              }
            })
          );
        });

        // ── 2. MAPEAR ATRACCIONES DINÁMICAMENTE ──
        let attractionRequests = attractionItems.map((bk: any) => {
          const providerName = bk.nombreProveedor || 'jorge';
          const externalId = bk.idReservaExterna || bk.reservaGuid;
          
          return this.atraccionesService.getReservaDetalle(externalId, providerName).pipe(
            catchError(err => {
              console.warn(`Error getting attraction reservation details for ${externalId}:`, err);
              return of(null);
            }),
            map(res => {
              if (res) {
                const data = res.data || res;
                return {
                  reservaGuid: data.reservaGuid || externalId,
                  codigoReserva: data.codigoReserva || `RES-${externalId.substring(0, 8).toUpperCase()}`,
                  clienteGuid: bk.guidClienteRef || bk.guidCliente || guid,
                  sucursalGuid: data.atraccionGuid || data.sucursalGuid || '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                  fechaReservaUtc: bk.fechaReservaUtc || data.fechaReservaUtc || new Date().toISOString(),
                  fechaInicio: bk.fechaInicio || data.fechaReservaUtc || new Date().toISOString(),
                  fechaFin: bk.fechaFin || data.fechaReservaUtc || new Date().toISOString(),
                  subtotalReserva: data.subtotal || bk.montoTotal || 120.00,
                  valorIva: data.iva || (bk.montoTotal ? (bk.montoTotal * 0.15 / 1.15) : 18.00),
                  totalReserva: data.total || bk.montoTotal || 138.00,
                  descuentoAplicado: 0,
                  saldoPendiente: data.total || bk.montoTotal || 138.00,
                  origenCanalReserva: bk.canalOrigen || 'MARKETPLACE',
                  estadoReserva: bk.estado || 'CON',
                  provider: providerName,
                  tipoServicio: 'atraccion',
                  lodgingName: bk.nombreServicioSnap || 'Atracción Turística',
                  lodgingImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
                  cliente: {
                    nombres: this.user?.name || 'Invitado',
                    correo: this.user?.email || 'invitado@example.com',
                    telefono: '—',
                    direccion: '—'
                  },
                  habitaciones: []
                };
              } else {
                return null;
              }
            })
          );
        });

        // ── 3. MAPEAR AUTOMÓVILES ──
        let carRequests = carItems.map((bk: any) => {
          const providerName = bk.nombreProveedor || 'kelvin';
          const externalId = bk.idReservaExterna || bk.reservaGuid;
          const cod = externalId.startsWith('guid-') ? externalId.substring(5) : `RES-${externalId.substring(0, 8).toUpperCase()}`;
          return of({
            reservaGuid: externalId,
            codigoReserva: cod,
            clienteGuid: bk.guidClienteRef || bk.guidCliente || guid,
            sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            fechaReservaUtc: bk.fechaReservaUtc || new Date().toISOString(),
            fechaInicio: bk.fechaInicio || new Date().toISOString(),
            fechaFin: bk.fechaFin || new Date().toISOString(),
            subtotalReserva: bk.montoTotal ? (bk.montoTotal / 1.15) : 150.00,
            valorIva: bk.montoTotal ? (bk.montoTotal * 0.15 / 1.15) : 22.50,
            totalReserva: bk.montoTotal || 172.50,
            descuentoAplicado: 0,
            saldoPendiente: bk.montoTotal || 172.50,
            origenCanalReserva: bk.canalOrigen || 'MARKETPLACE',
            estadoReserva: bk.estado || 'CON',
            provider: providerName,
            tipoServicio: 'auto',
            lodgingName: bk.nombreServicioSnap || 'Vehículo Sedán Familiar',
            lodgingImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80',
            cliente: {
              nombres: this.user?.name || 'Invitado',
              correo: this.user?.email || 'invitado@example.com',
              telefono: '—',
              direccion: '—'
            },
            habitaciones: []
          });
        });

        const lodgingObs = lodgingRequests.length > 0 ? forkJoin(lodgingRequests) : of([]);
        const attractionObs = attractionRequests.length > 0 ? forkJoin(attractionRequests) : of([]);
        const carObs = carRequests.length > 0 ? forkJoin(carRequests) : of([]);

        forkJoin([lodgingObs, attractionObs, carObs]).subscribe({
          next: (res: any) => {
            const [lodgings, attractions, cars] = res;
            this.reservations = (lodgings || []).filter((r: any) => r !== null);
            this.attractionReservations = (attractions || []).filter((r: any) => r !== null);
            this.carReservations = (cars || []).filter((r: any) => r !== null);
            
            this.isLoadingReservations = false;
            if (this.user) {
              this.user.stats.trips = this.reservations.length + this.attractionReservations.length + this.carReservations.length;
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error combining reservation requests:', err);
            this.isLoadingReservations = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('[ERROR] Error fetching reservations from database:', err);
        this.reservations = [];
        this.attractionReservations = [];
        this.carReservations = [];
        this.isLoadingReservations = false;
        if (this.user) this.user.stats.trips = 0;
        this.cdr.detectChanges();
      }
    });
  }



  openReservaDetails(reserva: any): void {
    console.log('[DEBUG] openReservaDetails:', reserva);
    this.selectedReserva = reserva;
    
    // Consultar detalles del hospedaje para mapear el tipo de habitación dinámicamente
    if (reserva.sucursalGuid && reserva.provider) {
      this.lodgingService.getLodgingById(reserva.sucursalGuid, reserva.provider).subscribe(lodging => {
        if (lodging && lodging.habitaciones) {
          this.selectedReserva.habitaciones = this.selectedReserva.habitaciones.map((rm: any) => {
            const roomMatch = lodging.habitaciones.find((r: any) => r.id === rm.habitacionGuid);
            return {
              ...rm,
              tipoHabitacion: roomMatch ? roomMatch.nombre : (rm.tipoHabitacion || 'Habitación Premium')
            };
          });
          this.cdr.detectChanges();

        }
      });
    }
    
    this.cdr.detectChanges();
  }

  closeReservaDetails(): void {
    console.log('[DEBUG] closeReservaDetails');
    this.selectedReserva = null;
    this.cdr.detectChanges();
  }

  // Formateadores de fecha
  fmtDateShort(val: string): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  fmtDateTime(val: string): string {
    if (!val) return '—';
    return new Date(val).toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
