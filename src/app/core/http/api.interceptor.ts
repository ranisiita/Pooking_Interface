import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_CONFIG } from '../config/api-config.token';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(API_CONFIG);

  if (req.url.startsWith('http') || req.url.startsWith('//')) {
    return next(req);
  }

  const apiReq = req.clone({
    url: `${config.baseUrl}${req.url}`,
    setHeaders: { 'Content-Type': 'application/json' },
  });

  return next(apiReq);
};
