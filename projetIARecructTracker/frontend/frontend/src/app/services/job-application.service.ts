import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  JobApplication, 
  CreateJobApplicationRequest, 
  UpdateJobApplicationRequest, 
  PaginatedResponse, 
  FilterParams 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class JobApplicationService {
  private readonly baseUrl = `${environment.apiUrl}/job-applications/`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer toutes les candidatures avec pagination et filtres
   */
  getJobApplications(filters?: FilterParams): Observable<PaginatedResponse<JobApplication>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<JobApplication>>(this.baseUrl, { params });
  }

  /**
   * Récupérer une candidature par ID
   */
  getJobApplication(id: string): Observable<JobApplication> {
    return this.http.get<JobApplication>(`${this.baseUrl}/${id}`);
  }

  /**
   * Créer une nouvelle candidature
   */
  createJobApplication(application: CreateJobApplicationRequest): Observable<JobApplication> {
    return this.http.post<JobApplication>(this.baseUrl, application);
  }

  /**
   * Mettre à jour une candidature
   */
  updateJobApplication(id: string, application: UpdateJobApplicationRequest): Observable<JobApplication> {
    return this.http.put<JobApplication>(`${this.baseUrl}/${id}`, application);
  }

  /**
   * Supprimer une candidature
   */
  deleteJobApplication(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Changer le statut d'une candidature
   */
  updateStatus(id: string, status: string, notes?: string): Observable<JobApplication> {
    return this.http.patch<JobApplication>(`${this.baseUrl}/${id}/status`, {
      status,
      notes
    });
  }

  /**
   * Récupérer les candidatures par statut
   */
  getJobApplicationsByStatus(status: string): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('status', status)
    });
  }

  /**
   * Récupérer les candidatures par offre d'emploi
   */
  getJobApplicationsByOffer(jobOfferId: string): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('job_offer_id', jobOfferId)
    });
  }

  /**
   * Récupérer les statistiques des candidatures
   */
  getApplicationsStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`);
  }

  /**
   * Récupérer le tableau de bord des candidatures
   */
  getDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard`);
  }

  /**
   * Planifier un rappel pour une candidature
   */
  scheduleFollowUp(id: string, followUpDate: string, notes?: string): Observable<JobApplication> {
    return this.http.patch<JobApplication>(`${this.baseUrl}/${id}/follow-up`, {
      follow_up_date: followUpDate,
      notes
    });
  }

  /**
   * Marquer une candidature comme prioritaire
   */
  setPriority(id: string, priority: 'LOW' | 'MEDIUM' | 'HIGH'): Observable<JobApplication> {
    return this.http.patch<JobApplication>(`${this.baseUrl}/${id}/priority`, {
      priority
    });
  }
}
