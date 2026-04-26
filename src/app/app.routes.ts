import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SearchComponent } from './pages/search/search.component';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'buscar', component: SearchComponent },
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: '**', redirectTo: '' }
];
