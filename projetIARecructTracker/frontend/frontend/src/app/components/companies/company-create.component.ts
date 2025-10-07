import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyService } from '../../services/company.service';
import { CreateCompanyRequest } from '../../models';

@Component({
  selector: 'app-company-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-create">
      <div class="header">
        <h1>🏢 Créer une nouvelle entreprise</h1>
        <button class="btn btn-secondary" (click)="goBack()">← Retour</button>
      </div>

      <div class="form-container">
        <form (ngSubmit)="onSubmit()" #companyForm="ngForm">
          <div class="form-group">
            <label for="name">Nom de l'entreprise *</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="company.name"
              #nameField="ngModel"
              required
              maxlength="255"
              class="form-control"
              placeholder="Ex: Google, Microsoft, Apple..."
            >
            @if (nameField.invalid && nameField.touched) {
              <div class="error-message">Le nom de l'entreprise est requis</div>
            }
          </div>

          <div class="form-group">
            <label for="industry">Secteur d'activité</label>
            <select
              id="industry"
              name="industry"
              [(ngModel)]="company.industry"
              class="form-control"
            >
              <option value="">Sélectionner un secteur</option>
              <option value="technology">Technologie</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Santé</option>
              <option value="education">Éducation</option>
              <option value="retail">Commerce de détail</option>
              <option value="manufacturing">Industrie</option>
              <option value="consulting">Conseil</option>
              <option value="media">Médias</option>
              <option value="automotive">Automobile</option>
              <option value="aerospace">Aérospatiale</option>
              <option value="energy">Énergie</option>
              <option value="telecommunications">Télécommunications</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div class="form-group">
            <label for="size">Taille de l'entreprise</label>
            <select
              id="size"
              name="size"
              [(ngModel)]="company.size"
              class="form-control"
            >
              <option value="">Sélectionner une taille</option>
              <option value="startup">Startup (1-10 employés)</option>
              <option value="small">Petite (11-50 employés)</option>
              <option value="medium">Moyenne (51-250 employés)</option>
              <option value="large">Grande (251-1000 employés)</option>
              <option value="enterprise">Entreprise (1000+ employés)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="website">Site web</label>
            <input
              type="url"
              id="website"
              name="website"
              [(ngModel)]="company.website"
              class="form-control"
              placeholder="https://www.exemple.com"
            >
          </div>

          <div class="form-group">
            <label for="location">Localisation</label>
            <input
              type="text"
              id="location"
              name="location"
              [(ngModel)]="company.location"
              class="form-control"
              placeholder="Paris, France"
            >
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              name="description"
              [(ngModel)]="company.description"
              rows="4"
              class="form-control"
              placeholder="Description de l'entreprise, ses activités, sa culture..."
            ></textarea>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="companyForm.invalid || isSubmitting()"
            >
              @if (isSubmitting()) {
                <span class="spinner">⏳</span> Création en cours...
              } @else {
                🏢 Créer l'entreprise
              }
            </button>
            <button type="button" class="btn btn-secondary" (click)="goBack()">
              Annuler
            </button>
          </div>
        </form>

        @if (errorMessage()) {
          <div class="alert alert-error">
            <strong>Erreur :</strong> {{ errorMessage() }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .company-create {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }

    .header h1 {
      margin: 0;
      color: #333;
      font-size: 2em;
    }

    .form-container {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #555;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .form-control:invalid:not(:focus) {
      border-color: #dc3545;
    }

    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }

    .error-message {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .alert {
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }

    .alert-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    @media (max-width: 768px) {
      .company-create {
        padding: 10px;
      }

      .header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .form-container {
        padding: 20px;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class CompanyCreateComponent {
  company: CreateCompanyRequest = {
    name: '',
    industry: undefined,
    size: undefined,
    website: undefined,
    location: undefined,
    description: undefined
  };

  isSubmitting = signal(false);
  errorMessage = signal('');

  constructor(
    private companyService: CompanyService,
    private router: Router
  ) {}

  onSubmit() {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.companyService.createCompany(this.company).subscribe({
      next: (createdCompany) => {
        console.log('Entreprise créée:', createdCompany);
        this.router.navigate(['/companies']);
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        this.errorMessage.set(
          error.error?.detail || 
          error.message || 
          'Une erreur est survenue lors de la création de l\'entreprise'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/companies']);
  }
}
