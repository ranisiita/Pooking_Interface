import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

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

  constructor(private eRef: ElementRef, private router: Router) {}

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

  get isLoggedIn(): boolean {
    try {
      return !!localStorage.getItem('token');
    } catch {
      return false;
    }
  }

  get isAdmin(): boolean {
    try {
      const rolesStr = localStorage.getItem('roles');
      if (!rolesStr) return false;
      const roles = JSON.parse(rolesStr);
      return Array.isArray(roles) && roles.includes('ADMINISTRADOR');
    } catch {
      return false;
    }
  }

  logout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('usuarioGuid');
      localStorage.removeItem('roles');
    } catch {}
    this.showUserDropdown = false;
    this.router.navigate(['/']);
  }
}
