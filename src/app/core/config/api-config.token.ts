import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
