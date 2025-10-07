import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { EmailService } from '../../services/email.service';
import { Email, ProcessEmailRequest, NLPProcessingResult } from '../../models';

@Component({
  selector: 'app-emails-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="emails-page">
      <div class="page-header">
        <h1>📧 Gestion des Emails</h1>
        <div class="header-actions">
          <select (change)="onFilterChange($event)" class="filter-select">
            <option value="">Tous les emails</option>
            <option value="unprocessed">Non traités</option>
            <option value="processed">Traités</option>
            <option value="ACK">Accusés de réception</option>
            <option value="REJECTED">Refus</option>
            <option value="INTERVIEW">Entretiens</option>
            <option value="OFFER">Offres</option>
          </select>
          <button class="btn btn-primary" (click)="refreshEmails()">🔄 Actualiser</button>
        </div>
      </div>

      <!-- Section de test NLP -->
      <div class="nlp-test-section">
        <h2>🧠 Test de Classification NLP</h2>
        <div class="test-form">
          <div class="form-group">
            <label for="testSubject">Sujet de l'email:</label>
            <input 
              id="testSubject"
              type="text" 
              [(ngModel)]="testEmail.subject" 
              placeholder="Ex: Accusé de réception - Candidature Développeur"
              class="form-control"
            >
          </div>
          
          <div class="form-group">
            <label for="testSender">Expéditeur:</label>
            <input 
              id="testSender"
              class="form-control"
              [(ngModel)]="testEmail.sender_email" 
              placeholder="test@example.com"
            />
          </div>
          
          <div class="form-group">
            <label for="testBody">Corps de l'email:</label>
            <textarea 
              id="testBody"
              [(ngModel)]="testEmail.body" 
              placeholder="Ex: Nous avons bien reçu votre candidature..."
              class="form-control"
              rows="4"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button 
              class="btn btn-success" 
              (click)="processTestEmail()" 
              [disabled]="processingTest()"
            >
              {{ processingTest() ? '⏳ Traitement...' : '🧠 Analyser avec IA' }}
            </button>
            <button class="btn btn-secondary" (click)="loadSampleEmail()">
              📝 Charger exemple
            </button>
          </div>
        </div>

        @if (nlpResult()) {
          <div class="nlp-results">
            <h3>Résultats de l'analyse IA</h3>
            <div class="results-grid">
              <div class="result-card">
                <h4>🏷️ Classification</h4>
                <div class="classification-result">
                  <span class="email-type" [class]="'type-' + nlpResult()!.classification.email_type.toLowerCase()">
                    {{ getEmailTypeLabel(nlpResult()!.classification.email_type) }}
                  </span>
                  <span class="confidence">
                    Confiance: {{ (nlpResult()!.classification.confidence * 100).toFixed(1) }}%
                  </span>
                </div>
                <p class="reasoning">{{ nlpResult()!.classification.reasoning }}</p>
              </div>

              <div class="result-card">
                <h4>� Entités Extraites</h4>
                <div class="entities">
                  @if (nlpResult()!.entities.company) {
                    <div class="entity">
                      <strong>Entreprise:</strong> {{ nlpResult()!.entities.company }}
                    </div>
                  }
                  @if (nlpResult()!.entities.job_title) {
                    <div class="entity">
                      <strong>Poste:</strong> {{ nlpResult()!.entities.job_title }}
                    </div>
                  }
                  @if (nlpResult()!.entities.contact_person) {
                    <div class="entity">
                      <strong>Contact:</strong> {{ nlpResult()!.entities.contact_person }}
                    </div>
                  }
                  @if (nlpResult()!.entities.keywords && nlpResult()!.entities.keywords!.length > 0) {
                    <div class="entity">
                      <strong>Mots-clés:</strong> 
                      <span class="keywords">
                        @for (keyword of nlpResult()!.entities.keywords; track keyword) {
                          <span class="keyword-tag">{{ keyword }}</span>
                        }
                      </span>
                    </div>
                  }
                </div>
              </div>

              <div class="result-card">
                <h4>🎯 Matching</h4>
                @if (nlpResult()!.matching.application_id) {
                  <div class="match-found">
                    <p>✅ Candidature liée automatiquement</p>
                    <p>Confiance: {{ (nlpResult()!.matching.confidence * 100).toFixed(1) }}%</p>
                  </div>
                } @else {
                  <div class="no-match">
                    <p>❌ Aucune candidature correspondante</p>
                    <p>{{ nlpResult()!.matching.reasoning }}</p>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Liste des emails -->
      @if (loading()) {
        <div class="loading">
          <p>⏳ Chargement des emails...</p>
        </div>
      } @else if (error()) {
        <div class="error">
          <p>❌ Erreur: {{ error() }}</p>
          <button class="btn btn-secondary" (click)="refreshEmails()">Réessayer</button>
        </div>
      } @else {
        <div class="emails-section">
          <h2>📬 Emails ({{ emails().length }})</h2>
          
          @if (emails().length === 0) {
            <div class="empty-state">
              <h3>Aucun email trouvé</h3>
              <p>Testez la fonctionnalité NLP ci-dessus ou connectez votre backend.</p>
              <button class="btn btn-secondary" (click)="loadMockEmails()">📧 Charger emails de test</button>
            </div>
          } @else {
            <div class="emails-list">
              @for (email of emails(); track email.id) {
                <div class="email-card" [routerLink]="['/emails', email.id]">
                  <div class="email-header">
                    <div class="email-info">
                      <h3>{{ email.subject }}</h3>
                      <div class="email-meta">
                        <span class="sender">De: {{ email.sender || 'Expéditeur inconnu' }}</span>
                        <span class="date">{{ formatDate(email.sent_at) }}</span>
                      </div>
                    </div>
                    
                    <div class="email-status">
                      @if (email.classification) {
                        <span class="type-badge" [class]="'type-' + email.classification.toLowerCase()">
                          {{ getEmailTypeLabel(email.classification) }}
                        </span>
                      }
                    </div>
                  </div>

                  <div class="email-preview">
                    <p>{{ truncateText(email.raw_body || email.snippet, 150) }}</p>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .emails-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header-actions {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .nlp-test-section {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .nlp-test-section h2 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .test-form {
      display: grid;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-weight: 500;
      color: #555;
    }

    .form-control {
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .form-control:focus {
      outline: none;
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }

    .form-actions {
      display: flex;
      gap: 15px;
      justify-content: flex-start;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary { background: #2196F3; color: white; }
    .btn-secondary { background: #757575; color: white; }
    .btn-success { background: #4CAF50; color: white; }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
    }

    .nlp-results {
      margin-top: 25px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }

    .result-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .result-card h4 {
      margin: 0 0 15px 0;
      color: #333;
    }

    .classification-result {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .email-type {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .type-ack { background: #e3f2fd; color: #1976d2; }
    .type-rejected { background: #ffebee; color: #d32f2f; }
    .type-interview { background: #e8f5e8; color: #388e3c; }
    .type-offer { background: #e0f2f1; color: #00796b; }
    .type-request { background: #fff3e0; color: #f57c00; }
    .type-other { background: #f5f5f5; color: #666; }

    .confidence {
      font-size: 12px;
      color: #666;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 10px;
    }

    .reasoning {
      font-size: 14px;
      color: #777;
      font-style: italic;
      margin: 10px 0 0 0;
    }

    .entities {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .entity {
      font-size: 14px;
    }

    .entity strong {
      color: #333;
    }

    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 5px;
    }

    .keyword-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 12px;
    }

    .match-found {
      color: #388e3c;
    }

    .no-match {
      color: #666;
    }

    .emails-section {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .emails-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .email-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: box-shadow 0.2s;
      text-decoration: none;
      color: inherit;
    }

    .email-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .email-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .email-info h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .email-meta {
      display: flex;
      gap: 15px;
      font-size: 14px;
      color: #666;
    }

    .email-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .type-badge, .processed-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .processed { background: #e8f5e8; color: #388e3c; }
    .unprocessed { background: #fff3e0; color: #f57c00; }

    .email-preview p {
      margin: 0;
      color: #666;
      line-height: 1.4;
    }

    .email-footer {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #f0f0f0;
    }

    .loading, .error, .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class EmailsListComponent implements OnInit {
  emails = signal<Email[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  processingTest = signal(false);
  nlpResult = signal<NLPProcessingResult | null>(null);

  testEmail: ProcessEmailRequest = {
    subject: '',
    body: '',
    sender_email: '' // Keep as sender_email for ProcessEmailRequest
  };

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.loadEmails();
  }

  private loadEmails(filter?: string) {
    this.loading.set(true);
    this.error.set(null);

    let observable = this.emailService.getEmails();
    
    if (filter === 'unprocessed') {
      observable = this.emailService.getUnprocessedEmails().pipe(
        map(emails => ({ items: emails, total: emails.length, page: 1, size: emails.length, pages: 1 }))
      );
    }

    observable.subscribe({
      next: (response: any) => {
        this.emails.set(response.items || response || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des emails:', error);
        this.error.set('Impossible de charger les emails. Vérifiez que le backend est démarré.');
        this.loading.set(false);
      }
    });
  }

  onFilterChange(event: Event) {
    const filter = (event.target as HTMLSelectElement).value;
    this.loadEmails(filter);
  }

  refreshEmails() {
    this.loadEmails();
  }

  loadSampleEmail() {
    this.testEmail = {
      subject: 'Accusé de réception de votre candidature - Poste Développeur IA',
      sender_email: 'rh@techcorp.com',
      body: 'Bonjour,\n\nNous avons bien reçu votre candidature pour le poste de Développeur IA Senior au sein de notre équipe.\n\nNotre service RH va étudier votre profil et nous vous recontacterons sous 15 jours ouvrés.\n\nCordialement,\nÉquipe RH TechCorp'
    };
  }

  processTestEmail() {
    if (!this.testEmail.subject || !this.testEmail.body || !this.testEmail.sender_email) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.processingTest.set(true);
    this.nlpResult.set(null);

    this.emailService.processEmailWithNLP(this.testEmail).subscribe({
      next: (result) => {
        this.nlpResult.set(result);
        this.processingTest.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du traitement NLP:', error);
        alert('Erreur lors du traitement. Vérifiez que le backend et Mistral AI sont configurés.');
        this.processingTest.set(false);
      }
    });
  }

  loadMockEmails() {
    const mockEmails: Email[] = [
      {
        id: '1',
        subject: 'Accusé de réception - Candidature Développeur Python',
        raw_body: 'Nous avons bien reçu votre candidature...',
        sender: 'rh@techcorp.com',
        sent_at: '2024-09-20T10:30:00Z',
        classification: 'ACK',
        created_at: '2024-09-20T10:30:00Z'
      },
      {
        id: '2',
        subject: 'Convocation entretien technique',
        raw_body: 'Nous souhaitons vous rencontrer pour un entretien...',
        sender: 'tech@startup.io',
        sent_at: '2024-09-22T14:20:00Z',
        classification: 'INTERVIEW',
        created_at: '2024-09-22T14:20:00Z'
      }
    ] as Email[];

    this.emails.set(mockEmails);
    this.error.set(null);
  }

  getEmailTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ACK': 'Accusé réception',
      'REJECTED': 'Refusé',
      'INTERVIEW': 'Entretien',
      'OFFER': 'Offre',
      'REQUEST': 'Demande',
      'OTHER': 'Autre'
    };
    return labels[type] || type;
  }

  formatDate(dateString: string): string {
    try {
      if (!dateString) return 'Date non disponible';
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date invalide';
    }
  }

  truncateText(text: string | null | undefined, length: number): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
}
