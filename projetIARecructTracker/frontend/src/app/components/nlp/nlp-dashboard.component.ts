import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmailService, FrontendNLPStats } from '../../services/email.service';

interface NLPStats {
  totalProcessed: number;
  accuracyRate: number;
  classificationBreakdown: { [key: string]: number };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    confidence: number;
  }>;
}

@Component({
  selector: 'app-nlp-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="nlp-dashboard">
      <div class="dashboard-header">
        <h1>🧠 Dashboard Intelligence Artificielle</h1>
        <p>Statistiques et performances des fonctionnalités NLP avec Mistral AI</p>
      </div>

      <div class="stats-overview">
        <div class="stat-card primary">
          <div class="stat-icon">📧</div>
          <div class="stat-content">
            <h3>{{ stats().totalProcessed }}</h3>
            <p>Emails traités par IA</p>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <h3>{{ stats().accuracyRate }}%</h3>
            <p>Précision de classification</p>
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <h3>{{ getActiveModels().length }}</h3>
            <p>Modèles Mistral actifs</p>
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <h3>{{ getCostEstimate() }}€</h3>
            <p>Coût estimé ce mois</p>
          </div>
        </div>
      </div>

      <div class="nlp-features">
        <div class="feature-section">
          <h2>🔍 Services NLP Disponibles</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-header">
                <h3>📝 Extraction d'Entités</h3>
                <span class="status-badge active">Actif</span>
              </div>
              <div class="feature-details">
                <p><strong>Modèle:</strong> mistral-small-latest</p>
                <p><strong>Fonction:</strong> Extraction entreprise, poste, contact, dates</p>
                <p><strong>Stratégie:</strong> Règles + IA (hybride)</p>
                <div class="feature-stats">
                  <span>✅ {{ getServiceStats('extraction').success }} réussies</span>
                  <span>❌ {{ getServiceStats('extraction').errors }} erreurs</span>
                </div>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-header">
                <h3>🏷️ Classification d'Emails</h3>
                <span class="status-badge active">Actif</span>
              </div>
              <div class="feature-details">
                <p><strong>Modèle:</strong> mistral-small-latest</p>
                <p><strong>Types:</strong> ACK, REJECTED, INTERVIEW, OFFER, REQUEST</p>
                <p><strong>Seuil de confiance:</strong> 80%</p>
                <div class="feature-stats">
                  <span>✅ {{ getServiceStats('classification').success }} réussies</span>
                  <span>❌ {{ getServiceStats('classification').errors }} erreurs</span>
                </div>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-header">
                <h3>🎯 Matching Sémantique</h3>
                <span class="status-badge active">Actif</span>
              </div>
              <div class="feature-details">
                <p><strong>Modèle:</strong> mistral-embed</p>
                <p><strong>Fonction:</strong> Liaison email ↔ candidature</p>
                <p><strong>Seuil similarité:</strong> 70%</p>
                <div class="feature-stats">
                  <span>✅ {{ getServiceStats('matching').success }} réussies</span>
                  <span>❌ {{ getServiceStats('matching').errors }} erreurs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="classification-breakdown">
          <h2>📊 Répartition des Classifications</h2>
          <div class="breakdown-chart">
            @for (item of classificationBreakdown(); track item.type) {
              <div class="breakdown-item">
                <div class="breakdown-header">
                  <span class="type-label" [class]="'type-' + item.type.toLowerCase()">
                    {{ getEmailTypeLabel(item.type) }}
                  </span>
                  <span class="count">{{ item.count }}</span>
                </div>
                <div class="breakdown-bar">
                  <div class="bar-fill" [style.width.%]="item.percentage"></div>
                </div>
                <div class="breakdown-stats">
                  <span>{{ item.percentage.toFixed(1) }}% du total</span>
                  <span>Conf. moy: {{ item.avgConfidence.toFixed(1) }}%</span>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="recent-activity">
          <h2>📈 Activité IA Récente</h2>
          <div class="activity-list">
            @if (stats().recentActivity.length === 0) {
              <div class="no-activity">
                <p>Aucune activité IA récente</p>
                <button class="btn btn-secondary" routerLink="/emails">
                  Tester la classification d'emails
                </button>
              </div>
            } @else {
              @for (activity of stats().recentActivity; track activity.id) {
                <div class="activity-item">
                  <div class="activity-icon">{{ getActivityIcon(activity.type) }}</div>
                  <div class="activity-content">
                    <div class="activity-description">{{ activity.description }}</div>
                    <div class="activity-meta">
                      <span class="timestamp">{{ formatTimestamp(activity.timestamp) }}</span>
                      <span class="confidence">{{ (activity.confidence * 100).toFixed(1) }}% confiance</span>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <div class="configuration-panel">
          <h2>⚙️ Configuration Mistral AI</h2>
          <div class="config-grid">
            <div class="config-item">
              <label>Modèle d'extraction:</label>
              <span class="config-value">mistral-small-latest</span>
            </div>
            <div class="config-item">
              <label>Modèle de classification:</label>
              <span class="config-value">mistral-small-latest</span>
            </div>
            <div class="config-item">
              <label>Modèle d'embeddings:</label>
              <span class="config-value">mistral-embed</span>
            </div>
            <div class="config-item">
              <label>Température:</label>
              <span class="config-value">0.1</span>
            </div>
            <div class="config-item">
              <label>Tokens max:</label>
              <span class="config-value">1000</span>
            </div>
            <div class="config-item">
              <label>Seuil de confiance:</label>
              <span class="config-value">80%</span>
            </div>
          </div>
        </div>

        <div class="action-center">
          <h2>🚀 Actions Rapides</h2>
          <div class="actions-grid">
            <button class="action-btn" routerLink="/emails">
              <div class="btn-icon">📧</div>
              <div class="btn-text">
                <h3>Tester Classification</h3>
                <p>Analyser un email avec l'IA</p>
              </div>
            </button>

            <button class="action-btn" (click)="refreshStats()">
              <div class="btn-icon">🔄</div>
              <div class="btn-text">
                <h3>Actualiser Stats</h3>
                <p>Recharger les données</p>
              </div>
            </button>

            <button class="action-btn" routerLink="/job-applications">
              <div class="btn-icon">🎯</div>
              <div class="btn-text">
                <h3>Voir Matching</h3>
                <p>Candidatures liées par IA</p>
              </div>
            </button>
          </div>
        </div>

        <div class="email-ingestion-section">
          <h2>📬 Ingestion d'Emails</h2>
          <p>Récupérer et analyser les emails directement depuis votre boîte mail</p>
          
          <div class="ingestion-controls">
            <div class="control-group">
              <label for="ingestionInterval">Période à récupérer :</label>
              <select id="ingestionInterval" [(ngModel)]="selectedIngestionInterval" class="interval-select">
                <option value="1">Dernier jour</option>
                <option value="3">Derniers 3 jours</option>
                <option value="7">Dernière semaine</option>
                <option value="14">Derniers 14 jours</option>
                <option value="30">Dernier mois</option>
              </select>
            </div>
            
            <div class="control-group">
              <label>
                <input type="checkbox" [(ngModel)]="analyzeAfterIngestion" class="analyze-checkbox">
                Analyser automatiquement après ingestion
              </label>
            </div>
            
            <div class="control-actions">
              <button 
                class="test-btn" 
                (click)="testEmailConnection()" 
                [disabled]="isTestingConnection()">
                @if (isTestingConnection()) {
                  <span class="spinner">⏳</span> Test en cours...
                } @else {
                  <span>🔗 Tester la connexion</span>
                }
              </button>
              
              <button 
                class="ingest-btn" 
                (click)="startEmailIngestion()" 
                [disabled]="isIngesting() || !connectionTested()"
                [class.ingesting]="isIngesting()">
                @if (isIngesting()) {
                  <span class="spinner">⏳</span> Ingestion en cours...
                } @else {
                  <span>📬 Récupérer les emails</span>
                }
              </button>
            </div>
          </div>
          
          @if (connectionResult()) {
            <div class="connection-result" [class]="connectionResult()?.success ? 'success' : 'error'">
              <strong>Test de connexion :</strong> {{ connectionResult()?.message }}
            </div>
          }
          
          @if (ingestionResult()) {
            <div class="ingestion-result" [class]="ingestionResult()?.success ? 'success' : 'error'">
              <h3>Résultats de l'ingestion</h3>
              <div class="result-details">
                <p><strong>Emails trouvés :</strong> {{ ingestionResult()?.emails_found }}</p>
                <p><strong>Emails sauvegardés :</strong> {{ ingestionResult()?.emails_saved }}</p>
                @if (ingestionResult()?.analysis) {
                  <p><strong>Emails analysés :</strong> {{ ingestionResult()?.analysis?.processed_count }}</p>
                  @if (ingestionResult()?.analysis?.errors && (ingestionResult()?.analysis?.errors?.length || 0) > 0) {
                    <details>
                      <summary>Erreurs d'analyse ({{ ingestionResult()?.analysis?.errors?.length || 0 }})</summary>
                      <ul class="error-list">
                        @for (error of ingestionResult()?.analysis?.errors || []; track error) {
                          <li>{{ error }}</li>
                        }
                      </ul>
                    </details>
                  }
                }
              </div>
            </div>
          }
        </div>

        <div class="email-analysis-section">
          <h2>🔍 Analyse des Emails</h2>
          <div class="analysis-controls">
            <div class="control-group">
              <label for="timeInterval">Intervalle de temps :</label>
              <select id="timeInterval" [(ngModel)]="selectedInterval" class="interval-select">
                <option value="hours-1">Dernière heure</option>
                <option value="hours-6">Dernières 6 heures</option>
                <option value="hours-24">Dernières 24 heures</option>
                <option value="days-7">Derniers 7 jours</option>
                <option value="days-30">Derniers 30 jours</option>
                <option value="days-90">Derniers 90 jours</option>
              </select>
            </div>
            
            <div class="control-group">
              <label>
                <input type="checkbox" [(ngModel)]="forceReprocess" class="force-checkbox">
                Forcer le retraitement des emails déjà analysés
              </label>
            </div>
            
            <div class="control-group">
              <button 
                class="analyze-btn" 
                (click)="startEmailAnalysis()" 
                [disabled]="isAnalyzing()"
                [class.analyzing]="isAnalyzing()">
                @if (isAnalyzing()) {
                  <span class="spinner">⏳</span> Analyse en cours...
                } @else {
                  <span>🚀 Lancer l'analyse</span>
                }
              </button>
            </div>
          </div>
          
          @if (analysisResult()) {
            <div class="analysis-result" [class]="analysisResult()?.success ? 'success' : 'error'">
              <h3>Résultats de l'analyse</h3>
              <div class="result-details">
                <p><strong>Intervalle :</strong> {{ analysisResult()?.interval }}</p>
                <p><strong>Emails trouvés :</strong> {{ analysisResult()?.totalFound }}</p>
                <p><strong>Emails traités :</strong> {{ analysisResult()?.processedCount }}</p>
                @if (analysisErrors().length > 0) {
                  <details>
                    <summary>Erreurs ({{ analysisErrors().length }})</summary>
                    <ul class="error-list">
                      @for (error of analysisErrors(); track error) {
                        <li>{{ error }}</li>
                      }
                    </ul>
                  </details>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nlp-dashboard {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .dashboard-header h1 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 2.5em;
    }

    .dashboard-header p {
      color: #666;
      font-size: 1.1em;
    }

    .stats-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      background: white;
    }

    .stat-card.primary { border-left: 4px solid #2196F3; }
    .stat-card.success { border-left: 4px solid #4CAF50; }
    .stat-card.info { border-left: 4px solid #00BCD4; }
    .stat-card.warning { border-left: 4px solid #FF9800; }

    .stat-icon {
      font-size: 2.5em;
      opacity: 0.7;
    }

    .stat-content h3 {
      margin: 0;
      font-size: 2em;
      font-weight: bold;
      color: #333;
    }

    .stat-content p {
      margin: 5px 0 0 0;
      color: #666;
      font-size: 0.9em;
    }

    .nlp-features {
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .feature-section {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .feature-section h2 {
      margin: 0 0 25px 0;
      color: #333;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 25px;
    }

    .feature-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
    }

    .feature-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .feature-header h3 {
      margin: 0;
      color: #333;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    .status-badge.active {
      background: #e8f5e8;
      color: #388e3c;
    }

    .feature-details p {
      margin: 8px 0;
      font-size: 14px;
      color: #555;
    }

    .feature-stats {
      display: flex;
      gap: 15px;
      margin-top: 15px;
      font-size: 12px;
    }

    .classification-breakdown, .recent-activity, .configuration-panel, .action-center {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .breakdown-chart {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .breakdown-item {
      padding: 15px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .breakdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .type-label {
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

    .count {
      font-weight: bold;
      color: #333;
    }

    .breakdown-bar {
      width: 100%;
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #2196F3, #21CBF3);
      transition: width 0.3s ease;
    }

    .breakdown-stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .activity-icon {
      font-size: 1.5em;
      width: 40px;
      text-align: center;
    }

    .activity-content {
      flex: 1;
    }

    .activity-description {
      color: #333;
      margin-bottom: 5px;
    }

    .activity-meta {
      display: flex;
      gap: 15px;
      font-size: 12px;
      color: #666;
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .config-item label {
      font-weight: 500;
      color: #555;
    }

    .config-value {
      color: #333;
      font-family: monospace;
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: box-shadow 0.2s;
      text-decoration: none;
      color: inherit;
    }

    .action-btn:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .btn-icon {
      font-size: 2em;
    }

    .btn-text h3 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .btn-text p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .no-activity {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .btn-secondary {
      background: #757575;
      color: white;
    }

    /* Styles pour la section d'ingestion d'emails */
    .email-ingestion-section {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      border-left: 4px solid #4caf50;
    }

    .email-ingestion-section h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 1.5em;
    }

    .email-ingestion-section p {
      margin: 0 0 20px 0;
      color: #666;
    }

    .ingestion-controls {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .control-actions {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }

    .test-btn, .ingest-btn {
      padding: 10px 20px;
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

    .test-btn {
      background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
      color: white;
    }

    .test-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      transform: translateY(-2px);
    }

    .ingest-btn {
      background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
      color: white;
    }

    .ingest-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #388e3c 0%, #2e7d32 100%);
      transform: translateY(-2px);
    }

    .ingest-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .ingest-btn.ingesting {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    }

    .connection-result, .ingestion-result {
      margin-top: 20px;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid;
    }

    .connection-result.success, .ingestion-result.success {
      background: #f1f8e9;
      border-color: #4caf50;
      color: #2e7d32;
    }

    .connection-result.error, .ingestion-result.error {
      background: #ffebee;
      border-color: #f44336;
      color: #d32f2f;
    }

    .analyze-checkbox {
      margin-right: 8px;
    }

    /* Styles pour la section d'analyse d'emails */
    .email-analysis-section {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .email-analysis-section h2 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 1.5em;
    }

    .analysis-controls {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .control-group label {
      font-weight: 500;
      color: #555;
      min-width: 150px;
    }

    .interval-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      min-width: 200px;
    }

    .force-checkbox {
      margin-right: 8px;
    }

    .analyze-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 200px;
      justify-content: center;
    }

    .analyze-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .analyze-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .analyze-btn.analyzing {
      background: linear-gradient(135deg, #ffa726 0%, #ff7043 100%);
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .analysis-result {
      margin-top: 20px;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid;
    }

    .analysis-result.success {
      background: #f1f8e9;
      border-color: #4caf50;
    }

    .analysis-result.error {
      background: #ffebee;
      border-color: #f44336;
    }

    .analysis-result h3 {
      margin: 0 0 15px 0;
      color: #333;
    }

    .result-details p {
      margin: 8px 0;
      color: #555;
    }

    .error-list {
      margin: 10px 0;
      padding-left: 20px;
    }

    .error-list li {
      margin: 5px 0;
      color: #d32f2f;
    }

    @media (min-width: 768px) {
      .analysis-controls {
        flex-direction: row;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      
      .control-group {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class NlpDashboardComponent implements OnInit {
  stats = signal<NLPStats>({
    totalProcessed: 127,
    accuracyRate: 89,
    classificationBreakdown: {
      'ACK': 45,
      'REJECTED': 23,
      'INTERVIEW': 18,
      'OFFER': 8,
      'REQUEST': 15,
      'OTHER': 18
    },
    recentActivity: [
      {
        id: '1',
        type: 'classification',
        description: 'Email classifié automatiquement comme INTERVIEW',
        timestamp: '2024-09-27T10:30:00Z',
        confidence: 0.94
      },
      {
        id: '2',
        type: 'matching',
        description: 'Email lié automatiquement à la candidature TechCorp',
        timestamp: '2024-09-27T09:15:00Z',
        confidence: 0.87
      },
      {
        id: '3',
        type: 'extraction',
        description: 'Entités extraites: Entreprise "DataViz", Poste "Data Scientist"',
        timestamp: '2024-09-27T08:45:00Z',
        confidence: 0.92
      }
    ]
  });

  classificationBreakdown = computed(() => {
    const breakdown = this.stats().classificationBreakdown;
    const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

    return Object.entries(breakdown).map(([type, count], index) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      avgConfidence: 85 + (index * 3) // Valeurs fixes basées sur l'index
    }));
  });

  // Computed pour les erreurs d'analyse
  analysisErrors = computed(() => {
    const result = this.analysisResult();
    return result?.errors || [];
  });

  // Propriétés pour l'ingestion d'emails
  selectedIngestionInterval = '7';
  analyzeAfterIngestion = true;
  isTestingConnection = signal(false);
  isIngesting = signal(false);
  connectionTested = signal(false);
  connectionResult = signal<{success: boolean; message: string} | null>(null);
  ingestionResult = signal<{
    success: boolean;
    message: string;
    emails_found: number;
    emails_saved: number;
    analysis?: {
      processed_count: number;
      errors: string[];
    };
  } | null>(null);

  // Propriétés pour l'analyse d'emails
  selectedInterval = 'days-30';
  forceReprocess = false;
  isAnalyzing = signal(false);
  analysisResult = signal<{
    success: boolean;
    message: string;
    processedCount: number;
    totalFound: number;
    interval: string;
    errors?: string[];
  } | null>(null);

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.loadNLPStats();
  }

  private loadNLPStats() {
    // Charger les vraies stats depuis le backend
    this.emailService.getNLPStats().subscribe({
      next: (backendStats) => {
        console.log('Stats NLP reçues:', backendStats);
        // Mettre à jour le signal avec les vraies données
        this.stats.set(backendStats);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des stats NLP:', error);
        console.log('Utilisation des stats de démonstration (backend non disponible)');
        // On garde les stats mockées par défaut
      }
    });
  }

  testEmailConnection() {
    if (this.isTestingConnection()) return;
    
    this.isTestingConnection.set(true);
    this.connectionResult.set(null);
    
    this.emailService.testEmailConnection().subscribe({
      next: (result) => {
        console.log('Test de connexion:', result);
        this.connectionResult.set(result);
        this.connectionTested.set(result.success);
        this.isTestingConnection.set(false);
      },
      error: (error) => {
        console.error('Erreur test de connexion:', error);
        this.connectionResult.set({
          success: false,
          message: 'Erreur lors du test de connexion'
        });
        this.connectionTested.set(false);
        this.isTestingConnection.set(false);
      }
    });
  }

  startEmailIngestion() {
    if (this.isIngesting()) return;
    
    this.isIngesting.set(true);
    this.ingestionResult.set(null);
    
    const options = {
      daysBack: parseInt(this.selectedIngestionInterval),
      analyzeAfterIngestion: this.analyzeAfterIngestion
    };
    
    this.emailService.ingestEmails(options).subscribe({
      next: (result) => {
        console.log('Résultats ingestion:', result);
        this.ingestionResult.set(result);
        this.isIngesting.set(false);
        // Recharger les stats après l'ingestion
        this.loadNLPStats();
      },
      error: (error) => {
        console.error('Erreur lors de l\'ingestion:', error);
        this.ingestionResult.set({
          success: false,
          message: 'Erreur lors de l\'ingestion des emails',
          emails_found: 0,
          emails_saved: 0
        });
        this.isIngesting.set(false);
      }
    });
  }

  startEmailAnalysis() {
    if (this.isAnalyzing()) return;
    
    this.isAnalyzing.set(true);
    this.analysisResult.set(null);
    
    // Parser l'intervalle sélectionné
    const [unit, value] = this.selectedInterval.split('-');
    const options: any = {
      forceReprocess: this.forceReprocess
    };
    
    if (unit === 'hours') {
      options.hoursBack = parseInt(value);
    } else {
      options.daysBack = parseInt(value);
    }
    
    this.emailService.batchProcessEmails(options).subscribe({
      next: (result) => {
        console.log('Résultats de l\'analyse:', result);
        this.analysisResult.set({
          success: true,
          message: result.message,
          processedCount: result.processed_count,
          totalFound: result.total_found,
          interval: result.interval,
          errors: result.errors || []
        });
        this.isAnalyzing.set(false);
        // Recharger les stats après l'analyse
        this.loadNLPStats();
      },
      error: (error) => {
        console.error('Erreur lors de l\'analyse:', error);
        this.analysisResult.set({
          success: false,
          message: 'Erreur lors de l\'analyse des emails',
          processedCount: 0,
          totalFound: 0,
          interval: this.selectedInterval,
          errors: [error.message || 'Erreur inconnue']
        });
        this.isAnalyzing.set(false);
      }
    });
  }

  refreshStats() {
    this.loadNLPStats();
  }

  getActiveModels(): string[] {
    return ['mistral-small-latest', 'mistral-embed', 'mistral-large-latest'];
  }

  getCostEstimate(): number {
    // Estimation basée sur le nombre d'emails traités
    const costPerEmail = 0.005; // 0.5 centimes par email
    return Math.round(this.stats().totalProcessed * costPerEmail * 100) / 100;
  }

  getServiceStats(service: string): { success: number, errors: number } {
    // Stats mockées pour chaque service
    const serviceStats: { [key: string]: { success: number, errors: number } } = {
      'extraction': { success: 124, errors: 3 },
      'classification': { success: 120, errors: 7 },
      'matching': { success: 89, errors: 12 }
    };
    return serviceStats[service] || { success: 0, errors: 0 };
  }

  getEmailTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'ACK': 'Accusé réception',
      'REJECTED': 'Refusé',
      'INTERVIEW': 'Entretien',
      'OFFER': 'Offre',
      'REQUEST': 'Demande',
      'OTHER': 'Autre'
    };
    return labels[type] || type;
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'classification': '🏷️',
      'matching': '🎯',
      'extraction': '🔍',
      'processing': '⚙️'
    };
    return icons[type] || '📧';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Il y a moins d\'1h';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString('fr-FR');
  }
}
