import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (totalPaginas() > 1) {
      <div class="pagination" role="navigation" aria-label="Paginación">
        <button class="pagination-btn" [disabled]="pagina() <= 1" (click)="cambiar.emit(pagina() - 1)" aria-label="Anterior">
          <span class="material-icons" style="font-size:1.1rem">chevron_left</span>
        </button>
        @for (p of pages(); track p) {
          <button class="pagination-btn" [class.active]="p === pagina()" (click)="cambiar.emit(p)">
            {{ p }}
          </button>
        }
        <button class="pagination-btn" [disabled]="pagina() >= totalPaginas()" (click)="cambiar.emit(pagina() + 1)" aria-label="Siguiente">
          <span class="material-icons" style="font-size:1.1rem">chevron_right</span>
        </button>
      </div>
    }
  `,
})
export class PaginationComponent {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly cambiar = output<number>();

  pages(): number[] {
    const total = this.totalPaginas();
    const current = this.pagina();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }
}
