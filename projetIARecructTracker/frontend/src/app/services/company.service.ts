import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Company, CreateCompanyRequest, UpdateCompanyRequest, PaginatedResponse, FilterParams } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly baseUrl = `${environment.apiUrl}/companies/`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer toutes les entreprises avec pagination et filtres
   */
  getCompanies(filters?: FilterParams): Observable<PaginatedResponse<Company>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<Company>>(this.baseUrl, { params });
  }

  /**
   * Récupérer une entreprise par ID
   */
  getCompany(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.baseUrl}/${id}`);
  }

  /**
   * Créer une nouvelle entreprise
   */
  createCompany(company: CreateCompanyRequest): Observable<Company> {
    return this.http.post<Company>(this.baseUrl, company);
  }

  /**
   * Mettre à jour une entreprise
   */
  updateCompany(id: string, company: UpdateCompanyRequest): Observable<Company> {
    return this.http.put<Company>(`${this.baseUrl}/${id}`, company);
  }

  /**
   * Supprimer une entreprise
   */
  deleteCompany(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Rechercher des entreprises par nom
   */
  searchCompanies(query: string): Observable<Company[]> {
    const params = new HttpParams().set('search', query).set('size', '10');
    return this.http.get<Company[]>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Récupérer les statistiques d'une entreprise
   */
  getCompanyStats(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/stats`);
  }
}
