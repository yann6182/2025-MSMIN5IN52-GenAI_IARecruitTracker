import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GmailOAuthService } from '../../../core/services/gmail-oauth.service';

@Component({
  selector: 'app-gmail-auth-welcome',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="welcome-container">
      <div class="hero-section">
        <div class="hero-content">
          <div class="logo-section">
            <i class="fas fa-robot"></i>
            <h1>AI Recruit Tracker</h1>
          </div>
          
          <div class="value-proposition">
            <h2>Suivez vos candidatures automatiquement</h2>
            <p class="subtitle">
              Connectez votre Gmail et laissez l'IA analyser vos emails pour détecter 
              automatiquement les réponses aux candidatures, invitations d'entretien et opportunités.
            </p>
          </div>

          <div class="auth-section">
            <div *ngIf="!isAuthenticated" class="login-prompt">
              <h3>Commencez dès maintenant</h3>
              <p>Une seule étape suffit pour commencer</p>
              
              <button 
                class="btn-gmail-auth"
                (click)="authenticateWithGmail()"
                [disabled]="isProcessing">
                <i class="fab fa-google"></i>
                <span>{{ isProcessing ? 'Connexion...' : 'Se connecter avec Gmail' }}</span>
              </button>
              
              <div class="benefits">
                <div class="benefit-item">
                  <i class="fas fa-magic"></i>
                  <span>Détection automatique des candidatures</span>
                </div>
                <div class="benefit-item">
                  <i class="fas fa-calendar-check"></i>
                  <span>Suivi des entretiens</span>
                </div>
                <div class="benefit-item">
                  <i class="fas fa-chart-line"></i>
                  <span>Statistiques de vos candidatures</span>
                </div>
              </div>
            </div>

            <div *ngIf="isAuthenticated" class="welcome-back">
              <div class="user-welcome">
                <i class="fas fa-check-circle"></i>
                <h3>Bon retour !</h3>
                <p>Votre compte est connecté et prêt à analyser vos emails</p>
              </div>
              
              <div class="quick-actions">
                <button 
                  class="btn-primary"
                  (click)="goToDashboard()">
                  <i class="fas fa-tachometer-alt"></i>
                  Accéder au tableau de bord
                </button>
                
                <button 
                  class="btn-secondary"
                  (click)="analyzeEmails()"
                  [disabled]="isProcessing">
                  <i class="fas fa-sync-alt" [class.fa-spin]="isProcessing"></i>
                  {{ isProcessing ? 'Analyse...' : 'Analyser les emails' }}
                </button>
              </div>
            </div>
          </div>

          <div class="security-assurance">
            <h4>Votre sécurité, notre priorité</h4>
            <div class="security-points">
              <div class="security-point">
                <i class="fas fa-shield-alt"></i>
                <span>Connexion sécurisée OAuth 2.0</span>
              </div>
              <div class="security-point">
                <i class="fas fa-eye-slash"></i>
                <span>Accès lecture seule à vos emails</span>
              </div>
              <div class="security-point">
                <i class="fas fa-server"></i>
                <span>Données stockées localement</span>
              </div>
              <div class="security-point">
                <i class="fas fa-user-shield"></i>
                <span>Respect de votre vie privée</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages d'état -->
      <div *ngIf="statusMessage" class="status-message" [class]="messageType">
        <i [class]="getMessageIcon()"></i>
        <span>{{ statusMessage }}</span>
      </div>
    </div>
  `,
  styles: [`
    .welcome-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
    }

    .hero-section {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      max-width: 600px;
      width: 100%;
      overflow: hidden;
    }

    .hero-content {
      padding: 48px 40px;
      text-align: center;
    }

    .logo-section {
      margin-bottom: 32px;
    }

    .logo-section i {
      font-size: 64px;
      color: #667eea;
      margin-bottom: 16px;
      display: block;
    }

    .logo-section h1 {
      font-size: 32px;
      margin: 0;
      color: #2c3e50;
      font-weight: 700;
    }

    .value-proposition {
      margin-bottom: 40px;
    }

    .value-proposition h2 {
      font-size: 28px;
      margin: 0 0 16px 0;
      color: #2c3e50;
      font-weight: 600;
    }

    .subtitle {
      font-size: 18px;
      color: #6c757d;
      line-height: 1.6;
      margin: 0;
    }

    .auth-section {
      margin-bottom: 40px;
    }

    .login-prompt h3 {
      font-size: 24px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .login-prompt p {
      color: #6c757d;
      margin: 0 0 32px 0;
      font-size: 16px;
    }

    .btn-gmail-auth {
      background: #db4437;
      border: none;
      color: white;
      padding: 20px 40px;
      font-size: 18px;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
      min-width: 280px;
    }

    .btn-gmail-auth:hover:not(:disabled) {
      background: #c23321;
      transform: translateY(-3px);
      box-shadow: 0 12px 24px rgba(219, 68, 55, 0.4);
    }

    .btn-gmail-auth:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .benefits {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 400px;
      margin: 0 auto;
    }

    .benefit-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #495057;
      font-size: 16px;
    }

    .benefit-item i {
      color: #28a745;
      font-size: 18px;
      width: 20px;
    }

    .welcome-back {
      text-align: center;
    }

    .user-welcome {
      margin-bottom: 32px;
    }

    .user-welcome i {
      font-size: 48px;
      color: #28a745;
      margin-bottom: 16px;
      display: block;
    }

    .user-welcome h3 {
      font-size: 24px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .user-welcome p {
      color: #6c757d;
      margin: 0;
      font-size: 16px;
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }

    .btn-primary, .btn-secondary {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      font-size: 16px;
      min-width: 250px;
      justify-content: center;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a6fd8;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #495057;
      border: 2px solid #dee2e6;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e9ecef;
      border-color: #adb5bd;
    }

    .btn-primary:disabled, .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .security-assurance {
      border-top: 1px solid #e9ecef;
      padding-top: 32px;
    }

    .security-assurance h4 {
      font-size: 18px;
      margin: 0 0 24px 0;
      color: #2c3e50;
    }

    .security-points {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .security-point {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6c757d;
      font-size: 14px;
    }

    .security-point i {
      color: #28a745;
      font-size: 16px;
      width: 16px;
    }

    .status-message {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 16px 24px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
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

    /* Responsive */
    @media (max-width: 768px) {
      .welcome-container {
        padding: 12px;
      }

      .hero-content {
        padding: 32px 24px;
      }

      .logo-section i {
        font-size: 48px;
      }

      .logo-section h1 {
        font-size: 24px;
      }

      .value-proposition h2 {
        font-size: 22px;
      }

      .subtitle {
        font-size: 16px;
      }

      .btn-gmail-auth {
        width: 100%;
        min-width: auto;
      }

      .security-points {
        grid-template-columns: 1fr;
      }

      .quick-actions {
        width: 100%;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
        min-width: auto;
      }
    }
  `]
})
export class GmailAuthWelcomeComponent implements OnInit {
  isAuthenticated = false;
  isProcessing = false;
  statusMessage = '';
  messageType = '';

  constructor(
    private authService: AuthService,
    private gmailOAuthService: GmailOAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Vérifier l'état d'authentification
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  authenticateWithGmail(): void {
    this.isProcessing = true;
    this.statusMessage = 'Redirection vers Google...';
    this.messageType = 'info';

    // Si l'utilisateur n'est pas encore authentifié, démarrer le processus OAuth
    // qui créera automatiquement un compte
    setTimeout(() => {
      this.gmailOAuthService.initiateGmailAuth();
    }, 1500);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  analyzeEmails(): void {
    this.isProcessing = true;
    this.statusMessage = 'Analyse de vos emails en cours...';
    this.messageType = 'info';

    this.gmailOAuthService.syncEmailsFromGmail(100, 30).subscribe({
      next: (result) => {
        this.isProcessing = false;
        if (result.success) {
          this.statusMessage = `Analyse terminée ! ${result.synced_emails} nouveaux emails traités`;
          this.messageType = 'success';
          
          // Rediriger vers le dashboard après l'analyse
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        } else {
          this.statusMessage = 'Erreur lors de l\'analyse des emails';
          this.messageType = 'error';
        }
        this.clearMessageAfterDelay();
      },
      error: (error) => {
        this.isProcessing = false;
        this.statusMessage = 'Impossible d\'analyser vos emails pour le moment';
        this.messageType = 'error';
        this.clearMessageAfterDelay();
        console.error('Erreur analyse emails:', error);
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
