import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  Email, 
  ProcessEmailRequest, 
  NLPProcessingResult, 
  PaginatedResponse, 
  FilterParams 
} from '../models';

// Interface pour les statistiques de l'API backend
interface BackendNLPStats {
  total_emails: number;
  classified_emails: number;
  linked_emails: number;
  classification_rate: number;
  linking_rate: number;
  classification_breakdown: { [key: string]: number };
}

// Interface pour les statistiques du frontend
export interface FrontendNLPStats {
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

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly baseUrl = `${environment.apiUrl}/emails`;
  private readonly nlpUrl = `${environment.apiUrl}/nlp`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer tous les emails avec pagination et filtres
   */
  getEmails(filters?: FilterParams): Observable<PaginatedResponse<Email>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<Email>>(this.baseUrl, { params });
  }

  /**
   * Récupérer un email par ID
   */
  getEmail(id: string): Observable<Email> {
    return this.http.get<Email>(`${this.baseUrl}/${id}`);
  }

  /**
   * Supprimer un email
   */
  deleteEmail(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupérer les emails par candidature
   */
  getEmailsByApplication(applicationId: string): Observable<Email[]> {
    return this.http.get<Email[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('application_id', applicationId)
    });
  }

  /**
   * Récupérer les emails non traités
   */
  getUnprocessedEmails(): Observable<Email[]> {
    return this.http.get<Email[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('is_processed', 'false')
    });
  }

  /**
   * Marquer un email comme traité
   */
  markAsProcessed(id: string): Observable<Email> {
    return this.http.patch<Email>(`${this.baseUrl}/${id}/processed`, {
      is_processed: true
    });
  }

  /**
   * Lier un email à une candidature
   */
  linkToApplication(emailId: string, applicationId: string): Observable<Email> {
    return this.http.patch<Email>(`${this.baseUrl}/${emailId}/link`, {
      application_id: applicationId
    });
  }

  /**
   * Délier un email d'une candidature
   */
  unlinkFromApplication(emailId: string): Observable<Email> {
    return this.http.patch<Email>(`${this.baseUrl}/${emailId}/unlink`, {});
  }

  // =============================================================================
  // Services NLP
  // =============================================================================

  /**
   * Traitement NLP complet d'un email
   */
  processEmailWithNLP(email: ProcessEmailRequest): Observable<NLPProcessingResult> {
    return this.http.post<NLPProcessingResult>(`${this.nlpUrl}/process`, email);
  }

  /**
   * Extraction d'entités uniquement
   */
  extractEntities(email: ProcessEmailRequest): Observable<any> {
    return this.http.post(`${this.nlpUrl}/extract`, email);
  }

  /**
   * Classification d'email uniquement
   */
  classifyEmail(email: ProcessEmailRequest): Observable<any> {
    return this.http.post(`${this.nlpUrl}/classify`, email);
  }

  /**
   * Matching avec candidatures existantes
   */
  matchWithApplications(email: ProcessEmailRequest): Observable<any> {
    return this.http.post(`${this.nlpUrl}/match`, email);
  }

  /**
   * Retraitement d'un email existant
   */
  reprocessEmail(emailId: string): Observable<NLPProcessingResult> {
    return this.http.post<NLPProcessingResult>(`${this.nlpUrl}/reprocess/${emailId}`, {});
  }

  /**
   * Récupérer les statistiques NLP
   */
  getNLPStats(): Observable<FrontendNLPStats> {
    return this.http.get<BackendNLPStats>(`${this.nlpUrl}/stats`).pipe(
      map(backendStats => ({
        totalProcessed: backendStats.total_emails,
        accuracyRate: Math.round(backendStats.classification_rate * 100),
        classificationBreakdown: backendStats.classification_breakdown,
        recentActivity: [] // Pas d'activité récente dans l'API pour le moment
      }))
    );
  }

  /**
   * Batch processing de plusieurs emails avec intervalle de temps
   */
  batchProcessEmails(options: {
    daysBack?: number;
    hoursBack?: number;
    forceReprocess?: boolean;
  } = {}): Observable<any> {
    return this.http.post(`${this.nlpUrl}/batch-process`, {
      days_back: options.daysBack || 30,
      hours_back: options.hoursBack,
      force_reprocess: options.forceReprocess || false
    });
  }

  /**
   * Ingérer les emails depuis la boîte mail de l'utilisateur
   */
  ingestEmails(options: {
    daysBack?: number;
    analyzeAfterIngestion?: boolean;
  } = {}): Observable<any> {
    return this.http.post(`${environment.apiUrl}/email-ingestion/ingest`, {
      days_back: options.daysBack || 30,
      analyze_after_ingestion: options.analyzeAfterIngestion !== false
    });
  }

  /**
   * Tester la connexion IMAP
   */
  testEmailConnection(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/email-ingestion/test-connection`);
  }

  /**
   * Récupérer l'historique de traitement d'un email
   */
  getProcessingHistory(emailId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${emailId}/processing-history`);
  }

  /**
   * Valider/corriger la classification automatique
   */
  validateClassification(emailId: string, correctType: string, feedback?: string): Observable<Email> {
    return this.http.patch<Email>(`${this.baseUrl}/${emailId}/validate-classification`, {
      correct_type: correctType,
      feedback
    });
  }

  /**
   * Import d'emails depuis une source externe (IMAP, etc.)
   */
  importEmails(source: string, config: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/import`, {
      source,
      config
    });
  }

}
