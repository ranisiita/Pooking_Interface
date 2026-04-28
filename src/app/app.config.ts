import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { API_CONFIG } from './core/config/api-config.token';
import { apiInterceptor } from './core/http/api.interceptor';
import { jwtInterceptor } from './core/http/jwt.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { loadingInterceptor } from './core/http/loading.interceptor';
import { TiposServicioService } from './core/services/tipos-servicio.service';
import { SearchStore } from './state/search.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(
      withFetch(),
      withInterceptors([apiInterceptor, jwtInterceptor, errorInterceptor, loadingInterceptor]),
    ),
    {
      provide: API_CONFIG,
      useValue: { baseUrl: environment.apiBaseUrl, timeoutMs: environment.apiTimeoutMs },
    },
    provideAppInitializer(() => {
      const tiposService = inject(TiposServicioService);
      const searchStore = inject(SearchStore);
      return firstValueFrom(tiposService.getPorNombre('Vuelos'))
        .then((res) => {
          if (res?.data?.guidTipoServicio) {
            searchStore.setGuidTipoVuelos(res.data.guidTipoServicio);
            return;
          }
          return firstValueFrom(tiposService.getActivos()).then((activos) => {
            const tipoVuelos = (activos.data ?? []).find((t) => t.nombre?.toLowerCase() === 'vuelos');
            if (tipoVuelos?.guidTipoServicio) searchStore.setGuidTipoVuelos(tipoVuelos.guidTipoServicio);
          });
        })
        .catch(() => {
          // Continúa aunque backend no esté disponible durante bootstrap.
        });
    }),
  ],
};
