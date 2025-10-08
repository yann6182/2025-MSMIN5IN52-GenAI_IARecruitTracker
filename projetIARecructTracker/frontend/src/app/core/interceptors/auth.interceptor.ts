import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, filter, take, switchMap, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../../models/auth.model';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Ne pas ajouter le token pour les requêtes d'authentification
  if (isAuthRequest(req.url)) {
    return next(req);
  }

  // Ajouter le token d'autorisation si disponible
  const authReq = addAuthToken(req, authService);
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si erreur 401 (token expiré), tenter de rafraîchir le token
      if (error.status === 401 && !isAuthRequest(req.url)) {
        return handle401Error(authReq, next, authService);
      }
      
      return throwError(() => error);
    })
  );
};

function addAuthToken(request: HttpRequest<any>, authService: AuthService): HttpRequest<any> {
  const token = authService.getToken();
  
  if (token) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return request;
}

function handle401Error(
  request: HttpRequest<any>, 
  next: HttpHandlerFn, 
  authService: AuthService
): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((authResponse: AuthResponse) => {
        isRefreshing = false;
        refreshTokenSubject.next(authResponse.access_token);
        
        // Relancer la requête originale avec le nouveau token
        return next(addAuthToken(request, authService));
      }),
      catchError((error) => {
        isRefreshing = false;
        
        // Impossible de rafraîchir le token, déconnecter l'utilisateur
        authService.logout();
        return throwError(() => error);
      })
    );
  } else {
    // Une autre requête est déjà en train de rafraîchir le token
    return refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(() => next(addAuthToken(request, authService)))
    );
  }
}

function isAuthRequest(url: string): boolean {
  // URLs qui ne nécessitent pas de token d'autorisation
  const authUrls = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/password-reset',
    '/auth/verify-email'
  ];
  
  return authUrls.some(authUrl => url.includes(authUrl));
}
