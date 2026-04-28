import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="t.type">
          <span class="material-icons toast-icon">
            {{ t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info' }}
          </span>
          <span style="flex:1">{{ t.message }}</span>
          <button class="toast-close" (click)="toast.dismiss(t.id)" aria-label="Cerrar">&times;</button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  toast = inject(ToastService);
}
