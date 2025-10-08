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
          Analyseur d'emails de candidature
        </h3>
        <p>Analysez automatiquement vos emails pour suivre vos candidatures</p>
      </div>
      
      <div class="card-body">
        <!-- État non connecté -->
        <div *ngIf="!gmailStatus?.connected" class="not-connected">
          <div class="welcome-message">
            <i class="fas fa-envelope-open-text"></i>
            <h4>Commencez votre suivi de candidatures</h4>
            <p>
              Connectez votre Gmail pour que nous analysions automatiquement vos emails 
              et détections les réponses aux candidatures, les invitations d'entretien et plus encore.
            </p>
          </div>
          
          <button 
            class="btn btn-google gmail-connect-btn"
            (click)="connectGmail()"
            [disabled]="isProcessing">
            <i class="fab fa-google"></i>
            {{ isProcessing ? 'Connexion en cours...' : 'Se connecter avec Gmail' }}
          </button>
          
          <div class="security-info">
            <div class="security-item">
              <i class="fas fa-shield-alt"></i>
              <span>Connexion sécurisée</span>
            </div>
            <div class="security-item">
              <i class="fas fa-eye"></i>
              <span>Lecture seule de vos emails</span>
            </div>
            <div class="security-item">
              <i class="fas fa-lock"></i>
              <span>Vos données restent privées</span>
            </div>
          </div>
        </div>
        
        <!-- État connecté -->
        <div *ngIf="gmailStatus?.connected" class="connected">
          <div class="welcome-back">
            <div class="avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="user-info">
              <h4>Bon retour !</h4>
              <p>{{ gmailStatus?.email }}</p>
              <span class="status-badge" [class.active]="gmailStatus?.token_valid">
                <i class="fas fa-circle"></i>
                {{ gmailStatus?.token_valid ? 'Prêt à analyser' : 'Reconnexion nécessaire' }}
              </span>
            </div>
          </div>
          
          <div class="stats-overview" *ngIf="gmailStatus?.last_sync">
            <div class="stat-item">
              <i class="fas fa-envelope"></i>
              <span>Dernière analyse: {{ formatDate(gmailStatus?.last_sync || '') }}</span>
            </div>
          </div>
        </div>
        
        <!-- Actions simplifiées -->
        <div class="actions">
          <!-- Si connecté et token valide -->
          <div *ngIf="gmailStatus?.connected && gmailStatus?.token_valid" class="main-actions">
            <button 
              class="btn btn-primary btn-large"
              (click)="syncEmails()"
              [disabled]="isProcessing">
              <i class="fas fa-magic" [class.fa-spin]="isProcessing"></i>
              {{ isProcessing ? 'Analyse en cours...' : 'Analyser mes emails' }}
            </button>
            
            <button 
              class="btn btn-outline"
              (click)="disconnectGmail()"
              [disabled]="isProcessing">
              <i class="fas fa-sign-out-alt"></i>
              Se déconnecter
            </button>
          </div>
          
          <!-- Si connecté mais token invalide -->
          <div *ngIf="gmailStatus?.connected && !gmailStatus?.token_valid" class="reconnect-actions">
            <button 
              class="btn btn-primary btn-large"
              (click)="connectGmail()"
              [disabled]="isProcessing">
              <i class="fas fa-refresh"></i>
              {{ isProcessing ? 'Reconnexion...' : 'Reconnecter Gmail' }}
            </button>
            
            <button 
              class="btn btn-outline"
              (click)="disconnectGmail()"
              [disabled]="isProcessing">
              <i class="fas fa-times"></i>
              Annuler
            </button>
          </div>
        </div>
        
        <!-- Messages utilisateur -->
        <div *ngIf="statusMessage" class="user-message" [class]="messageType">
          <i [class]="getMessageIcon()"></i>
          {{ getUserFriendlyMessage(statusMessage) }}
        </div>
        
        <!-- Résultats d'analyse -->
        <div *ngIf="syncResult" class="analysis-result">
          <div class="result-header">
            <i class="fas fa-chart-line"></i>
            <h4>Analyse terminée !</h4>
          </div>
          
          <div class="result-summary">
            <div class="summary-item success" *ngIf="syncResult.synced_emails > 0">
              <span class="number">{{ syncResult.synced_emails }}</span>
              <span class="label">{{ syncResult.synced_emails === 1 ? 'nouveau email analysé' : 'nouveaux emails analysés' }}</span>
            </div>
            
            <div class="summary-item info" *ngIf="syncResult.skipped_emails > 0">
              <span class="number">{{ syncResult.skipped_emails }}</span>
              <span class="label">{{ syncResult.skipped_emails === 1 ? 'email déjà connu' : 'emails déjà connus' }}</span>
            </div>
            
            <div class="summary-item warning" *ngIf="syncResult.errors > 0">
              <span class="number">{{ syncResult.errors }}</span>
              <span class="label">{{ syncResult.errors === 1 ? 'email non analysable' : 'emails non analysables' }}</span>
            </div>
            
            <div class="summary-item neutral" *ngIf="syncResult.synced_emails === 0 && syncResult.skipped_emails === 0">
              <i class="fas fa-check-circle"></i>
              <span class="label">Aucun nouvel email de candidature trouvé</span>
            </div>
          </div>
          
          <div class="next-steps" *ngIf="syncResult.synced_emails > 0">
            <p>
              <i class="fas fa-arrow-right"></i>
              Consultez l'onglet <strong>Candidatures</strong> pour voir les nouveaux suivis détectés
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gmail-connection-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      margin: 20px 0;
      overflow: hidden;
    }
    
    .card-header {
      padding: 32px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
    }
    
    .card-header h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .card-header p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }
    
    .card-body {
      padding: 32px 24px;
    }
    
    /* État non connecté */
    .welcome-message {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .welcome-message i {
      font-size: 48px;
      color: #667eea;
      margin-bottom: 16px;
    }
    
    .welcome-message h4 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: #2c3e50;
    }
    
    .welcome-message p {
      color: #6c757d;
      line-height: 1.6;
      max-width: 500px;
      margin: 0 auto;
    }
    
    .gmail-connect-btn {
      width: 100%;
      max-width: 300px;
      margin: 0 auto 24px auto;
      display: block;
    }
    
    .btn-google {
      background: #db4437;
      border: none;
      color: white;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    
    .btn-google:hover:not(:disabled) {
      background: #c23321;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(219, 68, 55, 0.3);
    }
    
    .btn-google:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .security-info {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    
    .security-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6c757d;
      font-size: 14px;
    }
    
    .security-item i {
      color: #28a745;
    }
    
    /* État connecté */
    .welcome-back {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
    }
    
    .avatar {
      width: 60px;
      height: 60px;
      background: #667eea;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }
    
    .user-info h4 {
      margin: 0 0 4px 0;
      color: #2c3e50;
    }
    
    .user-info p {
      margin: 0 0 8px 0;
      color: #6c757d;
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 16px;
      background: #e9ecef;
      color: #6c757d;
    }
    
    .status-badge.active {
      background: #d4edda;
      color: #155724;
    }
    
    .status-badge i {
      font-size: 8px;
    }
    
    .stats-overview {
      margin-bottom: 24px;
    }
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6c757d;
      font-size: 14px;
    }
    
    /* Actions */
    .actions {
      margin: 24px 0;
    }
    
    .main-actions, .reconnect-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-large {
      padding: 16px 32px;
      font-size: 16px;
    }
    
    .btn-primary {
      background: #667eea;
      color: white;
      padding: 12px 24px;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: #5a6fd8;
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(102, 126, 234, 0.3);
    }
    
    .btn-outline {
      background: transparent;
      color: #6c757d;
      border: 2px solid #dee2e6;
      padding: 10px 22px;
    }
    
    .btn-outline:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #adb5bd;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
    
    /* Messages */
    .user-message {
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .user-message.success {
      background: #d4edda;
      color: #155724;
      border-left: 4px solid #28a745;
    }
    
    .user-message.error {
      background: #f8d7da;
      color: #721c24;
      border-left: 4px solid #dc3545;
    }
    
    .user-message.info {
      background: #d1ecf1;
      color: #0c5460;
      border-left: 4px solid #17a2b8;
    }
    
    /* Résultats d'analyse */
    .analysis-result {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 24px;
      margin-top: 24px;
    }
    
    .result-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .result-header i {
      color: #28a745;
      font-size: 20px;
    }
    
    .result-header h4 {
      margin: 0;
      color: #2c3e50;
    }
    
    .result-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .summary-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: white;
    }
    
    .summary-item.success {
      border-left: 4px solid #28a745;
    }
    
    .summary-item.info {
      border-left: 4px solid #17a2b8;
    }
    
    .summary-item.warning {
      border-left: 4px solid #ffc107;
    }
    
    .summary-item.neutral {
      border-left: 4px solid #6c757d;
    }
    
    .summary-item .number {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      min-width: 40px;
    }
    
    .summary-item .label {
      color: #6c757d;
    }
    
    .next-steps {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .next-steps p {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #495057;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .card-header {
        padding: 24px 16px;
      }
      
      .card-body {
        padding: 24px 16px;
      }
      
      .security-info {
        flex-direction: column;
        gap: 12px;
      }
      
      .welcome-back {
        flex-direction: column;
        text-align: center;
      }
      
      .main-actions, .reconnect-actions {
        flex-direction: column;
      }
      
      .btn-large {
        width: 100%;
      }
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

  getUserFriendlyMessage(message: string): string {
    // Convertir les messages techniques en messages utilisateur
    const messageMap: {[key: string]: string} = {
      'Token invalide': 'Votre connexion Gmail a expiré, veuillez vous reconnecter',
      'Token rafraîchi avec succès': 'Connexion Gmail mise à jour avec succès',
      'Échec du rafraîchissement': 'Problème de connexion, veuillez vous reconnecter',
      'Erreur lors du rafraîchissement': 'Problème de connexion, veuillez vous reconnecter',
      'Synchronisation terminée': 'Analyse de vos emails terminée !',
      'Erreur lors de la synchronisation': 'Impossible d\'analyser vos emails pour le moment',
      'Connexion OK': 'Votre Gmail est bien connecté !',
      'Connexion échouée': 'Problème de connexion avec Gmail'
    };

    // Chercher une correspondance exacte ou partielle
    for (const [tech, friendly] of Object.entries(messageMap)) {
      if (message.includes(tech)) {
        return friendly;
      }
    }

    return message; // Retourner le message original si pas de correspondance
  }

  formatDate(dateString: string): string {
    try {
      if (!dateString) {
        return 'Jamais';
      }
      
      const date = new Date(dateString);
      const now = new Date();
      
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return 'Hier';
      } else if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
      } else {
        return date.toLocaleDateString('fr-FR');
      }
    } catch {
      return 'Date inconnue';
    }
  }

  private clearMessageAfterDelay(): void {
    setTimeout(() => {
      this.statusMessage = '';
      this.messageType = '';
    }, 5000);
  }
}
