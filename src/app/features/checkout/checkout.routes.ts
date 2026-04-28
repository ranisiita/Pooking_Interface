import { Routes } from '@angular/router';

export const CHECKOUT_ROUTES: Routes = [
  {
    path: 'pasajeros',
    loadComponent: () =>
      import('./passengers/passengers.component').then((m) => m.PassengersComponent),
  },
  {
    path: 'resumen',
    loadComponent: () =>
      import('./review/review.component').then((m) => m.ReviewComponent),
  },
  {
    path: 'pago',
    loadComponent: () =>
      import('./payment/payment.component').then((m) => m.PaymentComponent),
  },
  {
    path: 'confirmacion',
    loadComponent: () =>
      import('./confirmation/confirmation.component').then((m) => m.ConfirmationComponent),
  },
  { path: '', redirectTo: 'pasajeros', pathMatch: 'full' },
];
