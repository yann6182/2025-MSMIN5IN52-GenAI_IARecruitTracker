import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  AuthError,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  UserProfile
} from '../../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'ai_recruit_token';
  private readonly USER_KEY = 'ai_recruit_user';
  
  // État de l'authentification
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Vérifier si l'utilisateur est déjà connecté au démarrage
    this.initializeAuth();
  }

  /**
   * Initialise l'état d'authentification depuis le localStorage
   */
  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.getStoredUser();
    
    if (token && user && !this.isTokenExpired(token)) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    } else {
      this.logout(false); // Nettoyage silencieux
    }
  }

  /**
   * Connexion utilisateur
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => this.setSession(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Inscription utilisateur
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        tap(response => this.setSession(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Déconnexion
   */
  logout(navigate: boolean = true): void {
    // Appel API pour invalider le token côté serveur
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        complete: () => this.clearSession(navigate)
      });
    } else {
      this.clearSession(navigate);
    }
  }

  /**
   * Rafraîchir le token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('ai_recruit_refresh_token');
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, { 
      refresh_token: refreshToken 
    }).pipe(
      tap(response => this.setSession(response)),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  requestPasswordReset(request: PasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/password-reset`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Confirmation de réinitialisation de mot de passe
   */
  confirmPasswordReset(request: PasswordResetConfirm): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/password-reset/confirm`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Changer le mot de passe
   */
  changePassword(request: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/change-password`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  updateProfile(profile: UserProfile): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/profile`, profile)
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Vérifier l'email
   */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/verify-email`, { token })
      .pipe(catchError(this.handleError));
  }

  /**
   * Renvoyer l'email de vérification
   */
  resendVerificationEmail(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/resend-verification`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Getters pour l'état d'authentification
   */
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    const user = this.currentUser;
    return user ? user.email.includes('admin') : false; // Logique temporaire
  }

  /**
   * Méthodes privées
   */
  private setSession(authResponse: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResponse.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authResponse.user));
    
    // Stocker le refresh token s'il existe
    if ('refresh_token' in authResponse) {
      localStorage.setItem('ai_recruit_refresh_token', (authResponse as any).refresh_token);
    }
    
    this.currentUserSubject.next(authResponse.user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearSession(navigate: boolean = true): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('ai_recruit_refresh_token');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    if (navigate) {
      this.router.navigate(['/auth/login']);
    }
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convertir en millisecondes
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur inattendue s\'est produite';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.status === 401) {
        errorMessage = 'Email ou mot de passe incorrect';
        this.logout();
      } else if (error.status === 422) {
        errorMessage = error.error?.detail || 'Données invalides';
      } else if (error.status === 409) {
        errorMessage = 'Cet email est déjà utilisé';
      } else if (error.status === 429) {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
      } else if (error.error?.detail) {
        errorMessage = error.error.detail;
      }
    }
    
    console.error('Auth error:', error);
    return throwError(() => ({ message: errorMessage, status: error.status }));
  };
}
