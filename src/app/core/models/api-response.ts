export interface ApiResponse<T> {
  data: T;
  meta?: Paginacion;
  message?: string;
}

export interface ApiErrorResponse {
  code?: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface Paginacion {
  paginaActual: number;
  tamanoPagina: number;
  totalRegistros: number;
  totalPaginas: number;
  // Contrato Vuelos usa distintos nombres — soportamos ambos
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
}

/** Estructura que devuelve el backend para endpoints paginados. */
export interface PagedData<T> {
  items: T[];
  paginaActual: number;
  tamanoPagina: number;
  totalRegistros: number;
  totalPaginas: number;
  tienePaginaAnterior?: boolean;
  tienePaginaSiguiente?: boolean;
}
