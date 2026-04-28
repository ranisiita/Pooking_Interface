import { Pipe, PipeTransform } from '@angular/core';
import { formatDuration } from '../../core/utils/duracion.util';

@Pipe({ name: 'duracion', standalone: true })
export class DuracionPipe implements PipeTransform {
  transform(minutes: number): string {
    return formatDuration(minutes);
  }
}
