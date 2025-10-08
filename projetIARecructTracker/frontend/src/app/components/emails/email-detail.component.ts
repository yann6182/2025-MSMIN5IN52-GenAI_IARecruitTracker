import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { Email } from '../../models/email.model';

@Component({
  selector: 'app-email-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="header">
        <button class="btn btn-secondary" (click)="goBack()">← Retour à la liste</button>
        <h1>📧 Détail de l'Email</h1>
      </div>

      @if (loading()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Chargement de l'email...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <div class="error">
            ⚠️ {{ error() }}
          </div>
          <button class="btn btn-primary" (click)="loadEmail()">Réessayer</button>
        </div>
      } @else if (email()) {
        <div class="email-detail">
          <div class="email-header">
            <div class="email-meta">
              <div class="meta-row">
                <strong>De:</strong> {{ email()!.sender || 'Expéditeur inconnu' }}
              </div>
              <div class="meta-row">
                <strong>Sujet:</strong> {{ email()!.subject }}
              </div>
              <div class="meta-row">
                <strong>Date:</strong> {{ formatDate(email()!.sent_at) }}
              </div>
              @if (email()!.classification) {
                <div class="meta-row">
                  <strong>Classification:</strong>
                  <span class="classification-badge" [class]="'classification-' + email()!.classification?.toLowerCase()">
                    {{ email()!.classification }}
                  </span>
                </div>
              }
            </div>
          </div>

          <div class="email-content">
            <h3>Contenu</h3>
            @if (email()!.raw_body) {
              <div class="email-body" [innerHTML]="email()!.raw_body"></div>
            } @else if (email()!.snippet) {
              <div class="email-snippet">
                <p><em>Aperçu:</em></p>
                <p>{{ email()!.snippet }}</p>
              </div>
            } @else {
              <p class="no-content">Aucun contenu disponible</p>
            }
          </div>
        </div>
      } @else {
        <div class="no-email">
          <p>Email non trouvé</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { 
      padding: 20px; 
      max-width: 1000px; 
      margin: 0 auto; 
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .btn { 
      padding: 10px 20px; 
      border: none; 
      border-radius: 4px; 
      text-decoration: none; 
      display: inline-block; 
      cursor: pointer;
      font-size: 14px;
    }
    
    .btn-primary { 
      background: #2196F3; 
      color: white; 
    }
    
    .btn-secondary { 
      background: #f5f5f5; 
      color: #333; 
      border: 1px solid #ddd;
    }
    
    .btn:hover {
      opacity: 0.9;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
    }
    
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2196F3;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-container {
      text-align: center;
      padding: 40px;
    }
    
    .error {
      background: #ffebee;
      border: 1px solid #f44336;
      color: #c62828;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .email-detail {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .email-header {
      background: #f8f9fa;
      padding: 20px;
      border-bottom: 1px solid #dee2e6;
    }
    
    .email-meta .meta-row {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .classification-badge,
    .sentiment-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .classification-interview { background: #e3f2fd; color: #1565c0; }
    .classification-offer { background: #e8f5e8; color: #2e7d32; }
    .classification-request { background: #fff3e0; color: #ef6c00; }
    .classification-rejected { background: #ffebee; color: #c62828; }
    .classification-ack { background: #f3e5f5; color: #7b1fa2; }
    
    .sentiment-positive { background: #e8f5e8; color: #2e7d32; }
    .sentiment-negative { background: #ffebee; color: #c62828; }
    .sentiment-neutral { background: #f5f5f5; color: #666; }
    
    .email-content {
      padding: 20px;
    }
    
    .email-body {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #2196F3;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    
    .email-snippet {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }
    
    .no-content {
      color: #666;
      font-style: italic;
    }
    
    .email-keywords,
    .email-entities {
      padding: 20px;
      border-top: 1px solid #dee2e6;
    }
    
    .keywords-list,
    .entities-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    
    .keyword-tag {
      background: #e3f2fd;
      color: #1565c0;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    
    .entity-tag {
      background: #f3e5f5;
      color: #7b1fa2;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    
    .no-email {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  `]
})
export class EmailDetailComponent implements OnInit {
  private emailService = inject(EmailService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  email = signal<Email | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    const emailId = this.route.snapshot.paramMap.get('id');
    if (emailId) {
      this.loadEmail(emailId);
    } else {
      this.error.set('ID d\'email manquant');
    }
  }

  loadEmail(emailId?: string) {
    const id = emailId || this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID d\'email manquant');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.emailService.getEmail(id).subscribe({
      next: (email: Email) => {
        this.email.set(email);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement de l\'email:', err);
        this.error.set('Erreur lors du chargement de l\'email');
        this.loading.set(false);
      }
    });
  }

  formatDate(dateString: string): string {
    try {
      if (!dateString) return 'Date non disponible';
      return new Date(dateString).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  goBack() {
    this.router.navigate(['/emails']);
  }
}
