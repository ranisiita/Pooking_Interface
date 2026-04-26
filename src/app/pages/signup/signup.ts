import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {}
