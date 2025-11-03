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
  
  // État de l'authentification (en mémoire uniquement)
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Vérifier si l'utilisateur est déjà connecté au démarrage (via cookie HttpOnly)
    this.initializeAuth();
  }

  /**
   * Met à jour l'utilisateur actuel et l'état d'authentification (en mémoire uniquement)
   */
  private setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Initialise l'état d'authentification
   * Tente de récupérer l'utilisateur actuel via le cookie HttpOnly
   */
  private initializeAuth(): void {
    // Essayer de récupérer l'utilisateur depuis le backend (cookie HttpOnly envoyé automatiquement)
    // On utilise catchError ici pour gérer silencieusement les erreurs 401 au démarrage
    this.http.get<User>(`${this.API_URL}/me`).pipe(
      catchError(() => {
        // Pas de cookie valide ou expiré, l'utilisateur n'est pas connecté
        // Ne pas afficher d'erreur, c'est normal
        return throwError(() => new Error('Not authenticated'));
      })
    ).subscribe({
      next: (user) => {
        this.setCurrentUser(user);
      },
      error: () => {
        // Silencieusement ignorer l'erreur - l'utilisateur n'est simplement pas connecté
        this.clearSession(false);
      }
    });
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
   * Simple: nettoie la session locale et redirige
   * Pas besoin d'appeler le backend (le token JWT sera simplement ignoré)
   */
  logout(navigate: boolean = true): void {
    this.clearSession(navigate);
  }

  /**
   * Rafraîchir le token
   * Note: Avec les cookies HttpOnly, le refresh est géré automatiquement par le backend
   * Cette méthode n'est plus nécessaire mais gardée pour compatibilité
   */
  refreshToken(): Observable<AuthResponse> {
    // Avec les cookies HttpOnly, le backend gère automatiquement le refresh
    // Si le cookie expire, l'utilisateur sera déconnecté
    this.logout();
    return throwError(() => new Error('Session expired - please login again'));
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
          this.setCurrentUser(user);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les informations de l'utilisateur actuel depuis le backend
   * Utilise le cookie HttpOnly automatiquement envoyé
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Recharger l'état d'authentification (force refresh depuis le backend)
   * Utile après un callback OAuth ou un refresh de page
   */
  reloadAuthState(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`).pipe(
      tap(user => {
        this.setCurrentUser(user);
      }),
      catchError(error => {
        this.clearSession(false);
        return throwError(() => error);
      })
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
    // Le cookie HttpOnly est déjà défini par le backend
    // On met juste à jour l'état local
    if (authResponse.user) {
      this.setCurrentUser(authResponse.user);
    }
  }

  private clearSession(navigate: boolean = true): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    if (navigate) {
      this.router.navigate(['/auth/login']);
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
