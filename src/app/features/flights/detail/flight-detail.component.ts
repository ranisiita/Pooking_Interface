import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { FlightItem } from '../search/flight-results.component';

@Component({
  selector: 'app-flight-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './flight-detail.component.html',
  styleUrls: ['./flight-detail.component.css'],
})
export class FlightDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  detalle      = signal<FlightItem | null>(null);
  mockVuelo    = signal<FlightItem | null>(null);
  loading      = signal(true);
  error        = signal<string | null>(null);

  ngOnInit(): void {
    const guid = this.route.snapshot.paramMap.get('guid');
    if (!guid) { this.router.navigate(['/vuelos/resultados']); return; }
    const raw = sessionStorage.getItem('flight-results');
    const lista: FlightItem[] = raw ? JSON.parse(raw) : [];
    const seleccionado = lista.find((x) => x.guidServicio === guid) ?? null;
    if (!seleccionado) {
      this.error.set('No se encontró el vuelo seleccionado. Vuelve a buscar.');
      this.loading.set(false);
      return;
    }
    this.detalle.set(seleccionado);
    this.mockVuelo.set(seleccionado);
    this.loading.set(false);
  }

  seleccionarAsiento(): void {
    const guid = this.route.snapshot.paramMap.get('guid');
    this.router.navigate(['/vuelos', guid, 'asientos']);
  }

  irAlCheckout(): void {
    this.seleccionarAsiento();
  }

  volver(): void {
    this.router.navigate(['/vuelos/resultados']);
  }
}
