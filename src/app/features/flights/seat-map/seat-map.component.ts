import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';

type ClaseCabina = 'ECONOMICA' | 'EJECUTIVA' | 'PRIMERA';
interface Asiento {
  id_asiento: number;
  numero_asiento: string;
  clase: ClaseCabina;
  disponible: boolean;
  posicion: string;
  precio_extra: number;
}

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './seat-map.component.html',
  styleUrls: ['./seat-map.component.css'],
})
export class SeatMapComponent implements OnInit {
  private _route = inject(ActivatedRoute);
  private router = inject(Router);

  asientos = signal<Asiento[]>([]);
  loading = signal(true);
  asientoSeleccionado = signal<Asiento | null>(null);
  claseActiva = signal<ClaseCabina>('ECONOMICA');
  clases: ClaseCabina[] = ['ECONOMICA', 'EJECUTIVA', 'PRIMERA'];
  idVuelo = 0;

  readonly asientosFiltrados = computed(() =>
    this.asientos().filter((a) => a.clase === this.claseActiva()),
  );

  readonly filas = computed(() => {
    const map = new Map<string, Asiento[]>();
    this.asientosFiltrados().forEach((a) => {
      const fila = a.numero_asiento.replace(/[A-Z]/gi, '');
      if (!map.has(fila)) map.set(fila, []);
      map.get(fila)!.push(a);
    });
    return Array.from(map.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  });

  ngOnInit(): void {
    this.asientos.set(this.generarAsientos());
    this.loading.set(false);
  }

  seleccionar(asiento: Asiento): void {
    if (!asiento.disponible) return;
    this.asientoSeleccionado.set(asiento);
  }

  confirmar(): void {
    const a = this.asientoSeleccionado();
    if (!a) { window.alert('Selecciona un asiento primero.'); return; }
    sessionStorage.setItem('flight-seat', JSON.stringify(a));
    window.alert(`Asiento ${a.numero_asiento} confirmado.`);
  }

  volver(): void { this.router.navigate(['/vuelos/resultados']); }

  private generarAsientos(): Asiento[] {
    const asientos: Asiento[] = [];
    let id = 1;
    const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
    const pushClase = (inicio: number, fin: number, clase: ClaseCabina, extra: number) => {
      for (let fila = inicio; fila <= fin; fila++) {
        for (const l of letras) {
          const seed = fila + l.charCodeAt(0);
          asientos.push({
            id_asiento: id++,
            numero_asiento: `${fila}${l}`,
            clase,
            disponible: seed % 5 !== 0,
            posicion: l === 'A' || l === 'F' ? 'Ventana' : (l === 'C' || l === 'D' ? 'Pasillo' : 'Medio'),
            precio_extra: extra,
          });
        }
      }
    };
    pushClase(1, 3, 'PRIMERA', 65);
    pushClase(4, 8, 'EJECUTIVA', 35);
    pushClase(9, 24, 'ECONOMICA', 0);
    return asientos;
  }
}
