import { Component, OnInit, inject, signal, computed, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { DatePickerComponent } from '../../components/date-picker/date-picker.component';
import { Lodging, Room, Review, LodgingService } from '../../services/lodging.service';

@Component({
  selector: 'app-lodging-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent, DatePickerComponent],
  templateUrl: './lodging-detail.component.html',
  styleUrls: ['./lodging-detail.component.css']
})
export class LodgingDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lodgingService = inject(LodgingService);
  private cdr = inject(ChangeDetectorRef);

  // Class variables
  id = '';
  provider = 'juan';
  fechaHoy = '';

  // Carousel state
  activeSlide = signal(0);
  isTransitioning = signal(false);
  autoplayInterval: any = null;

  // Subnav active section
  activeSection = signal('info');

  // "Leer más" toggle
  showFullDesc = signal(false);

  // Room selections list
  selectedRooms = signal<any[]>([]);

  // Static lodging dataset (keyed by ID)
  lodgings: Lodging[] = [];

  lodging: Lodging | null = null;

  // Booking state
  fechaLlegada = '2026-05-20';
  fechaSalida = '2026-05-22';
  noches = 2;
  adultos = 2;
  ninos = 1;
  habitacionesSel = 1;
  initialAdultos = 2;
  initialNinos = 0;

  get precioBase(): number {
    if (this.selectedRooms().length === 0) {
      return (this.lodging?.precio || 0) * this.noches;
    }
    return this.selectedRooms().reduce((sum, sel) => sum + (sel.precio * sel.habitaciones), 0) * this.noches;
  }

  get iva(): number {
    return this.precioBase * 0.15;
  }

  get total(): number {
    return this.precioBase + this.iva;
  }

  get precioNoche(): number {
    if (this.selectedRooms().length === 0) {
      return this.lodging?.precio || 0;
    }
    return this.selectedRooms().reduce((sum, sel) => sum + (sel.precio * sel.habitaciones), 0);
  }

  get totalAdultosSeleccionados(): number {
    return this.selectedRooms().reduce((sum, sel) => sum + sel.adultos, 0);
  }

  get totalNinosSeleccionados(): number {
    return this.selectedRooms().reduce((sum, sel) => sum + sel.ninos, 0);
  }

  get totalHabitacionesSeleccionadas(): number {
    return this.selectedRooms().reduce((sum, sel) => sum + sel.habitaciones, 0);
  }

  get puedeReservar(): boolean {
    return this.totalAdultosSeleccionados >= this.adultos && this.totalNinosSeleccionados >= this.ninos;
  }

  isRoomSelected(roomId: string): boolean {
    return this.selectedRooms().some(sel => sel.roomId === roomId);
  }

  selectRoom(roomId: string): void {
    // No-op ya que ahora seleccionamos por el modal flotante,
    // pero mantenemos la firma por si acaso se llama de forma genérica
  }

  get currentImage(): string {
    return this.lodging?.imagenes?.[this.activeSlide()] || '';
  }

  get totalSlides(): number {
    return this.lodging?.imagenes?.length || 0;
  }

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.route.queryParams.subscribe(qParams => {
        this.provider = qParams['provider'] || 'juan';
        this.fechaLlegada = qParams['llegada'] || '2026-05-20';
        this.fechaSalida = qParams['salida'] || '2026-05-22';
        this.adultos = qParams['adultos'] ? +qParams['adultos'] : 2;
        this.ninos = qParams['ninos'] ? +qParams['ninos'] : 0;
        this.initialAdultos = this.adultos;
        this.initialNinos = this.ninos;

        if (this.fechaLlegada && this.fechaSalida) {
          const diff = (new Date(this.fechaSalida).getTime() - new Date(this.fechaLlegada).getTime()) / 86400000;
          this.noches = diff > 0 ? diff : 2;
        }

        this.lodgingService.getLodgingById(this.id, this.provider, this.fechaLlegada, this.fechaSalida, this.adultos, this.ninos).subscribe(lodging => {
          if (lodging) {
            this.lodging = lodging;
            this.startAutoplay();
            this.cdr.detectChanges();

            // Fetch reviews
            this.lodgingService.getReviews(this.id, this.provider).subscribe(reviews => {
              if (this.lodging) {
                this.lodging.reviews = reviews;
                this.lodging.reviewsCount = reviews.length;
                this.cdr.detectChanges();
              }
            });
          }
        });
      });
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

  getServiceIcon(serv: string): string {
    const s = (serv || '').toLowerCase();
    if (s.includes('wifi') || s.includes('internet')) return 'wifi';
    if (s.includes('desayuno') || s.includes('breakfast') || s.includes('comida') || s.includes('cafe')) return 'free_breakfast';
    if (s.includes('piscina') || s.includes('alberca') || s.includes('pool')) return 'pool';
    if (s.includes('restaurante') || s.includes('comedor') || s.includes('restaurant')) return 'restaurant';
    if (s.includes('estacionamiento') || s.includes('parque') || s.includes('parking')) return 'local_parking';
    if (s.includes('spa')) return 'spa';
    if (s.includes('gym') || s.includes('gimnasio') || s.includes('fitness')) return 'fitness_center';
    if (s.includes('reuniones') || s.includes('conferencias') || s.includes('meeting')) return 'meeting_room';
    if (s.includes('recepcion') || s.includes('cliente') || s.includes('servicio') || s.includes('support')) return 'support_agent';
    return 'check_circle';
  }

  onLlegadaChange(val: string): void {
    this.fechaLlegada = val;
    if (this.fechaSalida && this.fechaSalida < this.fechaLlegada) {
      this.fechaSalida = this.fechaLlegada;
    }
    this.refreshHabitaciones();
  }

  onSalidaChange(val: string): void {
    this.fechaSalida = val;
    if (this.fechaLlegada && this.fechaSalida < this.fechaLlegada) {
      this.fechaLlegada = this.fechaSalida;
    }
    this.refreshHabitaciones();
  }

  refreshHabitaciones(): void {
    if (!this.id || !this.provider) return;
    
    // Recalcular noches
    if (this.fechaLlegada && this.fechaSalida) {
      const diff = (new Date(this.fechaSalida).getTime() - new Date(this.fechaLlegada).getTime()) / 86400000;
      this.noches = diff > 0 ? diff : 1;
    }

    // Volver a consultar detalles y disponibilidad en el rango
    this.lodgingService.getLodgingById(this.id, this.provider, this.fechaLlegada, this.fechaSalida, this.adultos, this.ninos).subscribe(lodging => {
      if (lodging) {
        // Preservar reviews ya cargadas para evitar volver a solicitarlas
        const reviews = this.lodging?.reviews || [];
        const reviewsCount = this.lodging?.reviewsCount || 0;
        
        this.lodging = lodging;
        this.lodging.reviews = reviews;
        this.lodging.reviewsCount = reviewsCount;
        
        // Filter out selections that are no longer available in the refreshed room list
        const currentSels = this.selectedRooms().filter(sel => 
          lodging.habitaciones.some(r => r.id === sel.roomId)
        );
        this.selectedRooms.set(currentSels);
        this.cdr.detectChanges();
      }
    });
  }

  // Room modal carousel state
  selectedRoomForModal = signal<Room | null>(null);
  activeRoomSlide = signal(0);
  modalHabitaciones = signal(1);
  modalAdultos = signal(1);
  modalNinos = signal(0);

  openRoomModal(room: Room, event: Event): void {
    event.stopPropagation(); // Evitar seleccionar la habitación al abrir la galería
    this.selectedRoomForModal.set(room);
    this.activeRoomSlide.set(0);

    const existing = this.selectedRooms().find(sel => sel.roomId === room.id);
    if (existing) {
      this.modalHabitaciones.set(existing.habitaciones);
      this.modalAdultos.set(existing.adultos);
      this.modalNinos.set(existing.ninos);
    } else {
      this.modalHabitaciones.set(1);
      // Sugerir adultos restantes de la búsqueda, limitado por la capacidad de la habitación
      const remainingAdults = Math.max(1, this.adultos - this.totalAdultosSeleccionados);
      this.modalAdultos.set(Math.min(room.capacidadAdultos, remainingAdults));
      // Sugerir niños restantes de la búsqueda, limitado por la capacidad de la habitación
      const remainingKids = Math.max(0, this.ninos - this.totalNinosSeleccionados);
      this.modalNinos.set(Math.min(room.capacidadNinos, remainingKids));
    }
  }

  closeRoomModal(): void {
    this.selectedRoomForModal.set(null);
  }

  nextRoomSlide(): void {
    const room = this.selectedRoomForModal();
    if (!room || !room.imagenes || room.imagenes.length === 0) return;
    this.activeRoomSlide.set((this.activeRoomSlide() + 1) % room.imagenes.length);
  }

  prevRoomSlide(): void {
    const room = this.selectedRoomForModal();
    if (!room || !room.imagenes || room.imagenes.length === 0) return;
    this.activeRoomSlide.set((this.activeRoomSlide() - 1 + room.imagenes.length) % room.imagenes.length);
  }

  changeModalHabitaciones(delta: number): void {
    const room = this.selectedRoomForModal();
    if (!room) return;
    const nextVal = this.modalHabitaciones() + delta;
    if (nextVal >= 1 && nextVal <= room.disponibles) {
      this.modalHabitaciones.set(nextVal);
      
      // Ajustar adultos y niños si superan la nueva capacidad máxima del total de habitaciones
      const maxAd = room.capacidadAdultos * nextVal;
      const maxKi = room.capacidadNinos * nextVal;
      if (this.modalAdultos() > maxAd) this.modalAdultos.set(maxAd);
      if (this.modalNinos() > maxKi) this.modalNinos.set(maxKi);
    }
  }

  changeModalAdultos(delta: number): void {
    const room = this.selectedRoomForModal();
    if (!room) return;
    const nextVal = this.modalAdultos() + delta;
    const maxAd = room.capacidadAdultos * this.modalHabitaciones();
    if (nextVal >= 1 && nextVal <= maxAd) {
      this.modalAdultos.set(nextVal);
    }
  }

  changeModalNinos(delta: number): void {
    const room = this.selectedRoomForModal();
    if (!room) return;
    const nextVal = this.modalNinos() + delta;
    const maxKi = room.capacidadNinos * this.modalHabitaciones();
    if (nextVal >= 0 && nextVal <= maxKi) {
      this.modalNinos.set(nextVal);
    }
  }

  confirmRoomSelection(room: Room): void {
    const selection = {
      roomId: room.id,
      roomName: room.nombre,
      precio: room.precio,
      habitaciones: this.modalHabitaciones(),
      adultos: this.modalAdultos(),
      ninos: this.modalNinos(),
      maxAdultos: room.capacidadAdultos,
      maxNinos: room.capacidadNinos,
      disponibles: room.disponibles
    };
    
    // Quitar si ya existía y agregar nueva selección
    const current = this.selectedRooms().filter(sel => sel.roomId !== room.id);
    const updated = [...current, selection];
    this.selectedRooms.set(updated);
    
    const totalAd = updated.reduce((sum, sel) => sum + sel.adultos, 0);
    const totalKi = updated.reduce((sum, sel) => sum + sel.ninos, 0);
    
    const nextAdultos = Math.max(this.initialAdultos, totalAd);
    const nextNinos = Math.max(this.initialNinos, totalKi);
    
    let changed = false;
    if (this.adultos !== nextAdultos) {
      this.adultos = nextAdultos;
      changed = true;
    }
    if (this.ninos !== nextNinos) {
      this.ninos = nextNinos;
      changed = true;
    }
    
    this.closeRoomModal();

    if (changed) {
      this.refreshHabitaciones();
    }
  }

  removeRoomSelection(roomId: string): void {
    const updated = this.selectedRooms().filter(sel => sel.roomId !== roomId);
    this.selectedRooms.set(updated);
    
    const totalAd = updated.reduce((sum, sel) => sum + sel.adultos, 0);
    const totalKi = updated.reduce((sum, sel) => sum + sel.ninos, 0);
    
    const nextAdultos = Math.max(this.initialAdultos, totalAd);
    const nextNinos = Math.max(this.initialNinos, totalKi);
    
    let changed = false;
    if (this.adultos !== nextAdultos) {
      this.adultos = nextAdultos;
      changed = true;
    }
    if (this.ninos !== nextNinos) {
      this.ninos = nextNinos;
      changed = true;
    }
    
    this.closeRoomModal();

    if (changed) {
      this.refreshHabitaciones();
    }
  }

  procederAReserva(): void {
    if (!this.puedeReservar || !this.lodging) return;
    
    // Serializar la selección para enviarla a booking
    const seleccionStr = JSON.stringify(this.selectedRooms());
    
    this.router.navigate(['/alojamiento', this.lodging.id, 'reservar'], {
      queryParams: {
        provider: this.provider,
        llegada: this.fechaLlegada,
        salida: this.fechaSalida,
        adultos: this.adultos,
        ninos: this.ninos,
        seleccion: seleccionStr
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }
}
