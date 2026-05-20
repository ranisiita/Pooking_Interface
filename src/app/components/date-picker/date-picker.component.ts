import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.css'],
})
export class DatePickerComponent implements OnInit, OnChanges {
  /** Valor actual en formato YYYY-MM-DD */
  @Input() value = '';
  /** Fecha mínima permitida en formato YYYY-MM-DD */
  @Input() min = '';
  /** Texto cuando no hay fecha seleccionada */
  @Input() placeholder = 'Seleccionar fecha';
  /** 'light' para search, 'dark' para glassmorphism de resultados */
  @Input() theme: 'light' | 'dark' = 'light';
  /** Activa el borde de error */
  @Input() hasError = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() dateSelected = new EventEmitter<string>();

  isOpen = false;
  viewYear = 0;
  viewMonth = 0;

  readonly dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  readonly monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.initView();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['value'] || changes['min']) && !this.isOpen) {
      this.initView();
    }
  }

  private initView(): void {
    if (this.value) {
      const parts = this.value.split('-');
      this.viewYear = parseInt(parts[0], 10);
      this.viewMonth = parseInt(parts[1], 10) - 1;
    } else if (this.min) {
      const d = new Date(this.min + 'T00:00:00');
      this.viewYear = d.getFullYear();
      this.viewMonth = d.getMonth();
    } else {
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth();
    }
  }

  /** Valor formateado para mostrar */
  get displayValue(): string {
    if (!this.value) return '';
    const d = new Date(this.value + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Celdas del mes actual: null = celda vacía */
  get calendarDays(): (number | null)[] {
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  isDisabled(day: number): boolean {
    if (!this.min) return false;
    return this.toDateStr(this.viewYear, this.viewMonth, day) < this.min;
  }

  isSelected(day: number): boolean {
    return !!this.value && this.value === this.toDateStr(this.viewYear, this.viewMonth, day);
  }

  isToday(day: number): boolean {
    const n = new Date();
    return this.toDateStr(this.viewYear, this.viewMonth, day) ===
      this.toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
  }

  canGoPrev(): boolean {
    if (!this.min) return true;
    const d = new Date(this.min + 'T00:00:00');
    return this.viewYear > d.getFullYear() ||
      (this.viewYear === d.getFullYear() && this.viewMonth > d.getMonth());
  }

  toggleCalendar(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  prevMonth(): void {
    if (!this.canGoPrev()) return;
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
  }

  selectDay(day: number | null, event: Event): void {
    event.stopPropagation();
    if (!day || this.isDisabled(day)) return;
    const val = this.toDateStr(this.viewYear, this.viewMonth, day);
    this.valueChange.emit(val);
    this.dateSelected.emit(val);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
    }
  }

  private toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}
