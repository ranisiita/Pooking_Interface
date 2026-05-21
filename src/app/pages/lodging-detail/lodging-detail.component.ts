import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';

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

interface Review {
  iniciales: string;
  nombre: string;
  tipo: string;
  fecha: string;
  score: number;
  positivo: string;
  negativo?: string;
  respuesta?: string;
  avatarColor?: string;
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
  descripcionLarga: string;
  imagenes: string[];
  precio: number;
  valoracion: number;
  ratingTexto: string;
  reviewsCount: number;
  habitacionesDisponibles: number;
  checkIn: string;
  checkOut: string;
  servicios: string[];
  aceptaNinos: boolean;
  aceptaMascotas: boolean;
  zona: string;
  distanciaCentro: string;
  transporte: string;
  alrededores: string;
  telefono: string;
  email: string;
  habitaciones: Room[];
  reviews: Review[];
  barras: { label: string; score: number }[];
}

@Component({
  selector: 'app-lodging-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './lodging-detail.component.html',
  styleUrls: ['./lodging-detail.component.css']
})
export class LodgingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Carousel state
  activeSlide = signal(0);
  isTransitioning = signal(false);
  autoplayInterval: any = null;

  // Subnav active section
  activeSection = signal('info');

  // "Leer más" toggle
  showFullDesc = signal(false);

  // Room selection
  selectedRoomId = signal<number | null>(null);

  // Static lodging dataset (keyed by ID)
  lodgings: Lodging[] = [
    {
      id: 1,
      nombre: 'Hotel Las Velas Quito',
      tipo: 'Hotel',
      categoria: 4,
      calidad: 'Negocios',
      direccion: 'Av. Amazonas N34-123, Quito, Pichincha · Ecuador',
      ciudad: 'Quito',
      descripcion: 'Hotel céntrico para viajes de negocio y turismo, ubicado en plena Av. Amazonas. A pasos del parque La Carolina y a corta distancia del Centro Histórico declarado Patrimonio de la Humanidad por la UNESCO.',
      descripcionLarga: 'Todas nuestras habitaciones cuentan con aire acondicionado, televisión por cable, caja fuerte y baño privado. El desayuno buffet está disponible en nuestro restaurante en el piso principal, con opciones nacionales e internacionales. Contamos con sala de conferencias totalmente equipada y servicio de lavandería.',
      imagenes: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=80',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=900&q=80',
      ],
      precio: 25,
      valoracion: 4.6,
      ratingTexto: 'Muy bueno',
      reviewsCount: 25,
      habitacionesDisponibles: 7,
      checkIn: '14:00',
      checkOut: '12:00',
      servicios: ['Wifi', 'Desayuno', 'Piscina', 'Restaurante', 'Estacionamiento', 'Sala de conferencias', 'Servicio al cliente 24h'],
      aceptaNinos: true,
      aceptaMascotas: false,
      zona: 'La Mariscal · Norte de Quito',
      distanciaCentro: 'A 2 km del Centro Histórico',
      transporte: 'A 3 min del Trolebús · A 25 min del aeropuerto',
      alrededores: 'Parque La Carolina (5 min) · Centros comerciales (10 min)',
      telefono: '+593 2 255-6789',
      email: 'reservas@lasvelas.ec',
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
        },
        {
          id: 3, nombre: 'Habitación Múltiple', piso: 'Piso 7', cama: 'Camas individuales',
          capacidad: '3 adultos · 3 niños', metros: 12, precio: 55, disponibles: 1,
          imagen: ''
        }
      ],
      reviews: [
        {
          iniciales: 'CM', nombre: 'Carlos M.', tipo: 'Viaje de negocios', fecha: 'mayo 2026',
          score: 9.0,
          positivo: 'Excelente ubicación, a 5 minutos del parque La Carolina. El desayuno es abundante y variado. Habitaciones cómodas y limpias.',
          negativo: 'El ruido de la calle puede sentirse en los pisos bajos.',
          respuesta: 'Gracias Carlos por tu reseña. Tomaremos nota del tema del ruido para mejorar el aislamiento en los pisos bajos. ¡Esperamos verte pronto!'
        },
        {
          iniciales: 'LR', nombre: 'Lucía R.', tipo: 'Viaje en pareja', fecha: 'abril 2026',
          score: 8.5, avatarColor: '#C6B17D',
          positivo: 'Personal muy amable y servicial. La cama super cómoda y el baño impecable. El precio es justo para lo que ofrece.'
        }
      ],
      barras: [
        { label: 'Limpieza', score: 9.0 },
        { label: 'Confort', score: 8.5 },
        { label: 'Ubicación', score: 9.6 },
        { label: 'Servicio', score: 8.8 },
        { label: 'Precio', score: 8.2 }
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
      descripcion: 'Hostal boutique en el corazón del Centro Histórico declarado Patrimonio de la Humanidad.',
      descripcionLarga: 'Ambiente colonial único con desayuno incluido y atención personalizada. Cada habitación ha sido cuidadosamente restaurada manteniendo detalles originales de la arquitectura colonial quiteña.',
      imagenes: [
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&q=80',
      ],
      precio: 52,
      valoracion: 4.8,
      ratingTexto: 'Excelente',
      reviewsCount: 41,
      habitacionesDisponibles: 5,
      checkIn: '15:00', checkOut: '11:00',
      servicios: ['Wifi', 'Desayuno'],
      aceptaNinos: true, aceptaMascotas: true,
      zona: 'Centro Histórico',
      distanciaCentro: 'En el Centro Histórico',
      transporte: 'A 2 min del Trolebús',
      alrededores: 'Iglesia de La Compañía (200m) · Plaza Grande (400m)',
      telefono: '+593 2 228-3456',
      email: 'info@casadelarco.ec',
      habitaciones: [
        {
          id: 1, nombre: 'Habitación Colonial', piso: 'Piso 1', cama: 'Cama matrimonial',
          capacidad: '2 adultos', metros: 22, precio: 52, disponibles: 3,
          imagen: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'
        }
      ],
      reviews: [
        {
          iniciales: 'AP', nombre: 'Ana P.', tipo: 'Viaje familiar', fecha: 'abril 2026',
          score: 9.5,
          positivo: 'Lugar increíble, lleno de historia. El desayuno criollo es delicioso.',
        }
      ],
      barras: [
        { label: 'Limpieza', score: 9.5 },
        { label: 'Confort', score: 9.0 },
        { label: 'Ubicación', score: 10.0 },
        { label: 'Servicio', score: 9.2 },
        { label: 'Precio', score: 9.0 }
      ]
    }
  ];

  lodging: Lodging | null = null;

  // Booking state
  fechaLlegada = '20 may 2026';
  fechaSalida = '22 may 2026';
  noches = 2;
  adultos = 2;
  ninos = 1;
  habitacionesSel = 1;

  get precioBase(): number {
    const room = this.lodging?.habitaciones.find(r => r.id === this.selectedRoomId()) || this.lodging?.habitaciones[0];
    return (room?.precio || this.lodging?.precio || 0) * this.noches;
  }

  get iva(): number {
    return this.precioBase * 0.15;
  }

  get total(): number {
    return this.precioBase + this.iva;
  }

  get precioNoche(): number {
    const room = this.lodging?.habitaciones.find(r => r.id === this.selectedRoomId()) || this.lodging?.habitaciones[0];
    return room?.precio || this.lodging?.precio || 0;
  }

  get currentImage(): string {
    return this.lodging?.imagenes[this.activeSlide()] || '';
  }

  get totalSlides(): number {
    return this.lodging?.imagenes.length || 0;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.lodging = this.lodgings.find(l => l.id === id) || this.lodgings[0];
      this.startAutoplay();
    });
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, 4500);
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  goToSlide(index: number): void {
    if (this.isTransitioning() || index === this.activeSlide()) return;
    this.activeSlide.set(index);
    this.stopAutoplay();
    this.startAutoplay();
  }

  nextSlide(): void {
    if (!this.lodging) return;
    this.activeSlide.set((this.activeSlide() + 1) % this.totalSlides);
  }

  prevSlide(): void {
    if (!this.lodging) return;
    this.activeSlide.set((this.activeSlide() - 1 + this.totalSlides) % this.totalSlides);
  }

  onPrevClick(): void {
    this.prevSlide();
    this.stopAutoplay();
    this.startAutoplay();
  }

  onNextClick(): void {
    this.nextSlide();
    this.stopAutoplay();
    this.startAutoplay();
  }

  scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  selectRoom(roomId: number): void {
    this.selectedRoomId.set(roomId === this.selectedRoomId() ? null : roomId);
  }

  isRoomSelected(roomId: number): boolean {
    return this.selectedRoomId() === roomId;
  }

  toggleDesc(): void {
    this.showFullDesc.set(!this.showFullDesc());
  }

  getEstrellasArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getEstrellasVaciasArray(count: number): number[] {
    return Array(5 - count).fill(0);
  }

  getBarWidth(score: number): number {
    return (score / 10) * 100;
  }

  newCommentName = '';
  newCommentScore = '10';
  newCommentText = '';

  submitComment(): void {
    if (!this.lodging || !this.newCommentName.trim() || !this.newCommentText.trim()) return;
    
    const initials = this.newCommentName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const newReview: Review = {
      iniciales: initials || 'HU',
      nombre: this.newCommentName,
      tipo: 'Huésped Pooking',
      fecha: 'Hoy',
      score: parseFloat(this.newCommentScore),
      positivo: this.newCommentText,
      avatarColor: '#8E5A54'
    };

    // Add to lodging reviews
    this.lodging.reviews = [newReview, ...this.lodging.reviews];
    
    // Update reviewsCount
    this.lodging.reviewsCount += 1;
    
    // Recalculate average rating
    const totalScore = this.lodging.reviews.reduce((acc, rv) => acc + rv.score, 0);
    this.lodging.valoracion = Number((totalScore / this.lodging.reviews.length).toFixed(1));
    
    // Reset form
    this.newCommentName = '';
    this.newCommentScore = '10';
    this.newCommentText = '';
  }

  goBack(): void {
    this.router.navigate(['/alojamiento/resultados']);
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }
}
