import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface GmailOAuthStatus {
  connected: boolean;
  email?: string;
  token_valid: boolean;
  expires_at?: string;
  scopes: string[];
  last_sync?: string;
}

export interface GmailAuthResponse {
  success: boolean;
  message: string;
  status?: GmailOAuthStatus;
  gmail_profile?: {
    email: string;
    total_messages: number;
    threads_total: number;
  };
}

export interface GmailSyncResult {
  success: boolean;
  synced_emails: number;
  skipped_emails: number;
  errors: number;
  total_processed: number;
}

@Injectable({
  providedIn: 'root'
})
export class GmailOAuthService {
  private readonly apiUrl = `${environment.apiUrl}/oauth`;
  
  // BehaviorSubject pour suivre l'état de connexion Gmail
  private gmailStatusSubject = new BehaviorSubject<GmailOAuthStatus | null>(null);
  public gmailStatus$ = this.gmailStatusSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Ne vérifier le statut Gmail que si l'utilisateur est authentifié
    this.authService.isAuthenticated$.subscribe((isAuth: boolean) => {
      if (isAuth) {
        this.checkGmailStatus();
      } else {
        this.gmailStatusSubject.next(null);
      }
    });
  }

  /**
   * Retourne un observable pour savoir si Gmail est connecté
   */
  get isGmailConnected$(): Observable<boolean> {
    return this.gmailStatus$.pipe(
      map((status: GmailOAuthStatus | null) => status?.connected ?? false)
    );
  }

  /**
   * Initie le processus d'inscription et d'autorisation Gmail OAuth en une étape
   * Redirige vers Google OAuth pour créer un compte et autoriser Gmail
   */
  initiateGmailAuthAndRegister(): void {
    // Redirection directe vers le nouveau endpoint qui gère l'inscription
    window.location.href = `${this.apiUrl}/gmail/authorize-and-register`;
  }

  /**
   * Initie le processus d'autorisation Gmail OAuth
   * Redirige vers Google OAuth
   * Le cookie HttpOnly sera automatiquement envoyé avec la requête
   */
  initiateGmailAuth(): void {
    // Redirection vers l'endpoint d'autorisation
    // Le cookie HttpOnly sera automatiquement inclus
    window.location.href = `${this.apiUrl}/gmail/authorize`;
  }

  /**
   * Récupère le statut actuel de la connexion Gmail
   */
  getGmailStatus(): Observable<GmailAuthResponse> {
    return this.http.get<GmailAuthResponse>(`${this.apiUrl}/gmail/status`);
  }

  /**
   * Vérifie le statut de l'autorisation Gmail
   * Le cookie HttpOnly est automatiquement envoyé avec la requête
   */
  checkGmailStatus(): void {
    this.http.get<any>(`${this.apiUrl}/gmail/status`).subscribe({
      next: (response) => {
        console.log('Statut Gmail récupéré:', response);
        // Le backend retourne {success: true, status: {...}}
        // On extrait uniquement le status
        if (response.success && response.status) {
          this.gmailStatusSubject.next(response.status);
        } else {
          this.gmailStatusSubject.next(null);
        }
      },
      error: (error) => {
        console.warn('Impossible de vérifier le statut Gmail:', error);
        // Si erreur 401, l'utilisateur n'est pas connecté à Gmail
        this.gmailStatusSubject.next(null);
      }
    });
  }

  /**
   * Déconnecte le compte Gmail
   */
  disconnectGmail(): Observable<GmailAuthResponse> {
    return this.http.post<GmailAuthResponse>(`${this.apiUrl}/gmail/disconnect`, {});
  }

  /**
   * Rafraîchit le token d'accès Gmail
   */
  refreshGmailToken(): Observable<GmailAuthResponse> {
    return this.http.post<GmailAuthResponse>(`${this.apiUrl}/gmail/refresh-token`, {});
  }

  /**
   * Teste la connexion Gmail
   */
  testGmailConnection(): Observable<GmailAuthResponse> {
    return this.http.get<GmailAuthResponse>(`${this.apiUrl}/gmail/test-connection`);
  }

  /**
   * Synchronise les emails depuis Gmail
   */
  syncEmailsFromGmail(maxEmails: number = 100, daysBack: number = 30): Observable<GmailSyncResult> {
    const params = {
      max_emails: maxEmails.toString(),
      days_back: daysBack.toString()
    };
    
    return this.http.post<GmailSyncResult>(`${this.apiUrl}/gmail/sync-emails`, {}, { params });
  }

  /**
   * Gère le callback OAuth après autorisation
   */
  handleOAuthCallback(success: boolean, email?: string, error?: string): void {
    if (success && email) {
      // Succès - mettre à jour le statut
      this.checkGmailStatus();
      
      // Optionnel: déclencher une notification de succès
      console.log('Gmail connecté avec succès:', email);
    } else if (error) {
      // Erreur - gérer l'erreur
      console.error('Erreur OAuth Gmail:', error);
      this.gmailStatusSubject.next(null);
    }
  }

  /**
   * Vérifie si Gmail est connecté et le token est valide
   */
  isGmailConnectedAndValid(): boolean {
    const status = this.gmailStatusSubject.value;
    return status ? status.connected && status.token_valid : false;
  }

  /**
   * Obtient l'email Gmail connecté
   */
  getConnectedGmailEmail(): string | null {
    const status = this.gmailStatusSubject.value;
    return status ? status.email || null : null;
  }

  /**
   * Déconnecte Gmail et met à jour l'état
   */
  disconnectAndUpdateStatus(): Observable<GmailAuthResponse> {
    return new Observable(observer => {
      this.disconnectGmail().subscribe({
        next: (response) => {
          if (response.success) {
            this.gmailStatusSubject.next(null);
          }
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }
}
