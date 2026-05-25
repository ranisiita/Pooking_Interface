import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
<<<<<<< Updated upstream
=======
import { LodgingService } from '../../services/lodging.service';
import { AtraccionesService } from '../../features/atracciones/services/atracciones.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
>>>>>>> Stashed changes

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
<<<<<<< Updated upstream
=======
  private http = inject(HttpClient);
  private router = inject(Router);
  private lodgingService = inject(LodgingService);
  private atraccionesService = inject(AtraccionesService);
  private cdr = inject(ChangeDetectorRef);

>>>>>>> Stashed changes
  user: any = null;
  isLoading = true;
  errorMessage = '';

  upcomingTrips = [
    {
      destination: 'Kioto, Japón',
      date: '05 - 14 Dic 2026',
      hotel: 'Ritz-Carlton Kyoto',
      status: 'Pendiente',
      imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
    }
  ];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    let token = null;
    let guid = null;
    try {
      token = localStorage.getItem('token');
      guid = localStorage.getItem('usuarioGuid');
    } catch {}

    if (!token || !guid) {
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

<<<<<<< Updated upstream
    this.http.get(`${environment.apiGatewayUrl}/api/v1/clientes/usuario/${guid}`, { headers })
=======
    this.http.get(`${environment.apiGatewayUrl}/api/v2/booking/clientes/usuario-guid/${guid}`, { headers })
>>>>>>> Stashed changes
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
              memberSince: data.fechaRegistroUtc ? new Date(data.fechaRegistroUtc).toLocaleDateString() : 'N/A',
              level: 'Viajero Frecuente',
              avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
              stats: { trips: 0, reviews: 0, points: 0 },
              ...data
            };
          }
        },
        error: (err) => {
          console.error('Error fetching profile', err);
          this.isLoading = false;
          
<<<<<<< Updated upstream
          if (err.status === 403) {
            this.errorMessage = 'No tienes permiso para ver este perfil o la cuenta no es de un cliente.';
          } else {
            this.errorMessage = 'No se pudo cargar el perfil.';
          }
          
          if (err.status === 401) {
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('usuarioGuid');
              localStorage.removeItem('guidCliente');
            } catch {}
            this.router.navigate(['/login']);
          }
=======
          // En caso de error, cargamos un usuario guest por si acaso
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
        }
      });
  }

  cargarReservasDesdeMiddleware(): void {
    this.isLoadingReservations = true;
    this.cdr.detectChanges();

    const guid = localStorage.getItem('usuarioGuid');

    if (!guid) {
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
>>>>>>> Stashed changes
        }
      });
  }
}
