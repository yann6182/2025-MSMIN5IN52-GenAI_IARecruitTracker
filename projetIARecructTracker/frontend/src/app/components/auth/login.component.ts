import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GmailOAuthService } from '../../core/services/gmail-oauth.service';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>🔐 Connexion</h1>
          <p>Connectez-vous à votre compte AI Recruit Tracker</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Email -->
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email"
              formControlName="email"
              class="form-control"
              [class.error]="isFieldInvalid('email')"
              placeholder="votre.email@exemple.com"
              autocomplete="email"
            >
            <div class="error-message" *ngIf="isFieldInvalid('email')">
              <span *ngIf="loginForm.get('email')?.errors?.['required']">L'email est requis</span>
              <span *ngIf="loginForm.get('email')?.errors?.['email']">Format d'email invalide</span>
            </div>
          </div>

          <!-- Mot de passe -->
          <div class="form-group">
            <label for="password">Mot de passe</label>
            <div class="password-input">
              <input 
                [type]="showPassword ? 'text' : 'password'"
                id="password"
                formControlName="password"
                class="form-control"
                [class.error]="isFieldInvalid('password')"
                placeholder="Votre mot de passe"
                autocomplete="current-password"
              >
              <button 
                type="button" 
                class="password-toggle"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                <span>{{ showPassword ? '👁️' : '👁️‍🗨️' }}</span>
              </button>
            </div>
            <div class="error-message" *ngIf="isFieldInvalid('password')">
              <span *ngIf="loginForm.get('password')?.errors?.['required']">Le mot de passe est requis</span>
              <span *ngIf="loginForm.get('password')?.errors?.['minlength']">
                Le mot de passe doit contenir au moins 6 caractères
              </span>
            </div>
          </div>

          <!-- Se souvenir de moi -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                formControlName="rememberMe"
                class="checkbox"
              >
              <span class="checkmark"></span>
              Se souvenir de moi
            </label>
          </div>

          <!-- Messages d'erreur globaux -->
          <div class="error-message global-error" *ngIf="errorMessage">
            <span>⚠️ {{ errorMessage }}</span>
          </div>

          <!-- Messages de succès -->
          <div class="success-message" *ngIf="successMessage">
            <span>✅ {{ successMessage }}</span>
          </div>

          <!-- Bouton de connexion -->
          <button 
            type="submit" 
            class="btn btn-primary btn-full"
            [disabled]="loginForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading">🚀 Se connecter</span>
            <span *ngIf="isLoading" class="loading-spinner">
              <span class="spinner"></span> Connexion en cours...
            </span>
          </button>
        </form>

        <!-- Séparateur -->
        <div class="auth-divider">
          <span>ou</span>
        </div>

        <!-- Connexion Gmail -->
        <div class="gmail-auth-section">
          <button 
            type="button"
            class="btn btn-gmail"
            (click)="loginWithGmail()"
            [disabled]="isLoading"
          >
            <i class="fab fa-google"></i>
            <span>Se connecter avec Gmail</span>
          </button>
          <p class="gmail-info">
            <i class="fas fa-info-circle"></i>
            Créez un compte automatiquement et analysez vos emails de candidature
          </p>
        </div>

        <!-- Liens additionnels -->
        <div class="auth-links">
          <a routerLink="/auth/forgot-password" class="link">
            🔑 Mot de passe oublié ?
          </a>
          
          <div class="divider">
            <span>ou</span>
          </div>
          
          <p class="signup-link">
            Pas encore de compte ? 
            <a routerLink="/auth/register" class="link-primary">
              📝 Créer un compte
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .auth-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 420px;
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .auth-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .auth-header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      color: #333;
      font-weight: 700;
    }

    .auth-header p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .auth-form {
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-control.error {
      border-color: #e74c3c;
      background-color: #fdf2f2;
    }

    .password-input {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .password-toggle:hover {
      background-color: #f8f9fa;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 14px;
      color: #555;
      margin: 0;
    }

    .checkbox {
      margin-right: 8px;
    }

    .error-message {
      color: #e74c3c;
      font-size: 13px;
      margin-top: 4px;
      display: block;
    }

    .error-message.global-error {
      background: #fdf2f2;
      border: 1px solid #e74c3c;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
      text-align: center;
    }

    .success-message {
      background: #f0f9f0;
      border: 1px solid #27ae60;
      color: #27ae60;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
      text-align: center;
      font-size: 14px;
    }

    .btn {
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-full {
      width: 100%;
    }

    /* Séparateur */
    .auth-divider {
      margin: 24px 0;
      text-align: center;
      position: relative;
    }

    .auth-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e1e5e9;
    }

    .auth-divider span {
      background: white;
      padding: 0 16px;
      color: #6c757d;
      font-size: 14px;
    }

    /* Section Gmail */
    .gmail-auth-section {
      margin: 24px 0;
    }

    .btn-gmail {
      width: 100%;
      background: #db4437;
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .btn-gmail:hover:not(:disabled) {
      background: #c23321;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(219, 68, 55, 0.3);
    }

    .btn-gmail:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-gmail i {
      font-size: 18px;
    }

    .gmail-info {
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .gmail-info i {
      color: #17a2b8;
    }

    .loading-spinner {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .auth-links {
      text-align: center;
    }

    .divider {
      margin: 20px 0;
      position: relative;
      text-align: center;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e1e5e9;
    }

    .divider span {
      background: white;
      padding: 0 16px;
      color: #666;
      font-size: 14px;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;
    }

    .link:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    .link-primary {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }

    .link-primary:hover {
      color: #764ba2;
    }

    .signup-link {
      margin: 16px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .auth-container {
        padding: 16px;
      }
      
      .auth-card {
        padding: 24px;
      }
      
      .auth-header h1 {
        font-size: 24px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '/dashboard';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private gmailOAuthService: GmailOAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Récupérer l'URL de retour depuis les paramètres de requête
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Vérifier si l'utilisateur est déjà connecté
    if (this.authService.isAuthenticated) {
      this.router.navigate([this.returnUrl]);
    }

    // Vérifier les messages dans les paramètres de requête
    const message = this.route.snapshot.queryParams['message'];
    if (message === 'registration_success') {
      this.successMessage = 'Inscription réussie ! Veuillez vous connecter.';
    } else if (message === 'email_verified') {
      this.successMessage = 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.';
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const loginData: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = `Bienvenue ${response.user.full_name} !`;
          
          // Rediriger après un court délai pour montrer le message de succès
          setTimeout(() => {
            this.router.navigate([this.returnUrl]);
          }, 1000);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Erreur de connexion';
          
          // Nettoyer l'erreur après 5 secondes
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loginWithGmail(): void {
    // Utiliser le service Gmail OAuth pour l'inscription/connexion automatique
    this.gmailOAuthService.initiateGmailAuthAndRegister();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
