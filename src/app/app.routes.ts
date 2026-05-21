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
