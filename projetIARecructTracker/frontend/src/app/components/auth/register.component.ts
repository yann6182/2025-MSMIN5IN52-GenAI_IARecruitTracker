import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GmailOAuthService } from '../../core/services/gmail-oauth.service';
import { RegisterRequest } from '../../models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>📝 Inscription</h1>
          <p>Créez votre compte AI Recruit Tracker</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Nom complet -->
          <div class="form-group">
            <label for="fullName">Nom complet</label>
            <input 
              type="text" 
              id="fullName"
              formControlName="fullName"
              class="form-control"
              [class.error]="isFieldInvalid('fullName')"
              placeholder="Jean Dupont"
              autocomplete="name"
            >
            <div class="error-message" *ngIf="isFieldInvalid('fullName')">
              <span *ngIf="registerForm.get('fullName')?.errors?.['required']">Le nom complet est requis</span>
              <span *ngIf="registerForm.get('fullName')?.errors?.['minlength']">
                Le nom doit contenir au moins 2 caractères
              </span>
            </div>
          </div>

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
              <span *ngIf="registerForm.get('email')?.errors?.['required']">L'email est requis</span>
              <span *ngIf="registerForm.get('email')?.errors?.['email']">Format d'email invalide</span>
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
                placeholder="Choisissez un mot de passe sécurisé"
                autocomplete="new-password"
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
            <div class="password-requirements">
              <div class="requirement" [class.valid]="hasMinLength">
                {{ hasMinLength ? '✅' : '❌' }} Au moins 8 caractères
              </div>
              <div class="requirement" [class.valid]="hasUpperCase">
                {{ hasUpperCase ? '✅' : '❌' }} Une lettre majuscule
              </div>
              <div class="requirement" [class.valid]="hasLowerCase">
                {{ hasLowerCase ? '✅' : '❌' }} Une lettre minuscule
              </div>
              <div class="requirement" [class.valid]="hasNumber">
                {{ hasNumber ? '✅' : '❌' }} Un chiffre
              </div>
            </div>
            <div class="error-message" *ngIf="isFieldInvalid('password')">
              <span *ngIf="registerForm.get('password')?.errors?.['required']">Le mot de passe est requis</span>
              <span *ngIf="registerForm.get('password')?.errors?.['pattern']">
                Le mot de passe ne respecte pas les critères de sécurité
              </span>
            </div>
          </div>

          <!-- Confirmation du mot de passe -->
          <div class="form-group">
            <label for="confirmPassword">Confirmer le mot de passe</label>
            <div class="password-input">
              <input 
                [type]="showConfirmPassword ? 'text' : 'password'"
                id="confirmPassword"
                formControlName="confirmPassword"
                class="form-control"
                [class.error]="isFieldInvalid('confirmPassword')"
                placeholder="Confirmer votre mot de passe"
                autocomplete="new-password"
              >
              <button 
                type="button" 
                class="password-toggle"
                (click)="toggleConfirmPasswordVisibility()"
              >
                <span>{{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}</span>
              </button>
            </div>
            <div class="error-message" *ngIf="isFieldInvalid('confirmPassword')">
              <span *ngIf="registerForm.get('confirmPassword')?.errors?.['required']">
                La confirmation du mot de passe est requise
              </span>
              <span *ngIf="registerForm.errors?.['passwordMismatch']">
                Les mots de passe ne correspondent pas
              </span>
            </div>
          </div>

          <!-- Conditions d'utilisation -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                formControlName="acceptTerms"
                class="checkbox"
              >
              <span class="checkmark"></span>
              J'accepte les 
              <a href="/terms" target="_blank" class="link">conditions d'utilisation</a>
              et la 
              <a href="/privacy" target="_blank" class="link">politique de confidentialité</a>
            </label>
            <div class="error-message" *ngIf="isFieldInvalid('acceptTerms')">
              <span>Vous devez accepter les conditions d'utilisation</span>
            </div>
          </div>

          <!-- Newsletter -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                formControlName="newsletter"
                class="checkbox"
              >
              <span class="checkmark"></span>
              Recevoir les actualités et conseils par email (optionnel)
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

          <!-- Bouton d'inscription -->
          <button 
            type="submit" 
            class="btn btn-primary btn-full"
            [disabled]="registerForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading">🚀 Créer mon compte</span>
            <span *ngIf="isLoading" class="loading-spinner">
              <span class="spinner"></span> Création du compte...
            </span>
          </button>
        </form>

        <!-- Liens additionnels -->
        <div class="auth-links">
          <p class="login-link">
            Déjà un compte ? 
            <a routerLink="/auth/login" class="link-primary">
              🔐 Se connecter
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
      max-width: 480px;
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

    .password-requirements {
      margin-top: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 12px;
    }

    .requirement {
      margin-bottom: 4px;
      color: #666;
      transition: color 0.2s;
    }

    .requirement.valid {
      color: #27ae60;
    }

    .requirement:last-child {
      margin-bottom: 0;
    }

    .checkbox-group {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      cursor: pointer;
      font-size: 14px;
      color: #555;
      margin: 0;
      line-height: 1.4;
    }

    .checkbox {
      margin-right: 8px;
      margin-top: 2px;
      flex-shrink: 0;
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

    .link {
      color: #667eea;
      text-decoration: none;
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

    .login-link {
      margin: 0;
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
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';

  // Validation du mot de passe
  get hasMinLength(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return password.length >= 8;
  }

  get hasUpperCase(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[A-Z]/.test(password);
  }

  get hasLowerCase(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[a-z]/.test(password);
  }

  get hasNumber(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /\d/.test(password);
  }

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
      newsletter: [false]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est déjà connecté
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const registerData: RegisterRequest = {
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        full_name: this.registerForm.value.fullName
      };

      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = `Compte créé avec succès ! Bienvenue ${response.user.full_name} !`;
          
          // Rediriger vers le dashboard après un court délai
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Erreur lors de la création du compte';
          
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

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
}
