import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
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

    this.http.get(`https://abooking-f5cghfbphsf8dvbn.centralus-01.azurewebsites.net/api/v1/clientes/usuario/${guid}`, { headers })
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response && response.data) {
            const data = response.data;
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
          
          if (err.status === 403) {
            this.errorMessage = 'No tienes permiso para ver este perfil o la cuenta no es de un cliente.';
          } else {
            this.errorMessage = 'No se pudo cargar el perfil.';
          }
          
          if (err.status === 401) {
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('usuarioGuid');
            } catch {}
            this.router.navigate(['/login']);
          }
        }
      });
  }
}
