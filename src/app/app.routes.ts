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
      import('./components/booking/booking.component').then(
        (m) => m.BookingComponent
      ),
  },

  // ── Autos (RedCar) ──
  {
    path: 'autos/resultados',
    loadComponent: () =>
      import('./features/cars/search/car-results.component').then(
        (m) => m.CarResultsComponent,
      ),
  },
  {
    path: 'autos/detalle/:id',
    loadComponent: () =>
      import('./features/cars/detail/car-detail.component').then(
        (m) => m.CarDetailComponent,
      ),
  },
  {
    path: 'autos/checkout/:id',
    loadComponent: () =>
      import('./features/cars/checkout/car-checkout.component').then(
        (m) => m.CarCheckoutComponent,
      ),
  },
  {
    path: 'autos/pago/:id',
    loadComponent: () =>
      import('./features/cars/payment/car-payment.component').then(
        (m) => m.CarPaymentComponent,
      ),
  },
  {
    path: 'autos/confirmacion/:id',
    loadComponent: () =>
      import('./features/cars/confirmation/car-confirmation.component').then(
        (m) => m.CarConfirmationComponent,
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
      import('./components/checkout/payment/payment.component').then(
        (m) => m.PaymentComponent,
      ),
  },
  {
    path: 'checkout/:guid/confirmacion',
    loadComponent: () =>
      import('./components/checkout/confirmation/confirmation.component').then(
        (m) => m.ConfirmationComponent,
      ),
  },

  // Atracciones — listado (datos mock, sin API por ahora)
  {
    path: 'atracciones',
    loadComponent: () =>
      import('./features/atracciones/atracciones-list/atracciones-list.component').then(
        (m) => m.AtraccionesListComponent,
      ),
  },

  // Atracciones — reserva (datos mock, sin POST real por ahora)
  {
    path: 'atracciones/:id/reservar',
    loadComponent: () =>
      import('./features/atracciones/atracciones-reserva/atracciones-reserva.component').then(
        (m) => m.AtraccionesReservaComponent,
      ),
  },

  // Atracciones — pago (POST real /reservas/{guid}/pagos/confirmacion)
  {
    path: 'atracciones/reservas/:revGuid/pago',
    loadComponent: () =>
      import('./features/atracciones/atracciones-pago/atracciones-pago.component').then(
        (m) => m.AtraccionesPagoComponent,
      ),
  },

  // Atracciones — detalle (datos mock, sin API por ahora)
  {
    path: 'atracciones/:id',
    loadComponent: () =>
      import('./features/atracciones/atracciones-detail/atracciones-detail.component').then(
        (m) => m.AtraccionesDetailComponent,
      ),
  },

  // Cuenta
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'profile', component: ProfileComponent },
  { path: '**', redirectTo: '' },
];
