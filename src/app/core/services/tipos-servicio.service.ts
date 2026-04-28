import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { TipoServicio } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class TiposServicioService {
  private http = inject(HttpClient);
  private base = '/api/v1/tipos-servicio';

  getAll(): Observable<ApiResponse<TipoServicio[]>> {
    return this.http.get<ApiResponse<TipoServicio[]>>(this.base);
  }

  getActivos(): Observable<ApiResponse<TipoServicio[]>> {
    return this.http.get<ApiResponse<TipoServicio[]>>(`${this.base}/activos`);
  }

  getPorNombre(nombre: string): Observable<ApiResponse<TipoServicio>> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http.get<ApiResponse<TipoServicio>>(`${this.base}/por-nombre`, { params });
  }

  getByGuid(guid: string): Observable<ApiResponse<TipoServicio>> {
    return this.http.get<ApiResponse<TipoServicio>>(`${this.base}/${guid}`);
  }
}
