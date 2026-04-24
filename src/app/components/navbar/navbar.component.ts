import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {

  navItems = [
    { icon: 'paid', tooltip: 'Moneda' },
    { icon: 'public', tooltip: 'País' },
    { icon: 'help_outline', tooltip: 'Atención al cliente' },
    { icon: 'account_circle', tooltip: 'Usuario' }
  ];

  activeTooltip: string | null = null;

  showTooltip(tooltip: string) { this.activeTooltip = tooltip; }
  hideTooltip() { this.activeTooltip = null; }
}
