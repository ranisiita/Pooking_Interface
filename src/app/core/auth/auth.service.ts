import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'pooking_token';
  private readonly USER_KEY = 'pooking_user';

  private _token = signal<string | null>(this._load(this.TOKEN_KEY));
  private _user = signal<{ nombre: string; email: string } | null>(
    this._loadJson(this.USER_KEY),
  );

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  login(token: string, user: { nombre: string; email: string }): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._token.set(token);
    this._user.set(user);
  }

  logout(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }

  private _load(key: string): string | null {
    try { return sessionStorage.getItem(key); }
    catch { return null; }
  }

  private _loadJson<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }
}
