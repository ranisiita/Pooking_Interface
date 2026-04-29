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

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    let token = null;
    try {
      token = localStorage.getItem('token');
    } catch {}

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoadingUsuarios = true;
    this.errorUsuarios = '';

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

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
          if (err.status === 401) {
            this.router.navigate(['/login']);
          }
        }
      });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }
}
