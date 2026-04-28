import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading.isLoading()) {
      <div class="spinner-overlay" role="status" aria-label="Cargando">
        <div class="spinner"></div>
      </div>
    }
  `,
})
export class SpinnerComponent {
  loading = inject(LoadingService);
}
