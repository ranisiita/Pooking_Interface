import { describe, it, expect } from 'vitest';

// Minimal polyfill for Angular signals in node env
if (typeof (globalThis as any).Zone === 'undefined') {
  (globalThis as any).Zone = { current: { run: (fn: () => void) => fn() } };
}

import { SearchStore } from './search.store';

describe('SearchStore — criterios default', () => {
  it('inicializa con valores vacíos', () => {
    const store = new SearchStore();
    const c = store.criterios();
    expect(c.origen).toBe('');
    expect(c.destino).toBe('');
    expect(c.pasajeros).toBe(1);
    expect(c.clase).toBe('Económica');
  });

  it('setCriterios actualiza parcialmente', () => {
    const store = new SearchStore();
    store.setCriterios({ origen: 'UIO', pasajeros: 3 });
    expect(store.criterios().origen).toBe('UIO');
    expect(store.criterios().pasajeros).toBe(3);
    expect(store.criterios().destino).toBe('');
  });

  it('setResultados limpia loading', () => {
    const store = new SearchStore();
    store.setLoading(true);
    expect(store.loading()).toBe(true);
    store.setResultados([{ guid: 'x', nombre: 'Vuelo Test', guidTipoServicio: 'y' }] as any);
    expect(store.loading()).toBe(false);
    expect(store.hasResults()).toBe(true);
  });

  it('reset limpia todo', () => {
    const store = new SearchStore();
    store.setCriterios({ origen: 'GYE' });
    store.setResultados([{ guid: '1', nombre: 'Test', guidTipoServicio: '2' }] as any);
    store.reset();
    expect(store.criterios().origen).toBe('');
    expect(store.hasResults()).toBe(false);
  });
});
