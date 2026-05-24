import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/navbar/footer.component';
import { AtraccionesService } from '../services/atracciones.service';
import { AtraccionDetalle, Ticket } from '../models/atracciones.models';

type EstadoCarga = 'loading' | 'success' | 'not_found' | 'error';

const IDIOMA_LABELS: Record<string, string> = {
  en: 'Inglés',
  es: 'Español',
  fr: 'Francés',
  it: 'Italiano',
  de: 'Alemán',
  ru: 'Ruso',
  pt: 'Portugués',
  ja: 'Japonés',
  ar: 'Árabe',
  pl: 'Polaco',
};

const ETIQUETA_LABELS: Record<string, string> = {
  free_cancellation: 'Cancelación gratuita',
  skip_the_line: 'Sin fila',
};

@Component({
  selector: 'app-atracciones-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './atracciones-detail.component.html',
  styleUrls: ['./atracciones-detail.component.css'],
})
export class AtraccionesDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(AtraccionesService);

  estado = signal<EstadoCarga>('loading');
  errorMsg = signal<string | null>(null);
  detalle = signal<AtraccionDetalle | null>(null);

  imagenActiva = signal<string | null>(null);

  readonly galeria = computed<string[]>(() => {
    const d = this.detalle();
    if (!d) return [];
    // imagen_principal va primero; agregamos imagenes evitando duplicados.
    const set = new Set<string>();
    if (d.imagen_principal) set.add(d.imagen_principal);
    for (const img of d.imagenes ?? []) set.add(img);
    return Array.from(set);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.estado.set('not_found');
      return;
    }
    this.cargar(id);
  }

  cargar(id: string): void {
    this.estado.set('loading');
    this.errorMsg.set(null);
    this.detalle.set(null);
    this.svc.getAtraccionDetalle(id).subscribe({
      next: (resp) => {
        this.detalle.set(resp.data);
        this.imagenActiva.set(resp.data.imagen_principal);
        this.estado.set('success');
      },
      error: (err) => {
        if (err?.status === 404) {
          this.estado.set('not_found');
        } else {
          this.estado.set('error');
          this.errorMsg.set('No pudimos cargar el detalle de la atracción.');
        }
      },
    });
  }

  reintentar(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);
  }

  volverAlListado(): void {
    this.router.navigate(['/atracciones']);
  }

  /**
   * Por ahora navega a una ruta placeholder. La pantalla de reserva
   * (POST /api/v2/reservas) se implementará en una fase posterior.
   * TODO(reserva): conectar con el flujo real cuando esté disponible.
   */
  reservar(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.router.navigate(['/atracciones', id, 'reservar']);
  }

  seleccionarImagen(src: string): void {
    this.imagenActiva.set(src);
  }

  scrollA(seccion: string): void {
    const el = document.getElementById(seccion);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Helpers ────────────────────────────────────────────
  formatearDuracion(min: number): string {
    const horas = Math.floor(min / 60);
    const m = min % 60;
    if (horas === 0) return `${m} min`;
    return m > 0 ? `${horas} h ${m} min` : `${horas} h`;
  }

  idiomaLabel(tag: string): string {
    return IDIOMA_LABELS[tag] ?? tag.toUpperCase();
  }

  etiquetaLabel(tag: string): string {
    return ETIQUETA_LABELS[tag] ?? tag;
  }

  trackTicket(_: number, t: Ticket): string {
    return t.tck_guid;
  }
}
