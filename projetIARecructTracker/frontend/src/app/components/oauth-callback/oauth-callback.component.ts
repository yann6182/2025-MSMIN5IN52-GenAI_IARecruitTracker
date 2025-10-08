import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GmailOAuthService } from '../../core/services/gmail-oauth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="oauth-callback-container">
      <div class="callback-content">
        <div *ngIf="isLoading" class="loading">
          <div class="spinner"></div>
          <h3>Traitement de l'autorisation Gmail...</h3>
          <p>Veuillez patienter pendant que nous configurons votre connexion.</p>
        </div>
        
        <div *ngIf="!isLoading && success" class="success">
          <div class="success-icon">✅</div>
          <h3>Gmail connecté avec succès !</h3>
          <p>Votre compte <strong>{{ email }}</strong> a été connecté.</p>
          <p>Vous pouvez maintenant synchroniser vos emails automatiquement.</p>
          <button (click)="redirectToApp()" class="btn btn-primary">
            Continuer vers l'application
          </button>
        </div>
        
        <div *ngIf="!isLoading && !success" class="error">
          <div class="error-icon">❌</div>
          <h3>Erreur de connexion Gmail</h3>
          <p>{{ errorMessage }}</p>
          <div class="error-actions">
            <button (click)="retryAuth()" class="btn btn-secondary">
              Réessayer l'autorisation
            </button>
            <button (click)="redirectToApp()" class="btn btn-primary">
              Retourner à l'application
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .oauth-callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .callback-content {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    
    .loading {
      color: #6c757d;
    }
    
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 2s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .success {
      color: #155724;
    }
    
    .success-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }
    
    .error {
      color: #721c24;
    }
    
    .error-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      margin: 8px;
      transition: all 0.3s ease;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #0056b3;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #545b62;
    }
    
    .error-actions {
      margin-top: 20px;
    }
    
    h3 {
      margin-bottom: 16px;
      font-size: 1.5rem;
    }
    
    p {
      margin-bottom: 12px;
      line-height: 1.5;
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  isLoading = true;
  success = false;
  email = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gmailOAuthService: GmailOAuthService
  ) {}

  ngOnInit(): void {
    // Récupérer les paramètres de l'URL
    this.route.queryParams.subscribe(params => {
      const success = params['success'] === 'true';
      const email = params['email'];
      const error = params['error'];

      setTimeout(() => {
        this.isLoading = false;
        
        if (success && email) {
          this.success = true;
          this.email = email;
          
          // Notifier le service OAuth
          this.gmailOAuthService.handleOAuthCallback(true, email);
          
          // Redirection automatique après 3 secondes
          setTimeout(() => {
            this.redirectToApp();
          }, 3000);
          
        } else {
          this.success = false;
          this.errorMessage = this.getErrorMessage(error);
          
          // Notifier le service OAuth de l'erreur
          this.gmailOAuthService.handleOAuthCallback(false, undefined, error);
        }
      }, 1500); // Simule un temps de traitement
    });
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case 'access_denied':
        return 'Autorisation refusée. Vous avez annulé la connexion Gmail.';
      case 'authorization_failed':
        return 'Échec de l\'autorisation. Veuillez réessayer.';
      case 'callback_error':
        return 'Erreur technique lors du traitement. Veuillez réessayer.';
      default:
        return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
    }
  }

  retryAuth(): void {
    this.gmailOAuthService.initiateGmailAuth();
  }

  redirectToApp(): void {
    this.router.navigate(['/dashboard']);
  }
}
