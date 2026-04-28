import { Injectable, signal, computed } from '@angular/core';
import { Servicio } from '../core/models/domain.models';
import { Paginacion } from '../core/models/api-response';

export interface CriteriosBusqueda {
  origen: string;
  destino: string;
  fechaSalida: string;
  fechaRegreso: string;
  pasajeros: number;
  clase: string;
  esIdaVuelta: boolean;
  termino: string;
}

const defaultCriterios = (): CriteriosBusqueda => ({
  origen: '',
  destino: '',
  fechaSalida: '',
  fechaRegreso: '',
  pasajeros: 1,
  clase: 'Económica',
  esIdaVuelta: false,
  termino: '',
});

@Injectable({ providedIn: 'root' })
export class SearchStore {
  private _criterios = signal<CriteriosBusqueda>(defaultCriterios());
  private _resultados = signal<Servicio[]>([]);
  private _paginacion = signal<Paginacion | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _guidTipoVuelos = signal<string | null>(null);

  readonly criterios = this._criterios.asReadonly();
  readonly resultados = this._resultados.asReadonly();
  readonly paginacion = this._paginacion.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly guidTipoVuelos = this._guidTipoVuelos.asReadonly();
  readonly hasResults = computed(() => this._resultados().length > 0);

  setCriterios(c: Partial<CriteriosBusqueda>): void {
    this._criterios.update((prev) => ({ ...prev, ...c }));
  }

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(msg: string | null): void { this._error.set(msg); }

  setResultados(items: Servicio[], paginacion?: Paginacion | null): void {
    this._resultados.set(items);
    this._paginacion.set(paginacion ?? null);
    this._loading.set(false);
    this._error.set(null);
  }

  setGuidTipoVuelos(guid: string): void { this._guidTipoVuelos.set(guid); }

  reset(): void {
    this._criterios.set(defaultCriterios());
    this._resultados.set([]);
    this._paginacion.set(null);
    this._error.set(null);
    this._loading.set(false);
  }
}
