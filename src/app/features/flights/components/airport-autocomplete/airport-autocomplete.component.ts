import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FlightService } from '../../services/flight.service';
import { AeropuertoSugerencia } from '../../shared/flight.models';

@Component({
  selector: 'app-airport-autocomplete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './airport-autocomplete.component.html',
  styleUrls: ['./airport-autocomplete.component.css'],
})
export class AirportAutocompleteComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Ciudad o aeropuerto';
  @Input() label = '';
  @Input() icono = 'flight_takeoff';
  @Input() set valorInicial(val: string) {
    if (val && val !== this.inputTexto) {
      this.inputTexto = val;
    }
  }
  @Output() aeropuertoSeleccionado = new EventEmitter<AeropuertoSugerencia | null>();

  private flightService = inject(FlightService);
  private el = inject(ElementRef);

  aeropuertosBase: AeropuertoSugerencia[] = [];
  sugerenciasFiltradas: AeropuertoSugerencia[] = [];
  cargandoInicial = true;
  cargando = false;
  mostrarDropdown = false;
  inputTexto = '';
  indiceFocused: number | null = null;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.flightService.cargarTodosAeropuertos().subscribe({
      next: data => {
        this.aeropuertosBase = data;
        this.sugerenciasFiltradas = data;
        this.cargandoInicial = false;
      },
      error: () => {
        this.cargandoInicial = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onFocus(): void {
    this.mostrarDropdown = true;
    this.indiceFocused = null;
    if (this.aeropuertosBase.length > 0 && !this.inputTexto) {
      this.sugerenciasFiltradas = this.aeropuertosBase;
    }
  }

  onInput(texto: string): void {
    this.inputTexto = texto;
    this.mostrarDropdown = true;
    this.indiceFocused = null;
    this.aeropuertoSeleccionado.emit(null);

    if (this.aeropuertosBase.length > 0) {
      if (!texto || texto.trim().length === 0) {
        this.sugerenciasFiltradas = this.aeropuertosBase;
        return;
      }
      const q = this.normalizar(texto);
      this.sugerenciasFiltradas = this.aeropuertosBase.filter(
        a =>
          this.normalizar(a.nombre).includes(q) ||
          this.normalizar(a.codigoIata).includes(q),
      );
    } else {
      if (texto.trim().length >= 2) {
        this.cargando = true;
        this.flightService.buscarAeropuertos(texto).subscribe(data => {
          this.sugerenciasFiltradas = data;
          this.cargando = false;
        });
      }
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.mostrarDropdown || this.sugerenciasFiltradas.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.indiceFocused = Math.min(
        (this.indiceFocused ?? -1) + 1,
        this.sugerenciasFiltradas.length - 1,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indiceFocused = Math.max((this.indiceFocused ?? 0) - 1, 0);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (this.indiceFocused !== null && this.indiceFocused >= 0) {
        event.preventDefault();
        this.seleccionarAeropuerto(this.sugerenciasFiltradas[this.indiceFocused]);
      }
    } else if (event.key === 'Escape') {
      this.mostrarDropdown = false;
      this.indiceFocused = null;
    }
  }

  seleccionarAeropuerto(aeropuerto: AeropuertoSugerencia): void {
    this.inputTexto = aeropuerto.display;
    this.mostrarDropdown = false;
    this.sugerenciasFiltradas = [];
    this.indiceFocused = null;
    this.aeropuertoSeleccionado.emit(aeropuerto);
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.mostrarDropdown = false;
    }
  }
}
