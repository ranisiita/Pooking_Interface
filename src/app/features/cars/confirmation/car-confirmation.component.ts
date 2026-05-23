import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';

interface ReservaAuto {
  idReserva: number;
  codigoReserva: string;
  estado: string;
  total: number;
  conductor: { nombres: string; apellidos: string; correo: string; telefono: string };
  vehiculo: { marca: string; modelo: string; anio: number; imagenUrl: string };
}

@Component({
  selector: 'app-car-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './car-confirmation.component.html',
  styleUrls: ['./car-confirmation.component.css'],
})
export class CarConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  reserva = signal<ReservaAuto | null>(null);
  idReserva = 0;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.idReserva = idParam ? +idParam : 0;

    const raw = sessionStorage.getItem('car-reserva');
    if (raw) {
      try { this.reserva.set(JSON.parse(raw)); } catch {}
    }
    // Limpiar sesión del flujo de reserva
    sessionStorage.removeItem('car-reserva');
  }

  irAlInicio(): void { this.router.navigate(['/']); }
  buscarOtro(): void { this.router.navigate(['/autos/resultados']); }
  irAlPerfil(): void { this.router.navigate(['/profile']); }
}
