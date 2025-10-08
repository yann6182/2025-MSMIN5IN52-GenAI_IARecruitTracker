import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProcessingResult {
  success: boolean;
  message: string;
  results: {
    processed_emails: number;
    created_applications: number;
    updated_applications: number;
    linked_emails: number;
    details: Array<{
      action: string;
      application_id: string;
      email_id: string;
      company: string;
      job_title: string;
      status_change?: string;
      details: any;
    }>;
    errors: Array<{
      email_id: string;
      subject: string;
      error: string;
    }>;
  };
}

export interface ProcessingSummary {
  success: boolean;
  data: {
    total_applications: number;
    auto_created_applications: number;
    manual_applications: number;
    total_emails: number;
    linked_emails: number;
    unprocessed_emails: number;
    status_breakdown: { [key: string]: number };
    automation_rate: number;
  };
}

export interface ApplicationInsights {
  success: boolean;
  data: {
    application: {
      id: string;
      job_title: string;
      company_name: string;
      status: string;
      created_date: string;
      last_update: string;
    };
    email_count: number;
    email_timeline: Array<{
      date: string;
      subject: string;
      sender: string;
      classification: string;
      snippet?: string;
    }>;
    metrics: {
      average_response_time_days: number;
      total_interactions: number;
      days_since_last_contact?: number;
    };
    recommendations: Array<{
      type: string;
      message: string;
      priority: string;
    }>;
  };
}

export interface ExcelExport {
  success: boolean;
  data: {
    total_records: number;
    records: Array<{
      ID: string;
      Entreprise: string;
      Poste: string;
      Statut: string;
      "Date candidature": string;
      "Dernière interaction": string;
      "Nombre d'emails": number;
      Contact: string;
      Localisation: string;
      Source: string;
      Urgence: string;
      "Date entretien"?: string;
      "Dernière classification"?: string;
      "Dernier expéditeur"?: string;
      "Notes automatiques"?: string;
      "Création automatique": string;
    }>;
    columns: string[];
    export_date: string;
    filters_applied: {
      company?: string;
      status?: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class IntelligentTrackerService {
  private readonly baseUrl = `${environment.apiUrl}/intelligent-tracker`;

  constructor(private http: HttpClient) {}

  /**
   * Lance l'analyse intelligente des emails pour détecter et mettre à jour les candidatures
   */
  processEmails(limit: number = 50): Observable<ProcessingResult> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.post<ProcessingResult>(`${this.baseUrl}/process-emails`, {}, { params });
  }

  /**
   * Obtient un résumé du traitement automatique des candidatures
   */
  getProcessingSummary(): Observable<ProcessingSummary> {
    return this.http.get<ProcessingSummary>(`${this.baseUrl}/processing-summary`);
  }

  /**
   * Active ou désactive le traitement automatique des emails
   */
  configureAutoProcessing(enabled: boolean, intervalMinutes: number = 15): Observable<any> {
    const params = new HttpParams()
      .set('enabled', enabled.toString())
      .set('interval_minutes', intervalMinutes.toString());
    
    return this.http.post(`${this.baseUrl}/auto-process`, {}, { params });
  }

  /**
   * Obtient des insights détaillés sur une candidature spécifique
   */
  getApplicationInsights(applicationId: string): Observable<ApplicationInsights> {
    return this.http.get<ApplicationInsights>(`${this.baseUrl}/application-insights/${applicationId}`);
  }

  /**
   * Simule un export Excel des candidatures avec toutes les données extraites automatiquement
   */
  getExcelExport(companyFilter?: string, statusFilter?: string): Observable<ExcelExport> {
    let params = new HttpParams();
    
    if (companyFilter) {
      params = params.set('company_filter', companyFilter);
    }
    
    if (statusFilter) {
      params = params.set('status_filter', statusFilter);
    }
    
    return this.http.post<ExcelExport>(`${this.baseUrl}/simulate-excel-import`, {}, { params });
  }

  /**
   * Exporte les données au format CSV pour ouverture dans Excel
   */
  exportToCSV(data: ExcelExport['data']): void {
    if (!data.records.length) {
      return;
    }

    // Créer l'en-tête CSV
    const headers = data.columns.join(',');
    
    // Créer les lignes de données
    const csvRows = data.records.map(record => {
      return data.columns.map(column => {
        const value = record[column as keyof typeof record];
        // Échapper les guillemets et encapsuler les valeurs qui contiennent des virgules
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    });

    // Combiner l'en-tête et les données
    const csvContent = [headers, ...csvRows].join('\n');
    
    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `candidatures_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
