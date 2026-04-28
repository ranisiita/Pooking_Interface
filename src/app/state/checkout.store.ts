import { Injectable, signal } from '@angular/core';
import {
  Vuelo, Asiento, Cliente, Pasajero,
  Reserva, Factura, Boleto,
} from '../core/models/domain.models';

const KEY = 'pooking_checkout';

/** Datos de cotización calculados al seleccionar un proveedor de vuelo. */
export interface Cotizacion {
  guidServicio:          string;
  nombreServicio:        string;
  origen:                string;
  destino:               string;
  fechaSalida:           string;
  horaSalida:            string;
  horaLlegada:           string;
  duracion:              string;
  escalas:               number;
  clase:                 string;
  cantidadPasajeros:     number;
  precioBasePorPasajero: number;
  factorClase:           number;
  subtotal:              number;
  iva:                   number;
  cargoServicio:         number;
  total:                 number;
}

export interface CheckoutState {
  vuelo: Vuelo | null;
  asiento: Asiento | null;
  cliente: Cliente | null;
  pasajeros: Pasajero[];
  reserva: Reserva | null;
  factura: Factura | null;
  boleto: Boleto | null;
  cotizacion: Cotizacion | null;
  paso: number;
}

const initial = (): CheckoutState => ({
  vuelo: null, asiento: null, cliente: null,
  pasajeros: [], reserva: null, factura: null, boleto: null,
  cotizacion: null, paso: 1,
});

@Injectable({ providedIn: 'root' })
export class CheckoutStore {
  private _state = signal<CheckoutState>(this._load());

  readonly state = this._state.asReadonly();

  setVuelo(v: Vuelo | null): void           { this._update({ vuelo: v }); }
  setAsiento(a: Asiento | null): void       { this._update({ asiento: a }); }
  setCliente(c: Cliente | null): void       { this._update({ cliente: c }); }
  setPasajeros(p: Pasajero[]): void         { this._update({ pasajeros: p }); }
  setReserva(r: Reserva | null): void       { this._update({ reserva: r }); }
  setFactura(f: Factura | null): void       { this._update({ factura: f }); }
  setBoleto(b: Boleto | null): void         { this._update({ boleto: b }); }
  setCotizacion(c: Cotizacion | null): void { this._update({ cotizacion: c }); }
  setPaso(n: number): void                  { this._update({ paso: n }); }

  reset(): void {
    this._state.set(initial());
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }

  private _update(patch: Partial<CheckoutState>): void {
    this._state.update((s) => {
      const next = { ...s, ...patch };
      try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  private _load(): CheckoutState {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as CheckoutState) : initial();
    } catch { return initial(); }
  }
}
