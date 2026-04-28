import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {

  categories = [
    { icon: 'hotel',               label: 'Alojamiento',       tab: 'alojamiento' },
    { icon: 'flight',              label: 'Vuelos',             tab: 'vuelos' },
    { icon: 'directions_car',      label: 'Alquiler de Coches', tab: 'coches' },
    { icon: 'confirmation_number', label: 'Atracciones',        tab: 'atracciones' }
  ];

  constructor(private router: Router) {}

  ngAfterViewInit() {
    const video = document.querySelector('.hero-video') as HTMLVideoElement;
    if (video) {
      video.muted = true;
      video.play().catch(err => console.error('Video error:', err));
    }
  }

  navigateTo(tab: string) {
    this.router.navigate(['/buscar'], { queryParams: { tab } });
  }
}
