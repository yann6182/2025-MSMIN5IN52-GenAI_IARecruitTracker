import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

  constructor(private http: HttpClient) {
    // Vérifier le statut au démarrage seulement si un token existe
    if (this.hasAuthToken()) {
      this.checkGmailStatus();
    }
  }

  /**
   * Vérifie si un token d'authentification est présent
   */
  private hasAuthToken(): boolean {
    const token = localStorage.getItem('ai_recruit_token');
    return !!token;
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
   */
  initiateGmailAuth(): void {
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      // Si pas de token, utiliser l'inscription automatique
      this.initiateGmailAuthAndRegister();
      return;
    }
    
    // Redirection avec le token en paramètre d'URL pour OAuth
    window.location.href = `${this.apiUrl}/gmail/authorize?token=${encodeURIComponent(token)}`;
  }

  /**
   * Récupère le statut actuel de la connexion Gmail
   */
  getGmailStatus(): Observable<GmailAuthResponse> {
    return this.http.get<GmailAuthResponse>(`${this.apiUrl}/gmail/status`);
  }

    /**
   * Vérifie le statut de l'autorisation Gmail
   */
  checkGmailStatus(): void {
    // Ne pas vérifier si pas de token
    if (!this.hasAuthToken()) {
      this.gmailStatusSubject.next(null);
      return;
    }

    this.http.get<GmailOAuthStatus>(`${this.apiUrl}/gmail/status`).subscribe({
      next: (response) => {
        this.gmailStatusSubject.next(response);
      },
      error: (error) => {
        console.warn('Impossible de vérifier le statut Gmail:', error);
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
