import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GmailOAuthService, GmailOAuthStatus } from '../../core/services/gmail-oauth.service';

@Component({
  selector: 'app-gmail-connection',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gmail-connection-card">
      <div class="card-header">
        <h3>
          <i class="fab fa-google"></i>
          Connexion Gmail
        </h3>
        <p>Connectez votre compte Gmail pour analyser automatiquement vos emails de candidature</p>
      </div>
      
      <div class="card-body">
        <!-- État non connecté -->
        <div *ngIf="!gmailStatus?.connected" class="not-connected">
          <div class="status-indicator disconnected">
            <i class="fas fa-circle"></i>
            <span>Non connecté</span>
          </div>
          
          <p class="description">
            Pour une expérience optimale, connectez votre compte Gmail. 
            Cela permettra à l'application d'analyser automatiquement vos emails 
            et de détecter les candidatures, entretiens et réponses.
          </p>
          
          <button 
            class="btn btn-primary gmail-connect-btn"
            (click)="connectGmail()"
            [disabled]="isProcessing">
            <i class="fab fa-google"></i>
            {{ isProcessing ? 'Connexion...' : 'Connecter Gmail' }}
          </button>
          
          <div class="security-info">
            <p><i class="fas fa-shield-alt"></i> Sécurisé par OAuth 2.0</p>
            <p><i class="fas fa-eye"></i> Lecture seule de vos emails</p>
          </div>
        </div>
        
        <!-- État connecté -->
        <div *ngIf="gmailStatus?.connected" class="connected">
          <div class="status-indicator connected">
            <i class="fas fa-circle"></i>
            <span>Connecté</span>
          </div>
          
                    <div class="connection-details">
            <div class="detail-row">
              <strong>Email :</strong>
              <span>{{ gmailStatus?.email || 'Non disponible' }}</span>
            </div>
            <div class="detail-row">
              <strong>Statut du token :</strong>
              <span class="token-status" [class.valid]="gmailStatus?.token_valid" [class.invalid]="!gmailStatus?.token_valid">
                <i [class]="gmailStatus?.token_valid ? 'fas fa-check' : 'fas fa-exclamation-triangle'"></i>
                <span>{{ gmailStatus?.token_valid ? 'Token valide' : 'Token expiré' }}</span>
              </span>
            </div>
            <div class="detail-row">
              <strong>Permissions :</strong>
              <span>{{ gmailStatus?.scopes?.length || 0 }} permissions accordées</span>
            </div>
            <div class="detail-row">
              <strong>Dernière synchronisation :</strong>
              <span>{{ gmailStatus?.last_sync || 'Jamais' }}</span>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="actions">
          <button 
            class="btn btn-primary" 
            (click)="syncEmails()"
            [disabled]="isProcessing || !gmailStatus?.token_valid">
            <i class="fas fa-sync-alt" [class.fa-spin]="isProcessing"></i>
            Synchroniser les emails
          </button>
          
          <button 
            class="btn btn-secondary" 
            (click)="refreshToken()"
            [disabled]="isProcessing"
            *ngIf="!gmailStatus?.token_valid">
            <i class="fas fa-refresh"></i>
            Renouveler le token
          </button>
          
          <div class="actions">
            <button 
              class="btn btn-secondary"
              (click)="testConnection()"
              [disabled]="isProcessing">
              <i class="fas fa-heartbeat"></i>
              {{ isProcessing ? 'Test...' : 'Tester la connexion' }}
            </button>
            
            <button 
              class="btn btn-success"
              (click)="syncEmails()"
              [disabled]="isProcessing || !gmailStatus?.token_valid">
              <i class="fas fa-sync"></i>
              {{ isProcessing ? 'Synchronisation...' : 'Synchroniser les emails' }}
            </button>
            
            <button 
              class="btn btn-warning"
              (click)="refreshToken()"
              [disabled]="isProcessing"
              *ngIf="!gmailStatus?.token_valid">
              <i class="fas fa-refresh"></i>
              Rafraîchir le token
            </button>
            
            <button 
              class="btn btn-danger"
              (click)="disconnectGmail()"
              [disabled]="isProcessing">
              <i class="fas fa-unlink"></i>
              Déconnecter
            </button>
          </div>
        </div>
        
        <!-- Messages de statut -->
        <div *ngIf="statusMessage" class="status-message" [class]="messageType">
          <i [class]="getMessageIcon()"></i>
          {{ statusMessage }}
        </div>
        
        <!-- Résultats de synchronisation -->
        <div *ngIf="syncResult" class="sync-result">
          <h4>Résultat de la synchronisation</h4>
          <div class="sync-stats">
            <div class="stat">
              <span class="number">{{ syncResult.synced_emails }}</span>
              <span class="label">Nouveaux emails</span>
            </div>
            <div class="stat">
              <span class="number">{{ syncResult.skipped_emails }}</span>
              <span class="label">Ignorés</span>
            </div>
            <div class="stat">
              <span class="number">{{ syncResult.errors }}</span>
              <span class="label">Erreurs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gmail-connection-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      margin: 20px 0;
    }
    
    .card-header {
      padding: 24px;
      border-bottom: 1px solid #e9ecef;
      text-align: center;
    }
    
    .card-header h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 1.5rem;
    }
    
    .card-header h3 i {
      color: #db4437;
      margin-right: 8px;
    }
    
    .card-header p {
      margin: 0;
      color: #6c757d;
      font-size: 0.95rem;
    }
    
    .card-body {
      padding: 24px;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      font-weight: 500;
    }
    
    .status-indicator i {
      margin-right: 8px;
      font-size: 0.8rem;
    }
    
    .status-indicator.connected i {
      color: #28a745;
    }
    
    .status-indicator.disconnected i {
      color: #dc3545;
    }
    
    .description {
      color: #6c757d;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    
    .gmail-connect-btn {
      background: #db4437 !important;
      border-color: #db4437 !important;
      font-size: 1.1rem;
      padding: 12px 24px;
    }
    
    .gmail-connect-btn:hover {
      background: #c23321 !important;
      border-color: #c23321 !important;
    }
    
    .gmail-connect-btn i {
      margin-right: 8px;
    }
    
    .security-info {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e9ecef;
    }
    
    .security-info p {
      color: #6c757d;
      font-size: 0.9rem;
      margin: 4px 0;
    }
    
    .security-info i {
      color: #28a745;
      margin-right: 8px;
      width: 16px;
    }
    
    .connection-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    
    .connection-info > div {
      display: flex;
      align-items: center;
      margin: 8px 0;
    }
    
    .connection-info i {
      margin-right: 8px;
      width: 16px;
      color: #6c757d;
    }
    
    .token-status.valid {
      color: #28a745;
    }
    
    .token-status.invalid {
      color: #dc3545;
    }
    
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
    }
    
    .btn i {
      margin-right: 6px;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-warning { background: #ffc107; color: #212529; }
    .btn-danger { background: #dc3545; color: white; }
    
    .status-message {
      padding: 12px;
      border-radius: 6px;
      margin-top: 16px;
      display: flex;
      align-items: center;
    }
    
    .status-message i {
      margin-right: 8px;
    }
    
    .status-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .status-message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .status-message.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    
    .sync-result {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }
    
    .sync-result h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 1.1rem;
    }
    
    .sync-stats {
      display: flex;
      gap: 16px;
    }
    
    .stat {
      text-align: center;
      flex: 1;
    }
    
    .stat .number {
      display: block;
      font-size: 1.5rem;
      font-weight: bold;
      color: #007bff;
    }
    
    .stat .label {
      display: block;
      font-size: 0.85rem;
      color: #6c757d;
      margin-top: 4px;
    }
  `]
})
export class GmailConnectionComponent implements OnInit, OnDestroy {
  gmailStatus: GmailOAuthStatus | null = null;
  isProcessing = false;
  statusMessage = '';
  messageType = '';
  syncResult: any = null;
  
  private destroy$ = new Subject<void>();

  constructor(private gmailOAuthService: GmailOAuthService) {}

  ngOnInit(): void {
    // S'abonner aux changements de statut Gmail
    this.gmailOAuthService.gmailStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.gmailStatus = status;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  connectGmail(): void {
    this.isProcessing = true;
    this.statusMessage = 'Redirection vers Google pour autorisation...';
    this.messageType = 'info';
    
    // Petite pause pour l'UX, puis redirection
    setTimeout(() => {
      this.gmailOAuthService.initiateGmailAuth();
    }, 1000);
  }

  disconnectGmail(): void {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter votre compte Gmail ?')) {
      return;
    }
    
    this.isProcessing = true;
    this.statusMessage = 'Déconnexion en cours...';
    this.messageType = 'info';
    
    this.gmailOAuthService.disconnectAndUpdateStatus().subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.statusMessage = 'Gmail déconnecté avec succès';
          this.messageType = 'success';
          this.syncResult = null;
        } else {
          this.statusMessage = 'Erreur lors de la déconnexion';
          this.messageType = 'error';
        }
        this.clearMessageAfterDelay();
      },
      error: (error) => {
        this.isProcessing = false;
        this.statusMessage = 'Erreur lors de la déconnexion';
        this.messageType = 'error';
        this.clearMessageAfterDelay();
        console.error('Erreur déconnexion Gmail:', error);
      }
    });
  }

  testConnection(): void {
    this.isProcessing = true;
    this.statusMessage = 'Test de la connexion...';
    this.messageType = 'info';
    
    this.gmailOAuthService.testGmailConnection().subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          const profile = response.gmail_profile;
          this.statusMessage = `Connexion OK - ${profile?.total_messages || 0} messages disponibles`;
          this.messageType = 'success';
        } else {
          this.statusMessage = response.message || 'Connexion échouée';
          this.messageType = 'error';
        }
        this.clearMessageAfterDelay();
      },
      error: (error) => {
        this.isProcessing = false;
        this.statusMessage = 'Erreur lors du test de connexion';
        this.messageType = 'error';
        this.clearMessageAfterDelay();
        console.error('Erreur test connexion:', error);
      }
    });
  }

  refreshToken(): void {
    this.isProcessing = true;
    this.statusMessage = 'Rafraîchissement du token...';
    this.messageType = 'info';
    
    this.gmailOAuthService.refreshGmailToken().subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.statusMessage = 'Token rafraîchi avec succès';
          this.messageType = 'success';
          // Recharger le statut
          this.gmailOAuthService.checkGmailStatus();
        } else {
          this.statusMessage = response.message || 'Échec du rafraîchissement';
          this.messageType = 'error';
        }
        this.clearMessageAfterDelay();
      },
      error: (error) => {
        this.isProcessing = false;
        this.statusMessage = 'Erreur lors du rafraîchissement';
        this.messageType = 'error';
        this.clearMessageAfterDelay();
        console.error('Erreur rafraîchissement token:', error);
      }
    });
  }

  syncEmails(): void {
    this.isProcessing = true;
    this.statusMessage = 'Synchronisation des emails en cours...';
    this.messageType = 'info';
    this.syncResult = null;
    
    this.gmailOAuthService.syncEmailsFromGmail(100, 30).subscribe({
      next: (result) => {
        this.isProcessing = false;
        this.syncResult = result;
        if (result.success) {
          this.statusMessage = `Synchronisation terminée - ${result.synced_emails} nouveaux emails`;
          this.messageType = 'success';
        } else {
          this.statusMessage = 'Erreur lors de la synchronisation';
          this.messageType = 'error';
        }
        this.clearMessageAfterDelay();
      },
      error: (error) => {
        this.isProcessing = false;
        this.statusMessage = 'Erreur lors de la synchronisation';
        this.messageType = 'error';
        this.clearMessageAfterDelay();
        console.error('Erreur synchronisation:', error);
      }
    });
  }

  getMessageIcon(): string {
    switch (this.messageType) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-info-circle';
    }
  }

  private clearMessageAfterDelay(): void {
    setTimeout(() => {
      this.statusMessage = '';
      this.messageType = '';
    }, 5000);
  }
}
