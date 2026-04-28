import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user = {
    name: 'User Random',
    email: 'userrandom@hotmail.com',
    memberSince: 'Marzo 2024',
    level: 'Gold Traveler',
    avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
    stats: {
      trips: 12,
      reviews: 8,
      points: 4500
    }
  };

  upcomingTrips = [
    {
      destination: 'Kioto, Japón',
      date: '05 - 14 Dic 2026',
      hotel: 'Ritz-Carlton Kyoto',
      status: 'Pendiente',
      imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
    }
  ];

  constructor() {}

  ngOnInit(): void {
  }
}
