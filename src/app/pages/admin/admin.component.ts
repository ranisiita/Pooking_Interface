import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  activeTab = 'dashboard';

  stats = [
    { title: 'Usuarios Activos', value: '1,245', icon: 'group', color: '#8E5A54' },
    { title: 'Servicios Reservados', value: '856', icon: 'event_available', color: '#606256' },
    { title: 'Clientes Registrados', value: '3,492', icon: 'person_add', color: '#C6B17D' },
    { title: 'Ingresos Mensuales', value: '$45,230', icon: 'payments', color: '#46403C' }
  ];

  usuarios: any[] = [];
  isLoadingUsuarios = false;
  errorUsuarios = '';

  clientes: any[] = [];
  isLoadingClientes = false;
  errorClientes = '';

  servicios: any[] = [];
  isLoadingServicios = false;
  errorServicios = '';

  facturacion: any[] = [];
  isLoadingFacturacion = false;
  errorFacturacion = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.cargarDatosDashboard();
  }

  cargarDatosDashboard() {
    // Si necesitas cargar totales, aquí iría. Por defecto el dashboard usa mock.
  }

  getTokenHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return null;
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  cargarUsuarios() {
    const headers = this.getTokenHeaders();
    if (!headers) return;

    this.isLoadingUsuarios = true;
    this.errorUsuarios = '';

    const body = {
      pageNumber: 1,
      pageSize: 50
    };

    this.http.post('https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/usuarios/buscar', body, { headers })
      .subscribe({
        next: (response: any) => {
          this.isLoadingUsuarios = false;
          if (response && response.success && response.data && response.data.items) {
            this.usuarios = response.data.items;
          }
        },
        error: (err) => {
          this.isLoadingUsuarios = false;
          this.errorUsuarios = 'No se pudieron cargar los usuarios.';
          console.error('Error fetching users:', err);
          if (err.status === 401) this.router.navigate(['/login']);
        }
      });
  }

  cargarClientes() {
    const headers = this.getTokenHeaders();
    if (!headers) return;

    this.isLoadingClientes = true;
    this.errorClientes = '';
    const body = { pageNumber: 1, pageSize: 50 };

    this.http.post('https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/clientes/buscar', body, { headers })
      .subscribe({
        next: (response: any) => {
          this.isLoadingClientes = false;
          if (response?.data?.items) this.clientes = response.data.items;
        },
        error: (err) => {
          this.isLoadingClientes = false;
          this.errorClientes = 'No se pudieron cargar los clientes.';
          if (err.status === 401) this.router.navigate(['/login']);
        }
      });
  }

  cargarServicios() {
    const headers = this.getTokenHeaders();
    if (!headers) return;

    this.isLoadingServicios = true;
    this.errorServicios = '';
    const body = { pageNumber: 1, pageSize: 50 };

    this.http.post('https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/servicios/buscar', body, { headers })
      .subscribe({
        next: (response: any) => {
          this.isLoadingServicios = false;
          if (response?.data?.items) this.servicios = response.data.items;
        },
        error: (err) => {
          this.isLoadingServicios = false;
          this.errorServicios = 'No se pudieron cargar los servicios.';
          if (err.status === 401) this.router.navigate(['/login']);
        }
      });
  }

  cargarFacturacion() {
    const headers = this.getTokenHeaders();
    if (!headers) return;

    this.isLoadingFacturacion = true;
    this.errorFacturacion = '';
    const body = { pageNumber: 1, pageSize: 50 };

    this.http.post('https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/facturacion/buscar', body, { headers })
      .subscribe({
        next: (response: any) => {
          this.isLoadingFacturacion = false;
          if (response?.data?.items) this.facturacion = response.data.items;
        },
        error: (err) => {
          this.isLoadingFacturacion = false;
          this.errorFacturacion = 'No se pudo cargar la facturación.';
          if (err.status === 401) this.router.navigate(['/login']);
        }
      });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'usuarios' && this.usuarios.length === 0) {
      this.cargarUsuarios();
    } else if (tab === 'clientes' && this.clientes.length === 0) {
      this.cargarClientes();
    } else if (tab === 'servicios' && this.servicios.length === 0) {
      this.cargarServicios();
    } else if (tab === 'facturacion' && this.facturacion.length === 0) {
      this.cargarFacturacion();
    }
  }
}
