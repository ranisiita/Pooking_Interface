import { Pipe, PipeTransform } from '@angular/core';
import type { EstadoReserva, EstadoVuelo, EstadoBoleto, EstadoEquipaje } from '../../core/models/domain.models';

const LABELS: Record<string, string> = {
  PEN: 'Pendiente', CON: 'Confirmada', CAN: 'Cancelada',
  EXP: 'Expirada', FIN: 'Finalizada', EMI: 'Emitida',
  PROGRAMADO: 'Programado', EN_VUELO: 'En vuelo', ATERRIZADO: 'Aterrizado',
  CANCELADO: 'Cancelado', DEMORADO: 'Demorado',
  ACTIVO: 'Activo', USADO: 'Usado',
  REGISTRADO: 'Registrado', EMBARCADO: 'Embarcado', EN_TRANSITO: 'En tránsito',
  ENTREGADO: 'Entregado', PERDIDO: 'Perdido', DANADO: 'Dañado',
};

@Pipe({ name: 'estado', standalone: true })
export class EstadoPipe implements PipeTransform {
  transform(value: string): string {
    return LABELS[value] ?? value;
  }
}
