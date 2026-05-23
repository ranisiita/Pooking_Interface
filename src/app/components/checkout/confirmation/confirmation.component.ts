import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { FlightItem } from '../../flights/search/flight-results.component';

interface Asiento {
  numero_asiento: string;
  clase: string;
  posicion: string;
  precio_extra: number;
}

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.css', '../shared/checkout-ui-shared.css'],
})
export class ConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @Input() isStandalone = true;
  @Input() overrideGuid = '';
  @Input() overrideTitle = '¡Reserva confirmada!';
  @Input() overrideSubtitle = 'Tu pago fue procesado exitosamente. Recibirás los detalles por correo electrónico.';

  guid = signal('');
  vuelo = signal<FlightItem | null>(null);
  asiento = signal<Asiento | null>(null);

  ngOnInit(): void {
    if (this.isStandalone) {
      const g = this.route.snapshot.paramMap.get('guid') ?? '';
      this.guid.set(g);

      const rawResultados = sessionStorage.getItem('flight-results');
      const lista: FlightItem[] = rawResultados ? JSON.parse(rawResultados) : [];
      const vuelo = lista.find((x) => x.guidServicio === g) ?? null;
      this.vuelo.set(vuelo);

      const rawAsiento = sessionStorage.getItem('flight-seat');
      const asiento: Asiento | null = rawAsiento ? JSON.parse(rawAsiento) : null;
      this.asiento.set(asiento);

      // Limpiar datos de sesión del flujo de compra
      sessionStorage.removeItem('flight-seat');
    } else {
      this.guid.set(this.overrideGuid);
    }
  }

  irAlInicio(): void {
    this.router.navigate(['/']);
  }

  irAlPerfil(): void {
    this.router.navigate(['/profile']);
  }
}
