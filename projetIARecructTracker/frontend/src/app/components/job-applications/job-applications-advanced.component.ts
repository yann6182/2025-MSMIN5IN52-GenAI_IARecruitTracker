import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobApplicationService } from '../../services/job-application.service';
import { EmailService } from '../../services/email.service';
import { CompanyService } from '../../services/company.service';
import { JobApplication, CreateJobApplicationRequest } from '../../models/job-application.model';
import { Company } from '../../models/company.model';
import { Email } from '../../models/email.model';

@Component({
  selector: 'app-job-applications-advanced',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="applications-container">
      <div class="page-header">
        <div class="header-content">
          <h1>📄 Gestion des Candidatures</h1>
          <p>Suivi intelligent de vos candidatures avec intégration IA</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="showCreateForm.set(!showCreateForm())">
            {{ showCreateForm() ? '❌ Annuler' : '➕ Nouvelle Candidature' }}
          </button>
          <button class="btn btn-secondary" (click)="refreshApplications()">🔄 Actualiser</button>
        </div>
      </div>

      <!-- Formulaire de création -->
      @if (showCreateForm()) {
        <div class="create-form-section">
          <div class="form-card">
            <h2>✨ Nouvelle Candidature</h2>
            <form (ngSubmit)="createApplication()" #createForm="ngForm">
              <div class="form-grid">
                <div class="form-group">
                  <label>ID Offre d'emploi *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newApplication.job_offer_id" 
                    name="job_offer_id" 
                    required
                    placeholder="ex: job-offer-123"
                    class="form-control">
                </div>

                <div class="form-group">
                  <label>Priorité</label>
                  <select [(ngModel)]="newApplication.priority" name="priority" class="form-control">
                    <option value="LOW">🟢 Faible</option>
                    <option value="MEDIUM">🟡 Moyenne</option>
                    <option value="HIGH">🔴 Haute</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Statut</label>
                  <select [(ngModel)]="newApplication.status" name="status" class="form-control">
                    <option value="APPLIED">📤 Candidature envoyée</option>
                    <option value="ACKNOWLEDGED">✅ Accusé de réception</option>
                    <option value="SCREENING">🔍 Sélection</option>
                    <option value="INTERVIEW">💼 Entretien programmé</option>
                    <option value="TECHNICAL_TEST">🧪 Test technique</option>
                    <option value="OFFER">💰 Offre reçue</option>
                    <option value="REJECTED">❌ Refusée</option>
                    <option value="ACCEPTED">🎉 Acceptée</option>
                    <option value="WITHDRAWN">🚫 Retirée</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Date de candidature</label>
                  <input 
                    type="date" 
                    [(ngModel)]="newApplication.applied_date" 
                    name="applied_date" 
                    class="form-control">
                </div>

                <div class="form-group full-width">
                  <label>Source</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newApplication.source" 
                    name="source" 
                    placeholder="ex: LinkedIn, Indeed..."
                    class="form-control">
                </div>

                <div class="form-group full-width">
                  <label>Notes</label>
                  <textarea 
                    [(ngModel)]="newApplication.notes" 
                    name="notes" 
                    rows="3"
                    placeholder="Informations complémentaires..."
                    class="form-control"></textarea>
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-success" [disabled]="!createForm.valid">
                  ✅ Créer la candidature
                </button>
                <button type="button" class="btn btn-outline" (click)="resetForm()">
                  🔄 Réinitialiser
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Filtres et recherche -->
      <div class="filters-section">
        <div class="filters-card">
          <div class="filters-grid">
            <div class="filter-group">
              <label>🔍 Recherche</label>
              <input 
                type="text" 
                [(ngModel)]="searchTerm" 
                placeholder="Rechercher par titre, entreprise..."
                class="form-control"
                (input)="applyFilters()">
            </div>

            <div class="filter-group">
              <label>📊 Statut</label>
              <select [(ngModel)]="statusFilter" (change)="applyFilters()" class="form-control">
                <option value="">Tous les statuts</option>
                <option value="APPLIED">Candidature envoyée</option>
                <option value="ACKNOWLEDGED">Accusé de réception</option>
                <option value="SCREENING">Sélection</option>
                <option value="INTERVIEW">Entretien</option>
                <option value="TECHNICAL_TEST">Test technique</option>
                <option value="OFFER">Offre reçue</option>
                <option value="REJECTED">Refusée</option>
                <option value="ACCEPTED">Acceptée</option>
                <option value="WITHDRAWN">Retirée</option>
              </select>
            </div>

            <div class="filter-group">
              <label>⭐ Priorité</label>
              <select [(ngModel)]="priorityFilter" (change)="applyFilters()" class="form-control">
                <option value="">Toutes les priorités</option>
                <option value="HIGH">🔴 Haute</option>
                <option value="MEDIUM">🟡 Moyenne</option>
                <option value="LOW">🟢 Faible</option>
              </select>
            </div>

            <div class="filter-group">
              <label>🤖 IA Liée</label>
              <select [(ngModel)]="aiLinkedFilter" (change)="applyFilters()" class="form-control">
                <option value="">Toutes</option>
                <option value="true">Avec emails IA</option>
                <option value="false">Sans emails IA</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques rapides -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">{{ getApplicationsStats().total }}</div>
            <div class="stat-label">Total candidatures</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ getApplicationsStats().pending }}</div>
            <div class="stat-label">En cours</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ getApplicationsStats().interviews }}</div>
            <div class="stat-label">Entretiens</div>
          </div>
          <div class="stat-item success">
            <div class="stat-number">{{ getApplicationsStats().accepted }}</div>
            <div class="stat-label">Acceptées</div>
          </div>
          <div class="stat-item ai-linked">
            <div class="stat-number">{{ getApplicationsStats().aiLinked }}</div>
            <div class="stat-label">Avec IA</div>
          </div>
        </div>
      </div>

      <!-- Liste des candidatures -->
      <div class="applications-list">
        @if (isLoading()) {
          <div class="loading-card">
            <div class="loading-spinner"></div>
            <p>Chargement des candidatures...</p>
          </div>
        } @else if (filteredApplications().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <h3>Aucune candidature trouvée</h3>
            <p>
              @if (hasActiveFilters()) {
                Essayez de modifier vos filtres de recherche
              } @else {
                Commencez par créer votre première candidature
              }
            </p>
            @if (!hasActiveFilters()) {
              <button class="btn btn-primary" (click)="showCreateForm.set(true)">
                ➕ Créer une candidature
              </button>
            }
          </div>
        } @else {
          @for (application of filteredApplications(); track application.id) {
            <div class="application-card" [class]="'status-' + application.status.toLowerCase()">
              <div class="card-header">
                <div class="card-title-section">
                  <h3 class="job-title">Offre: {{ application.job_offer_id }}</h3>
                  <div class="company-info">
                    @if (application.contact_person) {
                      <span class="company-name">👤 {{ application.contact_person }}</span>
                    } @else if (application.source) {
                      <span class="company-name">📍 {{ application.source }}</span>
                    } @else {
                      <span class="company-name">💼 Candidature</span>
                    }
                  </div>
                </div>
                <div class="card-actions">
                  <span class="status-badge" [class]="'badge-' + application.status.toLowerCase()">
                    {{ getStatusLabel(application.status) }}
                  </span>
                  <div class="action-buttons">
                    <button class="btn-icon" (click)="toggleApplicationDetails(application.id)" 
                            [title]="expandedApplications().has(application.id) ? 'Réduire' : 'Développer'">
                      {{ expandedApplications().has(application.id) ? '🔼' : '🔽' }}
                    </button>
                    <button class="btn-icon" (click)="editApplication(application)" title="Modifier">✏️</button>
                    <button class="btn-icon danger" (click)="deleteApplication(application.id)" title="Supprimer">🗑️</button>
                  </div>
                </div>
              </div>

              <div class="card-meta">
                <div class="meta-item">
                  📅 Candidature: {{ formatDate(application.applied_date) }}
                </div>
                @if (application.last_update_date) {
                  <div class="meta-item">
                    🔄 Mis à jour: {{ formatDate(application.last_update_date) }}
                  </div>
                }
                @if (application.priority) {
                  <div class="meta-item priority-{{ application.priority.toLowerCase() }}">
                    {{ getPriorityIcon(application.priority) }} {{ application.priority }}
                  </div>
                }
                @if (getEmailCount(application.id) > 0) {
                  <div class="meta-item ai-info">
                    🤖 {{ getEmailCount(application.id) }} email(s) IA liés
                  </div>
                }
              </div>

              @if (expandedApplications().has(application.id)) {
                <div class="card-details">
                  @if (application.expected_salary) {
                    <div class="detail-section">
                      <strong>� Salaire espéré:</strong>
                      <span>{{ application.expected_salary }}€</span>
                    </div>
                  }

                  @if (application.contact_person) {
                    <div class="detail-section">
                      <strong>👤 Contact:</strong>
                      <span>{{ application.contact_person }}</span>
                      @if (application.contact_email) {
                        <span> - {{ application.contact_email }}</span>
                      }
                    </div>
                  }

                  @if (application.interview_date) {
                    <div class="detail-section">
                      <strong>📅 Date d'entretien:</strong>
                      <span>{{ formatDate(application.interview_date) }}</span>
                    </div>
                  }

                  @if (application.offer_amount) {
                    <div class="detail-section">
                      <strong>💼 Offre reçue:</strong>
                      <span>{{ application.offer_amount }}€</span>
                      @if (application.offer_deadline) {
                        <span> - Délai: {{ formatDate(application.offer_deadline) }}</span>
                      }
                    </div>
                  }

                  @if (application.rejection_reason) {
                    <div class="detail-section">
                      <strong>❌ Raison du refus:</strong>
                      <span>{{ application.rejection_reason }}</span>
                    </div>
                  }

                  @if (application.notes) {
                    <div class="detail-section">
                      <strong>📝 Notes:</strong>
                      <p class="notes-text">{{ application.notes }}</p>
                    </div>
                  }

                  <!-- Emails liés par IA -->
                  @if (getLinkedEmails(application.id).length > 0) {
                    <div class="detail-section">
                      <strong>📧 Emails liés par IA ({{ getLinkedEmails(application.id).length }}):</strong>
                      <div class="linked-emails">
                        @for (email of getLinkedEmails(application.id); track email.id) {
                          <div class="linked-email">
                            <div class="email-header">
                              <span class="email-subject">{{ email.subject }}</span>
                              <span class="email-type" [class]="'type-' + email.classification?.toLowerCase()">
                                {{ getEmailTypeLabel(email.classification) }}
                              </span>
                            </div>
                            <div class="email-meta">
                              <span>De: {{ email.sender || 'Expéditeur inconnu' }}</span>
                              <span>{{ formatDate(email.sent_at) }}</span>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <div class="detail-actions">
                    <button class="btn btn-sm btn-primary" routerLink="/emails" 
                            [queryParams]="{application_id: application.id}">
                      📧 Voir emails liés
                    </button>
                    <button class="btn btn-sm btn-secondary" (click)="duplicateApplication(application)">
                      📋 Dupliquer
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .applications-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header-content h1 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 2.2em;
    }

    .header-content p {
      margin: 0;
      color: #666;
      font-size: 1.1em;
    }

    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-primary { background: #2196F3; color: white; }
    .btn-secondary { background: #757575; color: white; }
    .btn-success { background: #4CAF50; color: white; }
    .btn-outline { background: white; color: #333; border: 1px solid #ddd; }
    .btn-sm { padding: 6px 12px; font-size: 14px; }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .create-form-section, .filters-section {
      margin-bottom: 25px;
    }

    .form-card, .filters-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .form-card h2 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .form-grid, .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .form-group, .filter-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label, .filter-group label {
      margin-bottom: 6px;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
    }

    .form-actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .stats-section {
      margin-bottom: 25px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }

    .stat-item {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #2196F3;
    }

    .stat-item.success {
      border-left-color: #4CAF50;
    }

    .stat-item.ai-linked {
      border-left-color: #9C27B0;
    }

    .stat-number {
      font-size: 2em;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .stat-label {
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .applications-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .loading-card, .empty-state {
      background: white;
      padding: 60px 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2196F3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 4em;
      margin-bottom: 20px;
    }

    .application-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .application-card:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    .application-card.status-accepted {
      border-left: 4px solid #4CAF50;
    }

    .application-card.status-interview {
      border-left: 4px solid #FF9800;
    }

    .application-card.status-rejected {
      border-left: 4px solid #f44336;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 25px 15px;
      gap: 20px;
      flex-wrap: wrap;
    }

    .job-title {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 1.3em;
    }

    .company-name {
      color: #666;
      font-size: 14px;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .badge-pending { background: #fff3e0; color: #f57c00; }
    .badge-applied { background: #e3f2fd; color: #1976d2; }
    .badge-acknowledged { background: #e8f5e8; color: #388e3c; }
    .badge-interview { background: #fff3e0; color: #f57c00; }
    .badge-rejected { background: #ffebee; color: #d32f2f; }
    .badge-accepted { background: #e8f5e8; color: #388e3c; }

    .action-buttons {
      display: flex;
      gap: 5px;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      border: none;
      background: #f5f5f5;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }

    .btn-icon:hover {
      background: #e0e0e0;
    }

    .btn-icon.danger:hover {
      background: #ffebee;
      color: #d32f2f;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      padding: 0 25px 15px;
      font-size: 14px;
      color: #666;
    }

    .meta-item.ai-info {
      color: #9C27B0;
      font-weight: 500;
    }

    .card-details {
      padding: 20px 25px;
      border-top: 1px solid #f0f0f0;
      background: #fafafa;
    }

    .detail-section {
      margin-bottom: 20px;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-section strong {
      display: block;
      margin-bottom: 8px;
      color: #333;
    }

    .job-link {
      color: #2196F3;
      text-decoration: none;
      word-break: break-all;
    }

    .notes-text {
      margin: 0;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .linked-emails {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .linked-email {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #2196F3;
    }

    .email-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      gap: 10px;
      flex-wrap: wrap;
    }

    .email-subject {
      font-weight: 500;
      color: #333;
      flex: 1;
    }

    .email-type {
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .type-ack { background: #e3f2fd; color: #1976d2; }
    .type-rejected { background: #ffebee; color: #d32f2f; }
    .type-interview { background: #e8f5e8; color: #388e3c; }
    .type-offer { background: #e0f2f1; color: #00796b; }

    .email-meta {
      display: flex;
      gap: 15px;
      font-size: 12px;
      color: #666;
      flex-wrap: wrap;
    }

    .confidence {
      color: #9C27B0;
      font-weight: 500;
    }

    .detail-actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    @media (max-width: 768px) {
      .applications-container {
        padding: 15px;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        justify-content: stretch;
      }

      .header-actions .btn {
        flex: 1;
        justify-content: center;
      }

      .form-grid, .filters-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .card-header {
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
      }

      .card-actions {
        justify-content: space-between;
      }
    }
  `]
})
export class JobApplicationsAdvancedComponent implements OnInit {
  applications = signal<JobApplication[]>([]);
  companies = signal<Company[]>([]);
  emails = signal<Email[]>([]);
  filteredApplications = signal<JobApplication[]>([]);
  isLoading = signal(true);
  showCreateForm = signal(false);
  expandedApplications = signal(new Set<string>());

  // Filtres
  searchTerm = '';
  statusFilter = '';
  priorityFilter = '';
  aiLinkedFilter = '';

  // Nouveau formulaire
  newApplication: CreateJobApplicationRequest = {
    job_offer_id: '',
    job_title: '',
    company_name: '',
    status: 'APPLIED',
    applied_date: new Date().toISOString().split('T')[0],
    priority: 'MEDIUM',
    source: '',
    notes: ''
  };

  constructor(
    private jobApplicationService: JobApplicationService,
    private emailService: EmailService,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.isLoading.set(true);

    // Charger toutes les données en parallèle
    Promise.all([
      this.loadApplications(),
      this.loadCompanies(),
      this.loadEmails()
    ]).finally(() => {
      this.isLoading.set(false);
      this.applyFilters();
    });
  }

  private loadApplications(): Promise<void> {
    return new Promise((resolve) => {
      this.jobApplicationService.getJobApplications().subscribe({
        next: (response) => {
          // Gérer les réponses paginées
          if (response && 'items' in response) {
            this.applications.set(response.items);
          } else {
            this.applications.set(response as JobApplication[]);
          }
          resolve();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des candidatures:', error);
          // Données de démonstration
          this.applications.set(this.getMockApplications());
          resolve();
        }
      });
    });
  }

  private loadCompanies(): Promise<void> {
    return new Promise((resolve) => {
      this.companyService.getCompanies().subscribe({
        next: (response) => {
          // Gérer les réponses paginées
          if (response && 'items' in response) {
            this.companies.set(response.items);
          } else {
            this.companies.set(response as Company[]);
          }
          resolve();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des entreprises:', error);
          this.companies.set(this.getMockCompanies());
          resolve();
        }
      });
    });
  }

  private loadEmails(): Promise<void> {
    return new Promise((resolve) => {
      this.emailService.getEmails().subscribe({
        next: (response) => {
          // Gérer les réponses paginées
          if (response && 'items' in response) {
            this.emails.set(response.items);
          } else {
            this.emails.set(response as Email[]);
          }
          resolve();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des emails:', error);
          this.emails.set(this.getMockEmails());
          resolve();
        }
      });
    });
  }

  applyFilters() {
    let filtered = this.applications();

    // Filtre par recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.job_offer_id?.toLowerCase().includes(term) ||
        app.job_title?.toLowerCase().includes(term) ||
        app.company_name?.toLowerCase().includes(term) ||
        app.notes?.toLowerCase().includes(term) ||
        app.contact_person?.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (this.statusFilter) {
      filtered = filtered.filter(app => app.status === this.statusFilter);
    }

    // Filtre par priorité
    if (this.priorityFilter) {
      filtered = filtered.filter(app => app.priority === this.priorityFilter);
    }

    // Filtre par IA liée
    if (this.aiLinkedFilter) {
      const hasAI = this.aiLinkedFilter === 'true';
      filtered = filtered.filter(app => {
        const hasLinkedEmails = this.getLinkedEmails(app.id).length > 0;
        return hasAI ? hasLinkedEmails : !hasLinkedEmails;
      });
    }

    this.filteredApplications.set(filtered);
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.aiLinkedFilter);
  }

  getApplicationsStats() {
    const apps = this.applications();
    return {
      total: apps.length,
      pending: apps.filter(a => ['PENDING', 'APPLIED', 'ACKNOWLEDGED'].includes(a.status)).length,
      interviews: apps.filter(a => a.status === 'INTERVIEW').length,
      accepted: apps.filter(a => a.status === 'ACCEPTED').length,
      aiLinked: apps.filter(a => this.getLinkedEmails(a.id).length > 0).length
    };
  }

  getCompanyById(companyId: string): Company | undefined {
    return this.companies().find(c => c.id === companyId);
  }

  getLinkedEmails(applicationId: string): Email[] {
    return this.emails().filter(email => email.application_id === applicationId);
  }

  getEmailCount(applicationId: string): number {
    return this.getLinkedEmails(applicationId).length;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'APPLIED': '📤 Envoyée',
      'ACKNOWLEDGED': '✅ Reçue',
      'SCREENING': '🔍 Sélection',
      'INTERVIEW': '💼 Entretien',
      'TECHNICAL_TEST': '🧪 Test technique',
      'OFFER': '💰 Offre',
      'REJECTED': '❌ Refusée',
      'ACCEPTED': '🎉 Acceptée',
      'WITHDRAWN': '🚫 Retirée'
    };
    return labels[status] || status;
  }

  getPriorityIcon(priority: string): string {
    const icons: { [key: string]: string } = {
      'HIGH': '🔴',
      'MEDIUM': '🟡',
      'LOW': '🟢'
    };
    return icons[priority] || '⚪';
  }

  getEmailTypeLabel(type: string | undefined): string {
    if (!type) return 'Autre';
    const labels: { [key: string]: string } = {
      'ACK': 'Accusé',
      'REJECTED': 'Refus',
      'INTERVIEW': 'Entretien',
      'OFFER': 'Offre'
    };
    return labels[type] || type;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Non défini';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  toggleApplicationDetails(applicationId: string) {
    const expanded = this.expandedApplications();
    if (expanded.has(applicationId)) {
      expanded.delete(applicationId);
    } else {
      expanded.add(applicationId);
    }
    this.expandedApplications.set(new Set(expanded));
  }

  createApplication() {
    this.jobApplicationService.createJobApplication(this.newApplication).subscribe({
      next: (application) => {
        const current = this.applications();
        this.applications.set([application, ...current]);
        this.resetForm();
        this.showCreateForm.set(false);
        this.applyFilters();
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        alert('Erreur lors de la création de la candidature');
      }
    });
  }

  editApplication(application: JobApplication) {
    // Pour simplifier, on navigue vers une page d'édition dédiée
    console.log('Édition de la candidature:', application);
  }

  deleteApplication(applicationId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette candidature ?')) {
      return;
    }

    this.jobApplicationService.deleteJobApplication(applicationId).subscribe({
      next: () => {
        const current = this.applications();
        this.applications.set(current.filter(a => a.id !== applicationId));
        this.applyFilters();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la candidature');
      }
    });
  }

  duplicateApplication(application: JobApplication) {
    const duplicate: CreateJobApplicationRequest = {
      job_offer_id: `${application.job_offer_id}-copie`,
      job_title: application.job_title + ' (copie)',
      company_name: application.company_name,
      status: 'APPLIED',
      applied_date: new Date().toISOString().split('T')[0],
      priority: application.priority,
      notes: application.notes ? `${application.notes} (copie)` : 'Copie de candidature'
    };

    this.jobApplicationService.createJobApplication(duplicate).subscribe({
      next: (newApp) => {
        const current = this.applications();
        this.applications.set([newApp, ...current]);
        this.applyFilters();
      },
      error: (error) => {
        console.error('Erreur lors de la duplication:', error);
        alert('Erreur lors de la duplication de la candidature');
      }
    });
  }

  resetForm() {
    this.newApplication = {
      job_offer_id: '',
      job_title: '',
      company_name: '',
      status: 'APPLIED',
      applied_date: new Date().toISOString().split('T')[0],
      priority: 'MEDIUM',
      source: '',
      notes: ''
    };
  }

  refreshApplications() {
    this.loadData();
  }

  // Données de démonstration
  private getMockApplications(): JobApplication[] {
    return [
      {
        id: '1',
        job_offer_id: 'fullstack-dev-001',
        job_title: 'Développeur Fullstack',
        company_name: 'TechCorp',
        status: 'INTERVIEW',
        applied_date: '2024-09-25',
        last_update_date: '2024-09-26',
        priority: 'HIGH',
        source: 'LinkedIn',
        contact_person: 'Marie Dupont',
        contact_email: 'marie.dupont@techcorp.com',
        notes: 'Poste très intéressant avec stack moderne',
        interview_date: '2024-09-30',
        created_at: '2024-09-25T10:00:00Z',
        updated_at: '2024-09-26T14:30:00Z'
      },
      {
        id: '2',
        job_offer_id: 'data-scientist-002',
        job_title: 'Data Scientist',
        company_name: 'DataCorp',
        status: 'ACKNOWLEDGED',
        applied_date: '2024-09-24',
        priority: 'MEDIUM',
        source: 'Indeed',
        contact_person: 'Jean Martin',
        contact_email: 'jean.martin@dataviz.com',
        notes: 'Équipe IA prometteuse',
        created_at: '2024-09-24T09:00:00Z',
        updated_at: '2024-09-24T09:00:00Z'
      },
      {
        id: '3',
        job_offer_id: 'product-manager-003',
        job_title: 'Product Manager',
        company_name: 'StartupCorp',
        status: 'REJECTED',
        applied_date: '2024-09-20',
        last_update_date: '2024-09-23',
        priority: 'LOW',
        source: 'Site entreprise',
        rejection_reason: 'Profil pas tout à fait adapté',
        notes: 'Retour constructif reçu',
        created_at: '2024-09-20T15:00:00Z',
        updated_at: '2024-09-23T11:00:00Z'
      }
    ];
  }

  private getMockCompanies(): Company[] {
    return [
      { id: '1', name: 'TechCorp Solutions', industry: 'Technology', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'DataViz Analytics', industry: 'Data Science', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: '3', name: 'Innovation Labs', industry: 'R&D', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
    ];
  }

  private getMockEmails(): Email[] {
    return [
      {
        id: '1',
        subject: 'Confirmation de réception de votre candidature',
        raw_body: 'Nous avons bien reçu votre candidature...',
        sender: 'hr@techcorp.com',
        sent_at: '2024-09-25T11:00:00Z',
        classification: 'ACK',
        application_id: '1',
        created_at: '2024-09-25T11:00:00Z'
      },
      {
        id: '2',
        subject: 'Entretien programmé - Développeur Full Stack',
        raw_body: 'Nous souhaitons vous rencontrer pour un entretien...',
        sender: 'recrutement@techcorp.com',
        sent_at: '2024-09-26T14:00:00Z',
        classification: 'INTERVIEW',
        application_id: '1',
        created_at: '2024-09-26T14:00:00Z'
      }
    ];
  }
}
