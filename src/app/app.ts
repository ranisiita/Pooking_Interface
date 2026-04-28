import { Component, signal, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router, Event, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './shared/ui/toast/toast.component';
import { SpinnerComponent } from './shared/ui/spinner/spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ToastComponent, SpinnerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Pookie_Interface');
  
  isLoading = false;
  private isInitialLoad = true;
  private timeoutId: any;
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        if (this.isInitialLoad) {
          this.isInitialLoad = false;
          return; // Skip animation on first load
        }
        
        // Limpiamos cualquier timeout previo si el usuario navega muy rápido
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }

        // Forzamos a Angular a destruir y recrear el HTML sincrónicamente para reiniciar la animación CSS
        this.isLoading = false;
        this.cdr.detectChanges();
        this.isLoading = true;
        this.cdr.detectChanges();
      }
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Retraso para que la animación se complete visiblemente
        this.timeoutId = setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }, 2400);
      }
    });
  }
}
