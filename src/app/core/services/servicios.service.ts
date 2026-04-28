import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PagedData } from '../models/api-response';
import { Servicio, ServicioDetalle } from '../models/domain.models';

export interface ServiciosQuery {
  guidTipo?: string;
  termino?: string;
  paginaActual?: number;
  tamanoPagina?: number;
}

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private http = inject(HttpClient);
  private base = '/api/v1/servicios';

  list(query: ServiciosQuery = {}): Observable<ApiResponse<Servicio[]>> {
    let params = new HttpParams();
    if (query.guidTipo)     params = params.set('guidTipo', query.guidTipo);
    if (query.termino)      params = params.set('termino', query.termino);
    if (query.paginaActual !== undefined) params = params.set('paginaActual', query.paginaActual.toString());
    if (query.tamanoPagina !== undefined) params = params.set('tamanoPagina', query.tamanoPagina.toString());
    return this.http.get<ApiResponse<PagedData<Servicio>>>(this.base, { params }).pipe(
      map((res) => ({
        ...res,
        data: res.data?.items ?? (Array.isArray(res.data) ? (res.data as unknown as Servicio[]) : []),
        meta: {
          paginaActual: res.data?.paginaActual ?? 1,
          tamanoPagina: res.data?.tamanoPagina ?? 10,
          totalRegistros: res.data?.totalRegistros ?? 0,
          totalPaginas: res.data?.totalPaginas ?? 1,
        },
      })),
    );
  }

  getPaginaCompleta(): Observable<ApiResponse<Servicio[]>> {
    return this.http.get<ApiResponse<Servicio[]>>(`${this.base}/pagina-completa`);
  }

  getByGuid(guid: string): Observable<ApiResponse<Servicio>> {
    return this.http.get<ApiResponse<Servicio>>(`${this.base}/${guid}`);
  }

  getDetalle(guid: string): Observable<ApiResponse<ServicioDetalle>> {
    return this.http.get<ApiResponse<ServicioDetalle>>(`${this.base}/${guid}/detalle`);
  }
}
