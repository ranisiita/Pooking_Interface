import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SearchComponent } from './pages/search/search.component';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { ProfileComponent } from './pages/profile/profile.component';
import { authGuard } from './core/auth/auth.guard';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'buscar', component: SearchComponent },

  // Resultados de vuelos (integración real con servicios/guidTipo)
  {
    path: 'vuelos/resultados',
    loadComponent: () =>
      import('./features/flights/search/flight-results.component').then(
        (m) => m.FlightResultsComponent,
      ),
  },

  // Detalle de vuelo / servicio
  {
    path: 'vuelos/:guid',
    loadComponent: () =>
      import('./features/flights/detail/flight-detail.component').then(
        (m) => m.FlightDetailComponent,
      ),
  },

  // Mapa de asientos (Fase 2)
  {
    path: 'vuelos/:guid/asientos',
    loadComponent: () =>
      import('./features/flights/seat-map/seat-map.component').then(
        (m) => m.SeatMapComponent,
      ),
  },

  // Checkout (requiere selección previa de vuelo)
  {
    path: 'checkout',
    loadChildren: () =>
      import('./features/checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
  },

  // Cuenta
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }

];
