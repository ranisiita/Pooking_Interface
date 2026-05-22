import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SearchComponent } from './pages/search/search.component';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { ProfileComponent } from './pages/profile/profile.component';
import { AdminComponent } from './pages/admin/admin.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'buscar', component: SearchComponent },
  {
    path: 'alojamiento/resultados',
    loadComponent: () =>
      import('./pages/lodging-results/lodging-results.component').then(
        (m) => m.LodgingResultsComponent
      ),
  },

  // Detalle de alojamiento
  {
    path: 'alojamiento/:id',
    loadComponent: () =>
      import('./pages/lodging-detail/lodging-detail.component').then(
        (m) => m.LodgingDetailComponent
      ),
  },

  // Reserva de alojamiento
  {
    path: 'alojamiento/:id/reservar',
    loadComponent: () =>
      import('./pages/booking/booking.component').then(
        (m) => m.BookingComponent
      ),
  },

  // Resultados de vuelos
  {
    path: 'vuelos/resultados',
    loadComponent: () =>
      import('./features/flights/search/flight-results.component').then(
        (m) => m.FlightResultsComponent,
      ),
  },

  // Hall de pagos (2 pasos en un mismo componente)
  {
    path: 'checkout/:guid',
    loadComponent: () =>
      import('./features/checkout/payment/payment.component').then(
        (m) => m.PaymentComponent,
      ),
  },
  {
    path: 'checkout/:guid/confirmacion',
    loadComponent: () =>
      import('./features/checkout/confirmation/confirmation.component').then(
        (m) => m.ConfirmationComponent,
      ),
  },

  // Cuenta
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'profile', component: ProfileComponent },
  { path: '**', redirectTo: '' },
];
