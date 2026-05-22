import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

interface Room {
  id: number;
  nombre: string;
  piso: string;
  cama: string;
  capacidad: string;
  metros: number;
  precio: number;
  disponibles: number;
  imagen: string;
}

interface Lodging {
  id: number;
  nombre: string;
  tipo: string;
  categoria: number;
  calidad: string;
  direccion: string;
  ciudad: string;
  descripcion: string;
  imagenes: string[];
  precio: number;
  valoracion: number;
  ratingTexto: string;
  reviewsCount: number;
  checkIn: string;
  checkOut: string;
  habitaciones: Room[];
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Lodging dataset
  lodgings: Lodging[] = [
    {
      id: 1,
      nombre: 'Hotel Las Velas Quito',
      tipo: 'Hotel',
      categoria: 4,
      calidad: 'Negocios',
      direccion: 'Av. Amazonas N34-123, Quito, Pichincha · Ecuador',
      ciudad: 'Quito',
      descripcion: 'Hotel céntrico para viajes de negocio y turismo.',
      imagenes: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=720&q=80'],
      precio: 25,
      valoracion: 4.6,
      ratingTexto: 'Muy bueno',
      reviewsCount: 25,
      checkIn: '14:00',
      checkOut: '12:00',
      habitaciones: [
        {
          id: 1, nombre: 'Habitación Estándar', piso: 'Piso 1–3', cama: 'Cama matrimonial',
          capacidad: '2 adultos · 1 niño', metros: 25, precio: 25, disponibles: 5,
          imagen: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'
        },
        {
          id: 2, nombre: 'Suite Junior', piso: 'Piso 4–7', cama: 'Cama King',
          capacidad: '3 adultos · 2 niños', metros: 45, precio: 85, disponibles: 1,
          imagen: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'
        }
      ]
    },
    {
      id: 2,
      nombre: 'Casa del Arco Boutique',
      tipo: 'Hostal',
      categoria: 4,
      calidad: 'Familia',
      direccion: 'García Moreno 362, Centro Histórico, Quito',
      ciudad: 'Quito',
      descripcion: 'Hostal boutique en el corazón del Centro Histórico.',
      imagenes: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=720&q=80'],
      precio: 52,
      valoracion: 4.8,
      ratingTexto: 'Excelente',
      reviewsCount: 41,
      checkIn: '15:00',
      checkOut: '11:00',
      habitaciones: [
        {
          id: 1, nombre: 'Habitación Colonial', piso: 'Piso 1', cama: 'Cama matrimonial',
          capacidad: '2 adultos', metros: 22, precio: 52, disponibles: 3,
          imagen: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'
        }
      ]
    }
  ];

  lodging: Lodging | null = null;

  // Active Tab: 'nuevo' | 'existente'
  activeTab: 'nuevo' | 'existente' = 'nuevo';

  // Form Fields
  tipoIdentificacion = '';
  numeroIdentificacion = '';
  nombres = '';
  apellidos = '';
  correo = '';
  telefono = '';
  direccion = '';
  observaciones = '';

  // Dates
  fechaInicio = '2026-05-20';
  fechaFin = '2026-05-22';
  fechaError = false;

  // Room selections status inside the lodging
  roomSelections: {
    selected: boolean;
    roomsCount: number;
    adultsCount: number;
    kidsCount: number;
  }[] = [];

  // Success Modal
  showSuccess = false;
  successCode = '';
  mockTotal = 0;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'] || 1;
      this.lodging = this.lodgings.find(l => l.id === id) || this.lodgings[0];
      
      // Initialize room selections based on lodging rooms
      if (this.lodging) {
        this.roomSelections = this.lodging.habitaciones.map((room, index) => ({
          selected: index === 0, // default select first room
          roomsCount: 1,
          adultsCount: 2,
          kidsCount: index === 0 ? 1 : 0
        }));
      }
    });
  }

  // Set active tab
  setTab(tab: 'nuevo' | 'existente'): void {
    this.activeTab = tab;
  }

  // Toggle room card selection
  toggleRoom(index: number): void {
    const selectedCount = this.roomSelections.filter(r => r.selected).length;
    if (this.roomSelections[index].selected && selectedCount === 1) {
      // Cannot deselect the only selected room
      return;
    }
    this.roomSelections[index].selected = !this.roomSelections[index].selected;
  }

  // Increment/Decrement helper
  count(index: number, field: 'roomsCount' | 'adultsCount' | 'kidsCount', min: number, delta: number): void {
    const currentValue = this.roomSelections[index][field];
    const newValue = Math.max(min, currentValue + delta);
    this.roomSelections[index][field] = newValue;
  }

  // Get nights between dates
  get nights(): number {
    if (!this.fechaInicio || !this.fechaFin) return 0;
    const diff = (new Date(this.fechaFin).getTime() - new Date(this.fechaInicio).getTime()) / 86400000;
    const nights = diff > 0 ? diff : 0;
    
    // Set date error if check-out is before or equal to check-in
    this.fechaError = (new Date(this.fechaFin) <= new Date(this.fechaInicio));
    return nights;
  }

  // Date formatting helpers
  fmtDate(val: string): string {
    if (!val) return '—';
    return new Date(val + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  fmtDateLong(val: string): string {
    if (!val) return '—';
    return new Date(val + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Date banner formatting
  get nightsLabel(): string {
    const nightsVal = this.nights;
    if (nightsVal > 0) {
      const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
      return `${nightsVal} noche${nightsVal !== 1 ? 's' : ''} · ${fmt(this.fechaInicio)} → ${fmt(this.fechaFin)}`;
    }
    return '—';
  }

  // Get selected rooms list for rendering
  get selectedLines(): { name: string; rooms: number; price: number; lineTotal: number }[] {
    const lines: { name: string; rooms: number; price: number; lineTotal: number }[] = [];
    if (!this.lodging) return lines;

    this.lodging.habitaciones.forEach((room, index) => {
      const sel = this.roomSelections[index];
      if (sel && sel.selected) {
        const lineTotal = room.precio * this.nights * sel.roomsCount;
        lines.push({
          name: room.nombre,
          rooms: sel.roomsCount,
          price: room.precio,
          lineTotal: Math.max(0, lineTotal)
        });
      }
    });

    return lines;
  }

  // Calculations
  get subtotal(): number {
    return this.selectedLines.reduce((acc, line) => acc + line.lineTotal, 0);
  }

  get iva(): number {
    return this.subtotal * 0.15;
  }

  get total(): number {
    return this.subtotal + this.iva;
  }

  get guestText(): string {
    let adults = 0;
    let kids = 0;
    let rooms = 0;

    this.roomSelections.forEach(sel => {
      if (sel.selected) {
        adults += sel.adultsCount;
        kids += sel.kidsCount;
        rooms += sel.roomsCount;
      }
    });

    if (rooms === 0) return '—';
    return `${adults} adulto${adults !== 1 ? 's' : ''} · ${kids} niño${kids !== 1 ? 's' : ''} · ${rooms} hab.`;
  }

  // Form errors styling classes helpers
  touchedFields = new Set<string>();

  onTouch(field: string): void {
    this.touchedFields.add(field);
  }

  getFieldErrorMsg(field: string): string {
    if (this.activeTab !== 'nuevo') return '';
    if (!this.touchedFields.has(field)) return '';

    if (field === 'tipoIdentificacion') {
      if (!this.tipoIdentificacion) return 'Selecciona el tipo de identificación';
    }

    if (field === 'numeroIdentificacion') {
      if (!this.numeroIdentificacion) return 'El número de identificación es requerido';
      if (this.tipoIdentificacion === 'CED') {
        if (!/^\d{10}$/.test(this.numeroIdentificacion)) {
          return 'La cédula debe tener exactamente 10 dígitos';
        }
      } else if (this.tipoIdentificacion === 'RUC') {
        if (!/^\d{13}$/.test(this.numeroIdentificacion)) {
          return 'El RUC debe tener exactamente 13 dígitos';
        }
      } else if (this.tipoIdentificacion === 'PAS') {
        if (this.numeroIdentificacion.length !== 20) {
          return 'El pasaporte debe tener exactamente 20 caracteres';
        }
      }
    }

    if (field === 'nombres') {
      if (!this.nombres.trim()) return 'Los nombres son requeridos';
    }

    if (field === 'correo') {
      if (!this.correo) return 'El correo electrónico es requerido';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.correo)) {
        return 'El correo debe tener un dominio válido (ejemplo@dominio.com)';
      }
    }

    if (field === 'telefono') {
      if (!this.telefono) return 'El teléfono es requerido';
      if (!/^\d{10}$/.test(this.telefono)) {
        return 'El teléfono debe tener exactamente 10 dígitos';
      }
    }

    return '';
  }

  isFieldError(field: string): boolean {
    return !!this.getFieldErrorMsg(field);
  }

  // Submit Reserva
  submitReserva(): void {
    if (this.activeTab === 'nuevo') {
      const fields = ['tipoIdentificacion', 'numeroIdentificacion', 'nombres', 'correo', 'telefono'];
      fields.forEach(field => this.touchedFields.add(field));

      let hasErrors = false;
      for (const field of fields) {
        if (this.isFieldError(field)) {
          hasErrors = true;
        }
      }

      if (hasErrors) {
        const el = document.getElementById('tab-nuevo');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    if (this.nights <= 0) {
      this.fechaError = true;
      const el = document.getElementById('fechaFin');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Mock confirmation code
    const rand = Math.floor(Math.random() * 9000 + 1000);
    this.successCode = `RES-20260520-${rand}`;
    this.mockTotal = this.total;
    this.showSuccess = true;
  }

  closeSuccess(): void {
    this.showSuccess = false;
    this.router.navigate(['/']);
  }
}
