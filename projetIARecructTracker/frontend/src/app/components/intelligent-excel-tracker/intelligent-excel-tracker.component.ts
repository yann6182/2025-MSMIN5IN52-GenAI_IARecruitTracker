import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IntelligentTrackerService, ProcessingResult, ProcessingSummary, ExcelExport } from '../../services/intelligent-tracker.service';
import { JobApplicationService } from '../../services/job-application.service';
import { JobApplication } from '../../models/job-application.model';

interface TableColumn {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  width?: string;
}

interface FilterState {
  search: string;
  status: string;
  company: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
  autoCreated: string;
}

@Component({
  selector: 'app-intelligent-excel-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="intelligent-tracker">
      <!-- Header avec actions principales -->
      <div class="tracker-header">
        <div class="header-content">
          <h1>📊 Suivi Intelligent des Candidatures</h1>
          <p>Tableau de bord automatisé alimenté par l'IA</p>
        </div>
        
        <div class="header-actions">
          <button 
            class="btn btn-primary" 
            (click)="processEmails()" 
            [disabled]="isProcessing()"
            [class.loading]="isProcessing()">
            @if (isProcessing()) {
              <div class="spinner"></div>
              Analyse en cours...
            } @else {
              🤖 Analyser les emails
            }
          </button>
          
          <button class="btn btn-success" (click)="exportToExcel()">
            📊 Exporter Excel
          </button>
          
          <button class="btn btn-outline" (click)="refreshData()">
            🔄 Actualiser
          </button>
        </div>
      </div>

      <!-- Métriques en temps réel -->
      @if (summary()) {
        <div class="metrics-dashboard">
          <div class="metric-card total">
            <div class="metric-value">{{ summary()?.data?.total_applications || 0 }}</div>
            <div class="metric-label">Total candidatures</div>
          </div>
          
          <div class="metric-card auto">
            <div class="metric-value">{{ summary()?.data?.auto_created_applications || 0 }}</div>
            <div class="metric-label">Créées par IA</div>
            <div class="metric-percent">{{ getAutomationRate() }}%</div>
          </div>
          
          <div class="metric-card emails">
            <div class="metric-value">{{ summary()?.data?.unprocessed_emails || 0 }}</div>
            <div class="metric-label">Emails à traiter</div>
          </div>
          
          <div class="metric-card success">
            <div class="metric-value">{{ getStatusCount('ACCEPTED') + getStatusCount('OFFER') }}</div>
            <div class="metric-label">Succès</div>
          </div>
        </div>
      }

      <!-- Résultats du dernier traitement -->
      @if (lastProcessingResult()) {
        <div class="processing-results" [class.success]="lastProcessingResult()?.success">
          <div class="result-header">
            <h3>📈 Dernier traitement automatique</h3>
            <span class="result-timestamp">{{ formatTimestamp(lastProcessingResult()?.timestamp) }}</span>
          </div>
          
          <div class="result-stats">
            <span>✅ {{ lastProcessingResult()?.results?.created_applications || 0 }} créées</span>
            <span>🔄 {{ lastProcessingResult()?.results?.updated_applications || 0 }} mises à jour</span>
            <span>📧 {{ lastProcessingResult()?.results?.processed_emails || 0 }} emails traités</span>
            @if (lastProcessingResult()?.results?.errors && lastProcessingResult()?.results?.errors?.length) {
              <span class="error">⚠️ {{ lastProcessingResult()?.results?.errors?.length || 0 }} erreurs</span>
            }
          </div>
        </div>
      }

      <!-- Filtres et configuration des colonnes -->
      <div class="controls-section">
        <div class="filters-panel">
          <div class="filter-group">
            <label>🔍 Recherche globale</label>
            <input 
              type="text" 
              [(ngModel)]="filters.search"
              (input)="applyFilters()"
              placeholder="Entreprise, poste, contact..."
              class="filter-input">
          </div>
          
          <div class="filter-group">
            <label>📊 Statut</label>
            <select [(ngModel)]="filters.status" (change)="applyFilters()" class="filter-select">
              <option value="">Tous</option>
              <option value="APPLIED">Candidature envoyée</option>
              <option value="ACKNOWLEDGED">Accusé de réception</option>
              <option value="SCREENING">Sélection</option>
              <option value="INTERVIEW">Entretien</option>
              <option value="TECHNICAL_TEST">Test technique</option>
              <option value="OFFER">Offre reçue</option>
              <option value="ACCEPTED">Acceptée</option>
              <option value="REJECTED">Refusée</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>🏢 Entreprise</label>
            <input 
              type="text" 
              [(ngModel)]="filters.company"
              (input)="applyFilters()"
              placeholder="Nom entreprise..."
              class="filter-input">
          </div>
          
          <div class="filter-group">
            <label>⭐ Priorité</label>
            <select [(ngModel)]="filters.priority" (change)="applyFilters()" class="filter-select">
              <option value="">Toutes</option>
              <option value="HIGH">🔴 Haute</option>
              <option value="MEDIUM">🟡 Moyenne</option>
              <option value="LOW">🟢 Faible</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>🤖 Source</label>
            <select [(ngModel)]="filters.autoCreated" (change)="applyFilters()" class="filter-select">
              <option value="">Toutes</option>
              <option value="true">IA automatique</option>
              <option value="false">Saisie manuelle</option>
            </select>
          </div>
        </div>
        
        <div class="column-config">
          <button class="btn btn-sm btn-outline" (click)="toggleColumnConfig()">
            ⚙️ Colonnes
          </button>
          
          @if (showColumnConfig()) {
            <div class="column-selector">
              @for (column of columns(); track column.key) {
                <label class="column-option">
                  <input 
                    type="checkbox" 
                    [checked]="column.visible"
                    (change)="toggleColumn(column.key)">
                  {{ column.label }}
                </label>
              }
            </div>
          }
        </div>
      </div>

      <!-- Tableau intelligent style Excel -->
      <div class="excel-table-container">
        <div class="table-wrapper">
          <table class="excel-table">
            <thead>
              <tr>
                @for (column of visibleColumns(); track column.key) {
                  <th 
                    [style.width]="column.width"
                    [class.sortable]="column.sortable"
                    (click)="column.sortable ? sortBy(column.key) : null">
                    
                    {{ column.label }}
                    
                    @if (column.sortable && sortField() === column.key) {
                      <span class="sort-indicator">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </th>
                }
                <th class="actions-column">Actions</th>
              </tr>
            </thead>
            
            <tbody>
              @if (isLoading()) {
                <tr>
                  <td [attr.colspan]="visibleColumns().length + 1" class="loading-row">
                    <div class="table-loading">
                      <div class="spinner"></div>
                      Chargement des candidatures...
                    </div>
                  </td>
                </tr>
              } @else if (filteredApplications().length === 0) {
                <tr>
                  <td [attr.colspan]="visibleColumns().length + 1" class="empty-row">
                    <div class="empty-state">
                      @if (hasActiveFilters()) {
                        <p>Aucune candidature ne correspond aux filtres</p>
                        <button class="btn btn-sm btn-outline" (click)="clearFilters()">
                          Effacer les filtres
                        </button>
                      } @else {
                        <p>Aucune candidature trouvée</p>
                        <button class="btn btn-sm btn-primary" (click)="processEmails()">
                          🤖 Lancer l'analyse automatique
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @else {
                @for (app of paginatedApplications(); track app.id) {
                  <tr 
                    [class]="'status-' + app.status.toLowerCase()"
                    [class.auto-created]="isAutoCreated(app)"
                    (click)="selectApplication(app.id)">
                    
                    @for (column of visibleColumns(); track column.key) {
                      <td [class]="'cell-' + column.key">
                        @switch (column.key) {
                          @case ('company_name') {
                            <div class="company-cell">
                              <strong>{{ app.company_name }}</strong>
                              @if (isAutoCreated(app)) {
                                <span class="auto-badge">🤖</span>
                              }
                            </div>
                          }
                          @case ('job_title') {
                            {{ app.job_title || 'Poste non spécifié' }}
                          }
                          @case ('status') {
                            <span class="status-badge" [class]="'badge-' + app.status.toLowerCase()">
                              {{ getStatusLabel(app.status) }}
                            </span>
                          }
                          @case ('applied_date') {
                            {{ formatDate(app.applied_date || app.created_at) }}
                          }
                          @case ('last_interaction') {
                            {{ formatDate(app.last_update_date || app.updated_at) }}
                          }
                          @case ('contact_person') {
                            {{ app.contact_person || '-' }}
                          }
                          @case ('priority') {
                            <span class="priority-badge" [class]="'priority-' + (app.priority || 'MEDIUM').toLowerCase()">
                              {{ getPriorityIcon(app.priority || 'MEDIUM') }}
                            </span>
                          }
                          @case ('email_count') {
                            <span class="email-count">
                              📧 {{ getEmailCount(app.id) }}
                            </span>
                          }
                          @case ('location') {
                            {{ app.location || '-' }}
                          }
                          @case ('interview_date') {
                            {{ app.interview_date ? formatDate(app.interview_date) : '-' }}
                          }
                          @case ('urgency_level') {
                            @if (app.urgency_level && app.urgency_level !== 'NORMAL') {
                              <span class="urgency-badge" [class]="'urgency-' + app.urgency_level.toLowerCase()">
                                {{ getUrgencyIcon(app.urgency_level) }}
                              </span>
                            }
                          }
                          @default {
                            {{ getFieldValue(app, column.key) || '-' }}
                          }
                        }
                      </td>
                    }
                    
                    <td class="actions-cell">
                      <div class="action-buttons">
                        <button 
                          class="btn-icon" 
                          (click)="viewApplicationDetails($event, app.id)"
                          title="Voir détails">
                          👁️
                        </button>
                        <button 
                          class="btn-icon" 
                          (click)="editApplication($event, app)"
                          title="Modifier">
                          ✏️
                        </button>
                        <button 
                          class="btn-icon" 
                          [routerLink]="['/emails']"
                          [queryParams]="{application_id: app.id}"
                          title="Emails liés">
                          📧
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button 
              class="btn btn-sm btn-outline" 
              [disabled]="currentPage() === 1"
              (click)="goToPage(currentPage() - 1)">
              ← Précédent
            </button>
            
            <span class="page-info">
              Page {{ currentPage() }} sur {{ totalPages() }}
              ({{ filteredApplications().length }} candidatures)
            </span>
            
            <button 
              class="btn btn-sm btn-outline" 
              [disabled]="currentPage() === totalPages()"
              (click)="goToPage(currentPage() + 1)">
              Suivant →
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .intelligent-tracker {
      padding: 20px;
      max-width: 100%;
      margin: 0 auto;
    }

    .tracker-header {
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
      position: relative;
    }

    .btn-primary { background: #2196F3; color: white; }
    .btn-success { background: #4CAF50; color: white; }
    .btn-outline { background: white; color: #333; border: 1px solid #ddd; }
    .btn-sm { padding: 6px 12px; font-size: 14px; }

    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn.loading {
      padding-left: 40px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      position: absolute;
      left: 12px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .metrics-dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      border-left: 4px solid #2196F3;
    }

    .metric-card.auto { border-left-color: #9C27B0; }
    .metric-card.emails { border-left-color: #FF9800; }
    .metric-card.success { border-left-color: #4CAF50; }

    .metric-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .metric-label {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .metric-percent {
      color: #9C27B0;
      font-size: 12px;
      font-weight: bold;
    }

    .processing-results {
      background: #e8f5e8;
      border: 1px solid #4CAF50;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .result-header h3 {
      margin: 0;
      color: #333;
    }

    .result-timestamp {
      color: #666;
      font-size: 14px;
    }

    .result-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .result-stats span {
      padding: 4px 8px;
      background: white;
      border-radius: 4px;
      font-size: 14px;
    }

    .result-stats .error {
      background: #ffebee;
      color: #d32f2f;
    }

    .controls-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }

    .filters-panel {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      flex: 1;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      min-width: 150px;
    }

    .filter-group label {
      margin-bottom: 5px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .filter-input, .filter-select {
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .filter-input:focus, .filter-select:focus {
      outline: none;
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
    }

    .column-config {
      position: relative;
    }

    .column-selector {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 15px;
      min-width: 200px;
      z-index: 1000;
    }

    .column-option {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .excel-table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .excel-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .excel-table th {
      background: #f8f9fa;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid #dee2e6;
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .excel-table th.sortable {
      cursor: pointer;
      user-select: none;
    }

    .excel-table th.sortable:hover {
      background: #e9ecef;
    }

    .sort-indicator {
      margin-left: 5px;
      color: #2196F3;
    }

    .excel-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: middle;
    }

    .excel-table tbody tr {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .excel-table tbody tr:hover {
      background: #f8f9fa;
    }

    .excel-table tbody tr.auto-created {
      border-left: 3px solid #9C27B0;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .badge-applied { background: #e3f2fd; color: #1976d2; }
    .badge-acknowledged { background: #e8f5e8; color: #388e3c; }
    .badge-screening { background: #fff3e0; color: #f57c00; }
    .badge-interview { background: #fff3e0; color: #f57c00; }
    .badge-technical_test { background: #f3e5f5; color: #7b1fa2; }
    .badge-offer { background: #e0f2f1; color: #00796b; }
    .badge-accepted { background: #e8f5e8; color: #388e3c; }
    .badge-rejected { background: #ffebee; color: #d32f2f; }

    .priority-badge {
      font-size: 16px;
    }

    .priority-high { color: #f44336; }
    .priority-medium { color: #ff9800; }
    .priority-low { color: #4caf50; }

    .urgency-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }

    .urgency-urgent { background: #ffebee; color: #d32f2f; }
    .urgency-high { background: #fff3e0; color: #f57c00; }

    .company-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .auto-badge {
      font-size: 12px;
      opacity: 0.7;
    }

    .email-count {
      color: #666;
      font-size: 12px;
    }

    .actions-cell {
      width: 120px;
      text-align: center;
    }

    .action-buttons {
      display: flex;
      gap: 5px;
      justify-content: center;
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      border: none;
      background: #f5f5f5;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: background-color 0.2s;
    }

    .btn-icon:hover {
      background: #e0e0e0;
    }

    .loading-row, .empty-row {
      text-align: center;
      padding: 40px 20px;
    }

    .table-loading, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      color: #666;
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .page-info {
      color: #666;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .intelligent-tracker {
        padding: 15px;
      }

      .tracker-header {
        flex-direction: column;
        align-items: stretch;
      }

      .controls-section {
        flex-direction: column;
      }

      .filters-panel {
        justify-content: stretch;
      }

      .filter-group {
        min-width: auto;
        flex: 1;
      }

      .metrics-dashboard {
        grid-template-columns: repeat(2, 1fr);
      }

      .excel-table th,
      .excel-table td {
        padding: 8px 4px;
        font-size: 12px;
      }

      .action-buttons {
        flex-direction: column;
        gap: 2px;
      }

      .btn-icon {
        width: 24px;
        height: 24px;
      }
    }
  `]
})
export class IntelligentExcelTrackerComponent implements OnInit {
  // Signals pour l'état
  applications = signal<JobApplication[]>([]);
  filteredApplications = signal<JobApplication[]>([]);
  isLoading = signal(true);
  isProcessing = signal(false);
  summary = signal<ProcessingSummary | null>(null);
  lastProcessingResult = signal<(ProcessingResult & { timestamp: Date }) | null>(null);
  
  // Configuration des colonnes
  columns = signal<TableColumn[]>([
    { key: 'company_name', label: 'Entreprise', visible: true, sortable: true, filterable: true, width: '200px' },
    { key: 'job_title', label: 'Poste', visible: true, sortable: true, filterable: true, width: '180px' },
    { key: 'status', label: 'Statut', visible: true, sortable: true, filterable: true, width: '130px' },
    { key: 'applied_date', label: 'Date candidature', visible: true, sortable: true, filterable: false, width: '120px' },
    { key: 'last_interaction', label: 'Dernière activité', visible: true, sortable: true, filterable: false, width: '130px' },
    { key: 'contact_person', label: 'Contact', visible: true, sortable: true, filterable: false, width: '120px' },
    { key: 'priority', label: 'Priorité', visible: true, sortable: true, filterable: true, width: '80px' },
    { key: 'email_count', label: 'Emails', visible: true, sortable: false, filterable: false, width: '70px' },
    { key: 'location', label: 'Lieu', visible: false, sortable: true, filterable: false, width: '120px' },
    { key: 'interview_date', label: 'Entretien', visible: false, sortable: true, filterable: false, width: '120px' },
    { key: 'urgency_level', label: 'Urgence', visible: false, sortable: true, filterable: false, width: '80px' },
    { key: 'source', label: 'Source', visible: false, sortable: true, filterable: false, width: '150px' }
  ]);
  
  // État de la configuration
  showColumnConfig = signal(false);
  
  // Filtres
  filters: FilterState = {
    search: '',
    status: '',
    company: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
    autoCreated: ''
  };
  
  // Tri et pagination
  sortField = signal<string>('updated_at');
  sortDirection = signal<'asc' | 'desc'>('desc');
  currentPage = signal(1);
  pageSize = 50;
  
  // Computed properties
  visibleColumns = computed(() => this.columns().filter(col => col.visible));
  
  totalPages = computed(() => 
    Math.ceil(this.filteredApplications().length / this.pageSize)
  );
  
  paginatedApplications = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredApplications().slice(start, end);
  });

  constructor(
    private intelligentTracker: IntelligentTrackerService,
    private jobApplicationService: JobApplicationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private async loadData() {
    this.isLoading.set(true);
    
    try {
      // Charger les candidatures et le résumé en parallèle
      const [applicationsResult, summaryResult] = await Promise.all([
        this.jobApplicationService.getJobApplications().toPromise(),
        this.intelligentTracker.getProcessingSummary().toPromise()
      ]);
      
      // Traiter les candidatures
      if (applicationsResult) {
        if ('items' in applicationsResult) {
          this.applications.set(applicationsResult.items);
        } else {
          this.applications.set(applicationsResult as JobApplication[]);
        }
      } else {
        this.applications.set([]);
      }
      
      this.summary.set(summaryResult || null);
      this.applyFilters();
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async processEmails() {
    this.isProcessing.set(true);
    
    try {
      const result = await this.intelligentTracker.processEmails().toPromise();
      
      if (result) {
        this.lastProcessingResult.set({
          ...result,
          timestamp: new Date()
        });
        
        // Recharger les données après le traitement
        await this.loadData();
      }
      
    } catch (error) {
      console.error('Erreur lors du traitement des emails:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async exportToExcel() {
    try {
      const exportData = await this.intelligentTracker.getExcelExport(
        this.filters.company || undefined,
        this.filters.status || undefined
      ).toPromise();
      
      if (exportData) {
        this.intelligentTracker.exportToCSV(exportData.data);
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  }

  applyFilters() {
    let filtered = this.applications();
    
    // Filtre de recherche globale
    if (this.filters.search.trim()) {
      const searchTerm = this.filters.search.toLowerCase();
      filtered = filtered.filter(app => 
        app.company_name?.toLowerCase().includes(searchTerm) ||
        app.job_title?.toLowerCase().includes(searchTerm) ||
        app.contact_person?.toLowerCase().includes(searchTerm) ||
        app.notes?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filtre par statut
    if (this.filters.status) {
      filtered = filtered.filter(app => app.status === this.filters.status);
    }
    
    // Filtre par entreprise
    if (this.filters.company.trim()) {
      const companyTerm = this.filters.company.toLowerCase();
      filtered = filtered.filter(app => 
        app.company_name?.toLowerCase().includes(companyTerm)
      );
    }
    
    // Filtre par priorité
    if (this.filters.priority) {
      filtered = filtered.filter(app => app.priority === this.filters.priority);
    }
    
    // Filtre par source (auto-créé ou manuel)
    if (this.filters.autoCreated) {
      const isAuto = this.filters.autoCreated === 'true';
      filtered = filtered.filter(app => this.isAutoCreated(app) === isAuto);
    }
    
    // Appliquer le tri
    filtered.sort((a, b) => {
      const field = this.sortField();
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      
      const aValue = this.getFieldValue(a, field);
      const bValue = this.getFieldValue(b, field);
      
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      return (aValue < bValue ? -1 : 1) * direction;
    });
    
    this.filteredApplications.set(filtered);
    this.currentPage.set(1); // Reset pagination
  }

  sortBy(field: string) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.applyFilters();
  }

  toggleColumn(columnKey: string) {
    const columns = this.columns();
    const column = columns.find(col => col.key === columnKey);
    if (column) {
      column.visible = !column.visible;
      this.columns.set([...columns]);
    }
  }

  toggleColumnConfig() {
    this.showColumnConfig.set(!this.showColumnConfig());
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Méthodes utilitaires
  
  getAutomationRate(): number {
    const summary = this.summary();
    if (!summary) return 0;
    return Math.round(summary.data.automation_rate);
  }

  getStatusCount(status: string): number {
    const summary = this.summary();
    if (!summary) return 0;
    return summary.data.status_breakdown[status] || 0;
  }

  isAutoCreated(app: JobApplication): boolean {
    return app.source?.includes('Détecté automatiquement') || false;
  }

  getFieldValue(app: JobApplication, field: string): any {
    return (app as any)[field];
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.company || 
             this.filters.priority || this.filters.autoCreated);
  }

  clearFilters() {
    this.filters = {
      search: '',
      status: '',
      company: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
      autoCreated: ''
    };
    this.applyFilters();
  }

  refreshData() {
    this.loadData();
  }

  selectApplication(id: string) {
    console.log('Application sélectionnée:', id);
  }

  viewApplicationDetails(event: Event, id: string) {
    event.stopPropagation();
    console.log('Voir détails:', id);
  }

  editApplication(event: Event, app: JobApplication) {
    event.stopPropagation();
    console.log('Éditer application:', app);
  }

  getEmailCount(applicationId: string): number {
    // Cette méthode devra être implémentée pour compter les emails
    return 0;
  }

  // Méthodes de formatage
  
  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  formatTimestamp(date: Date | undefined): string {
    if (!date) return '-';
    return date.toLocaleString('fr-FR');
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'APPLIED': 'Envoyée',
      'ACKNOWLEDGED': 'Reçue',
      'SCREENING': 'Sélection',
      'INTERVIEW': 'Entretien',
      'TECHNICAL_TEST': 'Test',
      'OFFER': 'Offre',
      'ACCEPTED': 'Acceptée',
      'REJECTED': 'Refusée'
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

  getUrgencyIcon(urgency: string): string {
    const icons: { [key: string]: string } = {
      'URGENT': '🚨',
      'HIGH': '⚡'
    };
    return icons[urgency] || '';
  }
}
