import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobOffer, CreateJobOfferRequest, UpdateJobOfferRequest, PaginatedResponse, FilterParams } from '../models';

@Injectable({
  providedIn: 'root'
})
export class JobOfferService {
  private readonly baseUrl = `${environment.apiUrl}/job-offers/`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer toutes les offres d'emploi avec pagination et filtres
   */
  getJobOffers(filters?: FilterParams): Observable<PaginatedResponse<JobOffer>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<JobOffer>>(this.baseUrl, { params });
  }

  /**
   * Récupérer une offre d'emploi par ID
   */
  getJobOffer(id: string): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.baseUrl}/${id}`);
  }

  /**
   * Créer une nouvelle offre d'emploi
   */
  createJobOffer(jobOffer: CreateJobOfferRequest): Observable<JobOffer> {
    return this.http.post<JobOffer>(this.baseUrl, jobOffer);
  }

  /**
   * Mettre à jour une offre d'emploi
   */
  updateJobOffer(id: string, jobOffer: UpdateJobOfferRequest): Observable<JobOffer> {
    return this.http.put<JobOffer>(`${this.baseUrl}/${id}`, jobOffer);
  }

  /**
   * Supprimer une offre d'emploi
   */
  deleteJobOffer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Rechercher des offres d'emploi
   */
  searchJobOffers(query: string, filters?: any): Observable<JobOffer[]> {
    let params = new HttpParams().set('search', query).set('size', '20');
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<JobOffer[]>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Récupérer les offres d'emploi par entreprise
   */
  getJobOffersByCompany(companyId: string): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('company_id', companyId)
    });
  }

  /**
   * Récupérer les statistiques des offres d'emploi
   */
  getJobOffersStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`);
  }
}
