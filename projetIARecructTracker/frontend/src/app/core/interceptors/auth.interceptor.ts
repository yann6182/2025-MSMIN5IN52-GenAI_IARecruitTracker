import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError, catchError } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Intercepteur HTTP pour gérer l'authentification via cookies HttpOnly
 * Les cookies sont automatiquement envoyés avec chaque requête
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Toujours envoyer les credentials (cookies) avec les requêtes
  const authReq = req.clone({
    withCredentials: true
  });
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si erreur 401 (non authentifié ou token expiré), rediriger vers login
      if (error.status === 401 && !isAuthRequest(req.url)) {
        // Utiliser directement le router au lieu du AuthService pour éviter la dépendance circulaire
        router.navigate(['/auth/login']);
      }
      
      return throwError(() => error);
    })
  );
};

function isAuthRequest(url: string): boolean {
  // URLs d'authentification qui ne nécessitent pas de redirection en cas de 401
  const authUrls = [
    '/auth/login',
    '/auth/register',
    '/auth/me',
    '/auth/logout',
    '/auth/password-reset',
    '/auth/verify-email'
  ];
  
  return authUrls.some(authUrl => url.includes(authUrl));
}
