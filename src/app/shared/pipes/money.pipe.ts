import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '../../core/utils/money.util';

@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number, currency = 'USD'): string {
    return formatMoney(value, currency);
  }
}
