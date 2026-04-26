import { Component, HostListener, ElementRef } from '@angular/core';
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
    { icon: 'paid', tooltip: 'Moneda', id: 'currency' },
    { icon: 'public', tooltip: 'País', id: 'country' },
    { icon: 'help_outline', tooltip: 'Atención al cliente', id: 'help' },
    { icon: 'account_circle', tooltip: 'Usuario', id: 'user' }
  ];

  activeTooltip: string | null = null;
  showUserDropdown = false;

  constructor(private eRef: ElementRef) {}

  showTooltip(tooltip: string) { this.activeTooltip = tooltip; }
  hideTooltip() { this.activeTooltip = null; }

  toggleDropdown(itemId: string, event: Event) {
    if (itemId === 'user') {
      this.showUserDropdown = !this.showUserDropdown;
      event.stopPropagation();
    }
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if(!this.eRef.nativeElement.contains(event.target)) {
      this.showUserDropdown = false;
    }
  }
}
