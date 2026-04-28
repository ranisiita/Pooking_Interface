export function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

export const IVA_RATE = 0.15;

export function calcularIva(subtotal: number): number {
  return Math.round(subtotal * IVA_RATE * 100) / 100;
}

export function calcularTotal(subtotal: number, cargoServicio = 0): number {
  return Math.round((subtotal + calcularIva(subtotal) + cargoServicio) * 100) / 100;
}
