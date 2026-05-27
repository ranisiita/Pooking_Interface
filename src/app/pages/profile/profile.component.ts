import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LodgingService } from '../../services/lodging.service';
import { AtraccionesService } from '../../features/atracciones/services/atracciones.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

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
  private route = inject(ActivatedRoute);
  private lodgingService = inject(LodgingService);
  private atraccionesService = inject(AtraccionesService);
  private cdr = inject(ChangeDetectorRef);

  // GUIDs fijos de tipo de servicio (acordados con backend).
  private readonly TIPO_ATRACCIONES_GUID = '5bbd422f-6ddb-48c3-86c3-28046ff263ee';
  private readonly TIPO_ALOJAMIENTO_GUID = '7649eca9-0480-44b0-aaf0-2dcf4ebc45bc';
  private readonly TIPO_AUTOS_GUID = '1c6219ac-9154-4fa7-9c4d-91b3a5d1e673';
  private readonly TIPO_VUELOS_GUID = '55efed9f-f9f0-4376-acec-fa8c76954cc6';

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

  /** Tipo de servicio de la reserva actualmente abierta en el modal. */
  tipoServicioActual: 'lodging' | 'attractions' | 'cars' | 'flights' | 'unknown' = 'unknown';

  /** Aviso suave cuando el detalle externo del proveedor falla. */
  detalleApiCaida: string | null = null;

  setTab(tab: 'alojamiento' | 'atracciones' | 'automoviles'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    // Si llegamos con ?tab=atracciones / alojamiento / automoviles, abrimos
    // esa pestaña directamente (atracciones lo usa al "Ver mis reservas").
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'atracciones' || tabParam === 'alojamiento' || tabParam === 'automoviles') {
      this.activeTab = tabParam;
    }

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
        stats: { trips: 0, reviews: 0, points: 0, lodgingCount: 0, attractionsCount: 0, carsCount: 0 }
      };
      this.cargarReservasDesdeMiddleware();
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(`${environment.apiGatewayUrl}/api/v2/booking/clientes/usuario-guid/${guid}`, { headers })
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
              stats: { trips: 0, reviews: 0, points: 0, lodgingCount: 0, attractionsCount: 0, carsCount: 0 },
              ...data
            };
          }
          this.cargarReservasDesdeMiddleware();
        },
        error: (err) => {
          console.error('Error fetching profile', err);
          this.isLoading = false;
          
          // En caso de error, cargamos un usuario guest por si acaso
          this.user = {
            name: 'Huésped Invitado',
            email: 'invitado@pooking.ec',
            memberSince: new Date().toLocaleDateString('es-EC'),
            level: 'Explorador',
            avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
            stats: { trips: 0, reviews: 0, points: 0, lodgingCount: 0, attractionsCount: 0, carsCount: 0 }
          };
          this.cargarReservasDesdeMiddleware();
        }
      });
  }

  cargarReservasDesdeMiddleware(): void {
    this.isLoadingReservations = true;
    this.cdr.detectChanges();

    let localBookings: any[] = [];
    try {
      const bookingsStr = localStorage.getItem('pooking_lodging_reservations') || '[]';
      localBookings = JSON.parse(bookingsStr);
    } catch (e) {
      console.error('Error parsing local lodging reservations:', e);
    }

    const guid = localStorage.getItem('usuarioGuid');
    const userEmail = this.user?.email;
    const filteredBookings = localBookings.filter(bk => {
      if (bk.usuarioGuid && guid) {
        return bk.usuarioGuid === guid;
      }
      if (bk.clienteEmail && userEmail) {
        return bk.clienteEmail.toLowerCase() === userEmail.toLowerCase();
      }
      return false;
    });

    if (!guid) {
      this.reservations = [];
      this.attractionReservations = [];
      this.carReservations = [];
      this.isLoadingReservations = false;
      if (this.user) this.user.stats.trips = 0;
      this.cdr.detectChanges();
      return;
    }

    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({
      'Authorization': `Bearer ${token}`
    }) : undefined;

    const guidCliente = localStorage.getItem('guidCliente') || localStorage.getItem('clienteGuid') || guid;
    const url = `${environment.apiGatewayUrl}/api/v2/booking/reservas/cliente/${guidCliente}`;
    this.http.get<any>(url, { headers }).pipe(
      catchError(err => {
        console.warn('[WARNING] Error fetching reservations from middleware. Falling back to local storage...', err);
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

        // Agrupación por tipo — usa la función centralizada `getServiceType`.
        // Acepta tanto el `guidServicioRef` (GUID fijo) como `tipoServicioSnap`
        // en formato ID numérico ('1'/'3'/'5') o textual ('alojamiento', etc.).
        const lodgingItems = items.filter((it: any) => this.getServiceType(it) === 'lodging');
        const attractionItems = items.filter((it: any) => this.getServiceType(it) === 'attractions');
        const carItems = items.filter((it: any) => this.getServiceType(it) === 'cars');

        // ── 1. MAPEAR ALOJAMIENTOS DINÁMICAMENTE ──
        let lodgingRequests = lodgingItems.map((bk: any) => {
          const providerName = bk.nombreProveedor || 'juan';
          const externalId = bk.idReservaExterna || bk.reservaGuid;
          
          return this.lodgingService.getReservaByGuid(providerName, externalId).pipe(
            catchError(err => {
              console.warn(`Error getting lodging reservation details for ${externalId}:`, err);
              return of(null);
            }),
            switchMap(res => {
              const sucursalGuid = res?.sucursalGuid || bk.guidServicioRef;
              if (!sucursalGuid) {
                return of({ res, lodging: null });
              }
              return this.lodgingService.getLodgingById(sucursalGuid, providerName).pipe(
                catchError(err => {
                  console.warn(`Error getting lodging details for sucursal ${sucursalGuid}:`, err);
                  return of(null);
                }),
                map(lodging => ({ res, lodging }))
              );
            }),
            map(({ res, lodging }) => {
              let mappedEstado = 'PEN';
              const bkEstado = (bk.estado || '').toUpperCase();
              if (bkEstado === 'PEND' || bkEstado === 'PENDIENTE' || bkEstado === 'PEN') {
                mappedEstado = 'PEN';
              } else if (bkEstado === 'CONF' || bkEstado === 'CONFIRMADA' || bkEstado === 'CON' || bkEstado === 'CON-PAGO') {
                mappedEstado = 'CON';
              } else if (bkEstado === 'CANC' || bkEstado === 'CANCELADA' || bkEstado === 'CAN') {
                mappedEstado = 'CAN';
              }

              const total = bk.montoTotal || 0;
              const subtotal = total / 1.15;
              const iva = total - subtotal;
              
              const lodgingName = lodging?.nombre || bk.nombreServicioSnap || bk.nombreHotel || 'Alojamiento';
              const lodgingImage = lodging?.imagen || '';

              if (res) {
                return {
                  ...res,
                  provider: providerName,
                  lodgingName: lodgingName,
                  lodgingImage: lodgingImage,
                  estadoReserva: mappedEstado,
                  cliente: {
                    nombres: this.user ? `${this.user.nombres || ''} ${this.user.apellidos || ''}`.trim() || this.user.name : 'Invitado',
                    correo: this.user?.correo || this.user?.email || 'invitado@example.com',
                    telefono: this.user?.telefono || '—',
                    direccion: this.user?.direccion || '—'
                  }
                };
              } else {
                // If getReservaByGuid fails, we STILL show it with the middleware data (no fictitious rooms!)
                return {
                  reservaGuid: bk.guidReserva,
                  codigoReserva: bk.idReservaExterna || bk.guidReserva,
                  clienteGuid: bk.guidClienteRef || guidCliente,
                  sucursalGuid: bk.guidServicioRef || '',
                  fechaReservaUtc: bk.fechaReservaUtc || '',
                  fechaInicio: bk.fechaInicio,
                  fechaFin: bk.fechaFin,
                  subtotalReserva: subtotal,
                  valorIva: iva,
                  totalReserva: total,
                  descuentoAplicado: 0,
                  saldoPendiente: total,
                  origenCanalReserva: bk.canalOrigen || 'Pooking',
                  estadoReserva: mappedEstado,
                  provider: providerName,
                  lodgingName: lodgingName,
                  lodgingImage: lodgingImage,
                  observaciones: bk.observaciones || '',
                  cliente: {
                    nombres: this.user ? `${this.user.nombres || ''} ${this.user.apellidos || ''}`.trim() || this.user.name : 'Invitado',
                    correo: this.user?.correo || this.user?.email || 'invitado@example.com',
                    telefono: this.user?.telefono || '—',
                    direccion: this.user?.direccion || '—'
                  },
                  habitaciones: []
                };
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
              let mappedEstado = 'PEN';
              const bkEstado = (bk.estado || '').toUpperCase();
              if (bkEstado === 'PEND' || bkEstado === 'PENDIENTE' || bkEstado === 'PEN') {
                mappedEstado = 'PEN';
              } else if (bkEstado === 'CONF' || bkEstado === 'CONFIRMADA' || bkEstado === 'CON' || bkEstado === 'CON-PAGO') {
                mappedEstado = 'CON';
              } else if (bkEstado === 'CANC' || bkEstado === 'CANCELADA' || bkEstado === 'CAN') {
                mappedEstado = 'CAN';
              }

              const total = bk.montoTotal || 0;
              const subtotal = total / 1.15;
              const iva = total - subtotal;

              // Imagen real de la atracción persistida al momento de reservar
              // (el endpoint general /clientes/reservas no la expone). Si no
              // existe, el template usa el gradient como fallback automático.
              const imagenAtraccion = this.obtenerImagenAtraccionLocal(externalId);

              if (res) {
                const data = res.data || res;
                return {
                  reservaGuid: data.rev_guid || externalId,
                  // `idReservaExterna` se conserva explícito para que el
                  // modal de detalle pueda re-consultar el endpoint correcto:
                  //   GET /{provider}/api/v2/reservas/{rev_guid}
                  idReservaExterna: externalId,
                  codigoReserva: data.rev_codigo || `RES-${externalId.substring(0, 8).toUpperCase()}`,
                  clienteGuid: bk.guidClienteRef || bk.guidCliente || guid,
                  sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                  fechaReservaUtc: bk.fechaReservaUtc || data.rev_fecha_reserva_utc || new Date().toISOString(),
                  fechaInicio: bk.fechaInicio || data.hor_fecha || new Date().toISOString(),
                  fechaFin: bk.fechaFin || data.hor_fecha || new Date().toISOString(),
                  subtotalReserva: data.rev_subtotal || subtotal,
                  valorIva: data.rev_valor_iva || iva,
                  totalReserva: data.rev_total || total,
                  descuentoAplicado: 0,
                  saldoPendiente: data.rev_total || total,
                  origenCanalReserva: bk.canalOrigen || 'MARKETPLACE',
                  estadoReserva: mappedEstado,
                  provider: providerName,
                  tipoServicio: 'atraccion',
                  lodgingName: data.atraccion_nombre || bk.nombreServicioSnap || 'Atracción Turística',
                  lodgingImage: imagenAtraccion,
                  cliente: {
                    nombres: this.user ? `${this.user.nombres || ''} ${this.user.apellidos || ''}`.trim() || this.user.name : 'Invitado',
                    correo: this.user?.correo || this.user?.email || 'invitado@example.com',
                    telefono: this.user?.telefono || '—',
                    direccion: this.user?.direccion || '—'
                  },
                  habitaciones: []
                };
              } else {
                // If getReservaDetalle fails, we STILL show it with the middleware data
                return {
                  reservaGuid: bk.guidReserva,
                  // Mismo que arriba: idReservaExterna se conserva para que
                  // el modal pueda reintentar el detalle externo del proveedor.
                  idReservaExterna: externalId,
                  codigoReserva: bk.idReservaExterna || bk.guidReserva,
                  clienteGuid: bk.guidClienteRef || guidCliente,
                  sucursalGuid: bk.guidServicioRef || '',
                  fechaReservaUtc: bk.fechaReservaUtc || '',
                  fechaInicio: bk.fechaInicio,
                  fechaFin: bk.fechaFin || bk.fechaInicio,
                  subtotalReserva: subtotal,
                  valorIva: iva,
                  totalReserva: total,
                  descuentoAplicado: 0,
                  saldoPendiente: total,
                  origenCanalReserva: bk.canalOrigen || 'Pooking',
                  estadoReserva: mappedEstado,
                  provider: providerName,
                  tipoServicio: 'atraccion',
                  lodgingName: bk.nombreServicioSnap || 'Atracción Turística',
                  lodgingImage: imagenAtraccion,
                  observaciones: bk.observaciones || '',
                  cliente: {
                    nombres: this.user ? `${this.user.nombres || ''} ${this.user.apellidos || ''}`.trim() || this.user.name : 'Invitado',
                    correo: this.user?.correo || this.user?.email || 'invitado@example.com',
                    telefono: this.user?.telefono || '—',
                    direccion: this.user?.direccion || '—'
                  },
                  habitaciones: []
                };
              }
            })
          );
        });

        // ── 3. MAPEAR AUTOMÓVILES ──
        let carRequests = carItems.map((bk: any) => {
          const providerName = bk.nombreProveedor || 'kelvin';
          const externalId = bk.idReservaExterna || bk.reservaGuid || bk.guidReserva;
          const cod = externalId.startsWith('guid-') ? externalId.substring(5) : `RES-${externalId.substring(0, 8).toUpperCase()}`;
          
          let mappedEstado = 'PEN';
          const bkEstado = (bk.estado || '').toUpperCase();
          if (bkEstado === 'PEND' || bkEstado === 'PENDIENTE' || bkEstado === 'PEN') {
            mappedEstado = 'PEN';
          } else if (bkEstado === 'CONF' || bkEstado === 'CONFIRMADA' || bkEstado === 'CON' || bkEstado === 'CON-PAGO') {
            mappedEstado = 'CON';
          } else if (bkEstado === 'CANC' || bkEstado === 'CANCELADA' || bkEstado === 'CAN') {
            mappedEstado = 'CAN';
          }

          const total = bk.montoTotal || 0;
          const subtotal = total / 1.15;
          const iva = total - subtotal;

          return of({
            reservaGuid: bk.guidReserva || externalId,
            codigoReserva: bk.idReservaExterna || cod,
            clienteGuid: bk.guidClienteRef || guidCliente,
            sucursalGuid: bk.guidServicioRef || '',
            fechaReservaUtc: bk.fechaReservaUtc || '',
            fechaInicio: bk.fechaInicio,
            fechaFin: bk.fechaFin || bk.fechaInicio,
            subtotalReserva: subtotal,
            valorIva: iva,
            totalReserva: total,
            descuentoAplicado: 0,
            saldoPendiente: total,
            origenCanalReserva: bk.canalOrigen || 'Pooking',
            estadoReserva: mappedEstado,
            provider: providerName,
            tipoServicio: 'auto',
            lodgingName: bk.nombreServicioSnap || 'Vehículo Sedán Familiar',
            lodgingImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80',
            observaciones: bk.observaciones || '',
            cliente: {
              nombres: this.user ? `${this.user.nombres || ''} ${this.user.apellidos || ''}`.trim() || this.user.name : 'Invitado',
              correo: this.user?.correo || this.user?.email || 'invitado@example.com',
              telefono: this.user?.telefono || '—',
              direccion: this.user?.direccion || '—'
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
              this.user.stats.lodgingCount = this.reservations.length;
              this.user.stats.attractionsCount = this.attractionReservations.length;
              this.user.stats.carsCount = this.carReservations.length;
              // `trips` se conserva por retro-compatibilidad como total general.
              this.user.stats.trips =
                this.reservations.length + this.attractionReservations.length + this.carReservations.length;
            }
            this.cdr.detectChanges();
            // Hidratación diferida: para reservas de atracciones sin imagen
            // cacheada, consulta el listado del proveedor y matchea por nombre.
            this.hidratarImagenesAtraccionesPendientes();
          },
          error: (err) => {
            console.error('Error combining reservation requests:', err);
            this.isLoadingReservations = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error in middleware response, executing localStorage fallback:', err);
        this.cargarReservasLocales();
      }
    });
  }

  cargarReservasLocales(): void {
    this.isLoadingReservations = true;
    this.cdr.detectChanges();

    let localBookings: any[] = [];
    try {
      const bookingsStr = localStorage.getItem('pooking_lodging_reservations') || '[]';
      localBookings = JSON.parse(bookingsStr);
    } catch (e) {
      console.error('Error parsing local lodging reservations:', e);
    }

    const guid = localStorage.getItem('usuarioGuid');
    const userEmail = this.user?.email;
    const filteredBookings = localBookings.filter(bk => {
      if (bk.usuarioGuid && guid) {
        return bk.usuarioGuid === guid;
      }
      if (bk.clienteEmail && userEmail) {
        return bk.clienteEmail.toLowerCase() === userEmail.toLowerCase();
      }
      return false;
    });

    if (filteredBookings.length === 0) {
      this.reservations = [];
      this.attractionReservations = [];
      this.carReservations = [];
      this.isLoadingReservations = false;
      if (this.user) {
        this.user.stats.trips = 0;
      }
      this.cdr.detectChanges();
      return;
    }

    const requests = filteredBookings.map((bk: any) => {
      return this.lodgingService.getReservaByGuid(bk.provider, bk.reservaGuid).pipe(
        catchError(err => {
          console.warn(`Error getting reservation details for ${bk.reservaGuid}:`, err);
          return of(null);
        }),
        map(res => {
          if (res) {
            // Unificar con los metadatos almacenados en localStorage (nombre del hotel, cliente, etc.)
            return {
              ...res,
              provider: bk.provider,
              lodgingName: bk.lodgingName || 'Alojamiento',
              lodgingImage: bk.lodgingImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
              cliente: {
                nombres: bk.clienteNombre || this.user?.name || 'Invitado',
                correo: bk.clienteEmail || this.user?.email || 'invitado@example.com',
                telefono: bk.clienteTelefono || '—',
                direccion: bk.clienteDireccion || '—'
              }
            };
          } else {
            // Si el servicio no responde, generamos el objeto mock conforme al contrato GET del alojamiento
            const cod = bk.reservaGuid.startsWith('guid-') ? bk.reservaGuid.substring(5) : `RES-${bk.reservaGuid.substring(0, 8).toUpperCase()}`;
            return {
              reservaGuid: bk.reservaGuid,
              codigoReserva: cod,
              clienteGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              fechaReservaUtc: new Date().toISOString(),
              fechaInicio: bk.fechaInicio + 'T14:00:00.000Z',
              fechaFin: new Date(new Date(bk.fechaInicio).getTime() + 172800000).toISOString().substring(0, 10) + 'T12:00:00.000Z',
              subtotalReserva: 180.00,
              valorIva: 27.00,
              totalReserva: 207.00,
              descuentoAplicado: 0,
              saldoPendiente: 207.00,
              origenCanalReserva: 'MARKETPLACE',
              estadoReserva: 'PEN',
              provider: bk.provider,
              lodgingName: bk.lodgingName,
              lodgingImage: bk.lodgingImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
              cliente: {
                nombres: bk.clienteNombre || this.user?.name || 'Invitado',
                correo: bk.clienteEmail || this.user?.email || 'invitado@example.com',
                telefono: bk.clienteTelefono || '—',
                direccion: bk.clienteDireccion || '—'
              },
              habitaciones: [
                {
                  reservaHabitacionGuid: 'res-hab-guid-mock',
                  habitacionGuid: 'hab-guid-mock',
                  fechaInicio: bk.fechaInicio + 'T14:00:00.000Z',
                  fechaFin: new Date(new Date(bk.fechaInicio).getTime() + 172800000).toISOString().substring(0, 10) + 'T12:00:00.000Z',
                  numAdultos: 2,
                  numNinos: 0,
                  precioNocheAplicado: 90.00,
                  subtotalLinea: 180.00,
                  valorIvaLinea: 27.00,
                  descuentoLinea: 0,
                  totalLinea: 207.00,
                  estadoDetalle: 'PEN',
                  tipoHabitacion: 'Suite Ejecutiva'
                }
              ]
            };
          }
        })
      );
    });

    forkJoin(requests).subscribe((results: any) => {
      this.reservations = results.filter((r: any) => r !== null);
      this.isLoadingReservations = false;
      if (this.user) {
        this.user.stats.trips = this.reservations.length;
      }
      this.cdr.detectChanges();
    });
  }

  openReservaDetails(reserva: any): void {
    console.log('[DEBUG] openReservaDetails:', reserva);
    this.selectedReserva = reserva;
    this.detalleApiCaida = null;
    this.tipoServicioActual = this.getServiceType(reserva);
    // Logs temporales — TODO(debug): retirar tras validar en prod.
    console.info(
      '[Profile] Modal · tipo detectado =', this.tipoServicioActual,
      '· tipoServicio=', reserva?.tipoServicio,
      '· tipoServicioSnap=', reserva?.tipoServicioSnap,
      '· guidServicioRef=', reserva?.guidServicioRef,
    );

    switch (this.tipoServicioActual) {
      case 'lodging':
        // Comportamiento original de alojamientos — usa `reserva.provider`
        // tal cual viene (sin normalizar) para preservar el patrón original.
        if (reserva.sucursalGuid && reserva.provider) {
          this.lodgingService.getLodgingById(reserva.sucursalGuid, reserva.provider).subscribe({
            next: (lodging: any) => {
              if (lodging && lodging.habitaciones && this.selectedReserva?.habitaciones) {
                this.selectedReserva.habitaciones = this.selectedReserva.habitaciones.map((rm: any) => {
                  const roomMatch = lodging.habitaciones.find((r: any) => r.id === rm.habitacionGuid);
                  return {
                    ...rm,
                    tipoHabitacion: roomMatch ? roomMatch.nombre : (rm.tipoHabitacion || 'Habitación Premium'),
                  };
                });
                this.cdr.detectChanges();
              }
            },
            error: () => {
              this.detalleApiCaida =
                'No se pudo obtener el detalle actualizado del proveedor. Se muestra la información guardada en tu historial.';
              this.cdr.detectChanges();
            },
          });
        }
        break;

      case 'attractions': {
        // Pasa el provider TAL CUAL viene del historial (preservando el
        // case original, p. ej. "Luis"/"Jhonatan"). El middleware acepta
        // ese formato en los demás endpoints de atracciones, así que no se
        // normaliza a minúscula a ciegas para no romper la consulta.
        const providerOriginal = String(reserva.provider || reserva.nombreProveedor || '').trim();
        this.cargarDetalleAtraccion(reserva, providerOriginal);
        break;
      }

      // Autos / vuelos / desconocido: usar snapshot del historial sin
      // llamadas adicionales — el modal ya tiene los datos básicos.
      default:
        break;
    }

    this.cdr.detectChanges();
  }

  /**
   * Detalle de atracción — consulta el endpoint correcto del proveedor:
   *   GET /{provider}/api/v2/reservas/{rev_guid}
   *
   * `idReservaExterna` del historial = `rev_guid` de la reserva externa.
   * Si el proveedor está apagado o falla, no rompe el modal: se muestra el
   * snapshot del historial + un aviso ámbar suave.
   */
  private cargarDetalleAtraccion(reserva: any, provider: string): void {
    const revGuid = reserva.idReservaExterna || reserva.codigoReserva || reserva.reservaGuid;
    if (!provider || !revGuid) {
      console.warn('[Profile] Falta provider o rev_guid para detalle de atracción', { provider, revGuid });
      return;
    }
    console.info('[Profile] Llamando detalle atracción → /', provider, '/api/v2/reservas/', revGuid);
    this.atraccionesService.getReservaDetalle(revGuid, provider as any).subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? resp;
        // Logs temporales — TODO(debug): retirar tras validar en prod.
        console.info('[Profile] Detalle atracción response:', data);
        console.info('[Profile] data.detalle (tickets) =', data?.detalle);
        if (data) {
          // Mapea el `rev_estado` del proveedor (PENDIENTE/PAGADA/CANCELADA)
          // al código corto que usa el modal (PEN/CON/CAN) para que el badge
          // y el saldo pendiente se actualicen correctamente.
          const revEstado = String(data.rev_estado ?? '').toUpperCase();
          let estadoCorto = this.selectedReserva.estadoReserva;
          if (revEstado === 'PAGADA' || revEstado === 'PAG' || revEstado === 'CONFIRMADA') {
            estadoCorto = 'CON';
          } else if (revEstado === 'PENDIENTE' || revEstado === 'PEND' || revEstado === 'PEN') {
            estadoCorto = 'PEN';
          } else if (revEstado === 'CANCELADA' || revEstado === 'CANC' || revEstado === 'CAN') {
            estadoCorto = 'CAN';
          }

          // Si está pagada, saldo pendiente = 0.
          const totalReal = data.rev_total ?? this.selectedReserva.totalReserva;
          const yaPagada = revEstado === 'PAGADA' || revEstado === 'PAG' || revEstado === 'CONFIRMADA';

          this.selectedReserva = {
            ...this.selectedReserva,
            codigoReserva: data.rev_codigo ?? this.selectedReserva.codigoReserva,
            lodgingName: data.atraccion_nombre ?? this.selectedReserva.lodgingName,
            fechaInicio: data.hor_fecha
              ? `${data.hor_fecha}T${(data.hor_hora_inicio || '00:00')}:00`
              : this.selectedReserva.fechaInicio,
            fechaFin: data.hor_fecha
              ? `${data.hor_fecha}T${(data.hor_hora_fin || '23:59')}:00`
              : this.selectedReserva.fechaFin,
            moneda: data.moneda ?? this.selectedReserva.moneda ?? 'USD',
            estadoReserva: estadoCorto,
            estadoReservaProveedor: data.rev_estado ?? '',
            subtotalReserva: data.rev_subtotal ?? this.selectedReserva.subtotalReserva,
            valorIva: data.rev_valor_iva ?? this.selectedReserva.valorIva,
            totalReserva: totalReal,
            saldoPendiente: yaPagada ? 0 : (totalReal ?? this.selectedReserva.saldoPendiente),
            fechaReservaUtc: data.rev_fecha_reserva_utc ?? this.selectedReserva.fechaReservaUtc,
            detalleAtraccion: data.detalle ?? [],
          };
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        console.warn(
          '[Profile] Detalle de atracción falló · status=', err?.status,
          '· provider=', provider, '· rev_guid=', revGuid,
        );
        const providerLbl = this.providerLabel(provider);
        if (err?.status === 0 || err?.status >= 500) {
          this.detalleApiCaida = `El proveedor ${providerLbl} no está disponible en este momento. Se muestra la información guardada en tu historial.`;
        } else if (err?.status === 404) {
          this.detalleApiCaida =
            'No encontramos la reserva en el proveedor. Se muestra la información guardada en tu historial.';
        } else {
          this.detalleApiCaida =
            'No se pudo obtener el detalle actualizado del proveedor. Se muestra la información guardada en tu historial.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  closeReservaDetails(): void {
    console.log('[DEBUG] closeReservaDetails');
    this.selectedReserva = null;
    this.tipoServicioActual = 'unknown';
    this.detalleApiCaida = null;
    this.cdr.detectChanges();
  }

  getReservationGradient(res: any): string {
    const seed = res?.codigoReserva || res?.reservaGuid || '';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 5;
    const gradients = [
      'linear-gradient(135deg, #8E5A54 0%, #C6B17D 100%)',
      'linear-gradient(135deg, #606256 0%, #C6B17D 100%)',
      'linear-gradient(135deg, #8E5A54 0%, #46403C 100%)',
      'linear-gradient(135deg, #606256 0%, #8E5A54 100%)',
      'linear-gradient(135deg, #46403C 0%, #C6B17D 100%)'
    ];
    return gradients[index];
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

  /** Devuelve solo la hora (HH:mm) de un ISO. Útil para horarios de atracciones. */
  fmtTime(val: string): string {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  /** Capitaliza el nombre del proveedor para UI: "luis" → "Luis". */
  providerLabel(p: string | undefined | null): string {
    if (!p) return 'Pooking';
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }

  /**
   * Función centralizada para clasificar reservas por tipo de servicio.
   *
   * Reglas (en orden de prioridad):
   *   1) `guidServicioRef` coincide con un GUID fijo → fuente de verdad.
   *   2) `tipoServicio` interno (el mapping del historial guarda 'atraccion'
   *      en atracciones y 'auto' en autos, por ejemplo).
   *   3) `tipoServicioSnap` como ID numérico ('1'/'2'/'3'/'5') o textual.
   *   4) Fallback histórico: por `nombreServicioSnap` (alojamiento) o por
   *      presencia de `habitaciones[]` (lodging clásico que no marca tipo).
   *   5) Sin match → 'unknown' (NO se asume alojamiento).
   */
  getServiceType(reserva: any): 'lodging' | 'attractions' | 'cars' | 'flights' | 'unknown' {
    if (!reserva) return 'unknown';

    // (1) GUID fijo del tipo
    const guidRef = reserva.guidServicioRef;
    if (guidRef === this.TIPO_ATRACCIONES_GUID) return 'attractions';
    if (guidRef === this.TIPO_ALOJAMIENTO_GUID) return 'lodging';
    if (guidRef === this.TIPO_AUTOS_GUID) return 'cars';
    if (guidRef === this.TIPO_VUELOS_GUID) return 'flights';

    // (2) Campo `tipoServicio` interno que asigna el mapping del historial.
    //     attractionRequests guarda 'atraccion'; carRequests guarda 'auto'.
    const tipoInterno = String(reserva.tipoServicio ?? '').toLowerCase().trim();
    if (tipoInterno === 'atraccion' || tipoInterno === 'atracciones' || tipoInterno === 'attractions') return 'attractions';
    if (
      tipoInterno === 'auto' || tipoInterno === 'autos' ||
      tipoInterno === 'cars' || tipoInterno === 'vehiculo' || tipoInterno === 'vehículo'
    ) return 'cars';
    if (tipoInterno === 'alojamiento' || tipoInterno === 'lodging' || tipoInterno === 'hotel') return 'lodging';
    if (tipoInterno === 'vuelo' || tipoInterno === 'vuelos' || tipoInterno === 'flights') return 'flights';

    // (3) tipoServicioSnap (formato directo del middleware)
    const tipo = String(reserva.tipoServicioSnap ?? '').toLowerCase().trim();
    if (tipo === '3' || tipo === 'atraccion' || tipo === 'atracciones' || tipo === 'atracción') return 'attractions';
    if (tipo === '1' || tipo === 'alojamiento' || tipo === 'hotel' || tipo === 'hospedaje') return 'lodging';
    if (
      tipo === '5' || tipo === '2' ||
      tipo === 'auto' || tipo === 'autos' ||
      tipo === 'automovil' || tipo === 'automoviles' || tipo === 'automóviles' ||
      tipo === 'vehiculo' || tipo === 'vehículo' || tipo === 'vehiculos' || tipo === 'vehículos'
    ) {
      return 'cars';
    }
    if (tipo === 'vuelo' || tipo === 'vuelos' || tipo === 'flight') return 'flights';

    // (4) Fallback histórico
    const nombre = String(reserva.nombreServicioSnap ?? '').toLowerCase().trim();
    if (nombre === 'alojamiento') return 'lodging';
    // Si tiene array `habitaciones` no vacío, es lodging clásico que no
    // marcó su tipo (preserva el comportamiento previo a esta refactorización).
    if (Array.isArray(reserva.habitaciones) && reserva.habitaciones.length > 0) return 'lodging';

    return 'unknown';
  }

  /** Normaliza "Luis"/"LUIS" → "luis" para construir rutas del bus. */
  normalizeProvider(name: string | undefined | null): string {
    if (!name) return '';
    return String(name).trim().toLowerCase();
  }

  /**
   * Lee del localStorage la imagen real de una atracción asociada a
   * `revGuid`. La persistencia la hace `atracciones-reserva` al momento
   * de crear la reserva, o se hidrata después por matching de nombre
   * en `hidratarImagenesAtraccionesPendientes()`.
   * Si no hay imagen, devuelve cadena vacía → el template usa el gradient
   * como fallback automático.
   */
  private obtenerImagenAtraccionLocal(revGuid: string | undefined | null): string {
    if (!revGuid) return '';
    try {
      const raw = localStorage.getItem('pooking_atracciones_images');
      if (!raw) return '';
      const map = JSON.parse(raw);
      return (map[revGuid] as string) || '';
    } catch {
      return '';
    }
  }

  /** Cachea en localStorage la imagen real para una reserva por rev_guid. */
  private guardarImagenAtraccionLocal(revGuid: string, url: string): void {
    if (!revGuid || !url) return;
    try {
      const raw = localStorage.getItem('pooking_atracciones_images') ?? '{}';
      const map = JSON.parse(raw);
      map[revGuid] = url;
      localStorage.setItem('pooking_atracciones_images', JSON.stringify(map));
    } catch (e) {
      console.warn('[Profile] No se pudo cachear imagen de atracción:', e);
    }
  }

  /**
   * Hidratación diferida (lazy + best-effort) de las imágenes de atracciones.
   *
   * Para reservas anteriores que NO tienen imagen cacheada en localStorage
   * (por ejemplo, creadas en otra sesión/navegador), intenta recuperar la
   * imagen real haciendo matching por nombre contra el listado público del
   * proveedor:
   *
   *   GET /{provider}/api/v2/atracciones
   *
   * Estrategia:
   *   1) Filtra reservas de atracciones que están sin imagen.
   *   2) Agrupa por provider (normalizado).
   *   3) Por cada provider, hace UNA SOLA consulta al listado y matchea cada
   *      reserva por `nombre`. Esto evita N requests por reserva.
   *   4) Si hay match, actualiza la card y cachea en localStorage.
   *   5) Si el provider falla (caído/CORS), no rompe nada: la card queda
   *      con gradient, sin errores visibles para el usuario.
   *
   * El detalle externo `/reservas/{rev_guid}` no expone la imagen ni el
   * `at_guid` según el contrato — por eso el matching va contra el listado.
   * Si en el futuro el backend agrega `at_guid` al response del detalle de
   * reserva, esta función puede simplificarse a consultar el detalle de
   * atracción directamente por id.
   */
  private hidratarImagenesAtraccionesPendientes(): void {
    const pendientes = this.attractionReservations.filter((r) => !r.lodgingImage);
    if (pendientes.length === 0) return;

    // Agrupa pendientes por provider normalizado (1 request por provider).
    const porProvider = new Map<string, any[]>();
    for (const r of pendientes) {
      const prov = this.normalizeProvider(r.provider || r.nombreProveedor);
      if (!prov) continue;
      if (!porProvider.has(prov)) porProvider.set(prov, []);
      porProvider.get(prov)!.push(r);
    }
    if (porProvider.size === 0) return;

    porProvider.forEach((reservas, provider) => {
      console.info('[Profile] Hidratando imágenes de atracciones · provider=', provider, '· N=', reservas.length);
      this.atraccionesService.getAtracciones({ limit: 50 }, provider as any).subscribe({
        next: (resp: any) => {
          const lista: any[] = resp?.data ?? [];
          if (!lista.length) return;

          let actualizada = false;
          for (const reserva of reservas) {
            const nombreReserva = String(reserva.lodgingName ?? '').toLowerCase().trim();
            if (!nombreReserva) continue;

            const match = lista.find(
              (a) => String(a?.nombre ?? '').toLowerCase().trim() === nombreReserva,
            );
            const url = match?.imagen_principal
              || (Array.isArray(match?.imagenes) && match.imagenes.length ? match.imagenes[0] : '');
            if (url) {
              reserva.lodgingImage = url;
              this.guardarImagenAtraccionLocal(
                reserva.reservaGuid || reserva.codigoReserva,
                url,
              );
              actualizada = true;
            }
          }
          if (actualizada) this.cdr.detectChanges();
        },
        error: (err: any) => {
          // Proveedor caído (CORS, 0, 5xx) — no rompe nada, las cards se
          // quedan con gradient. Log informativo sin alertar al usuario.
          console.warn(
            '[Profile] Hidratación imágenes falló · provider=', provider,
            '· status=', err?.status,
          );
        },
      });
    });
  }

  /** True si la reserva ya está pagada (cualquier código equivalente). */
  estaPagada(reserva: any): boolean {
    const e = String(reserva?.estadoReserva ?? reserva?.estadoReservaProveedor ?? '').toUpperCase().trim();
    return e === 'PAG' || e === 'PAGADA' || e === 'CONFIRMADA' || e === 'CON';
  }

  /** Estados que se consideran activos en historial. */
  isActiveReservation(estado: string | undefined | null): boolean {
    const e = String(estado ?? '').toUpperCase().trim();
    if (!e) return true;
    const inactivos = ['CAN', 'CANC', 'CANCEL', 'CANCELADA', 'ANULADA', 'EXPIRADA'];
    return !inactivos.includes(e);
  }
}
