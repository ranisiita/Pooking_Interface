import { Injectable, signal, computed } from '@angular/core';
import { Aeropuerto } from '../core/models/domain.models';

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = 'pooking_aeropuertos_cache';

interface CacheEntry {
  ts: number;
  data: Aeropuerto[];
}

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private _aeropuertos = signal<Map<string, Aeropuerto>>(this._loadCache());
  private _loaded = signal(false);

  readonly aeropuertos = this._aeropuertos.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly list = computed(() => Array.from(this._aeropuertos().values()));

  setAeropuertos(items: Aeropuerto[]): void {
    const map = new Map<string, Aeropuerto>();
    items.forEach((a) => map.set(a.codigo_iata, a));
    this._aeropuertos.set(map);
    this._loaded.set(true);
    this._saveCache(items);
  }

  getByIata(iata: string): Aeropuerto | undefined {
    return this._aeropuertos().get(iata.toUpperCase());
  }

  searchByText(text: string): Aeropuerto[] {
    const q = text.toLowerCase();
    return this.list().filter(
      (a) =>
        a.codigo_iata.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q),
    ).slice(0, 8);
  }

  private _loadCache(): Map<string, Aeropuerto> {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return new Map();
      const entry = JSON.parse(raw) as CacheEntry;
      if (Date.now() - entry.ts > TTL_MS) return new Map();
      const map = new Map<string, Aeropuerto>();
      entry.data.forEach((a) => map.set(a.codigo_iata, a));
      return map;
    } catch { return new Map(); }
  }

  private _saveCache(items: Aeropuerto[]): void {
    try {
      const entry: CacheEntry = { ts: Date.now(), data: items };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch { /* storage full */ }
  }
}
