import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApplicationEvent, CreateEventRequest, PaginatedResponse, FilterParams } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApplicationEventService {
  private readonly baseUrl = `${environment.apiUrl}/application-events/`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer tous les événements avec pagination et filtres
   */
  getEvents(filters?: FilterParams): Observable<PaginatedResponse<ApplicationEvent>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<ApplicationEvent>>(this.baseUrl, { params });
  }

  /**
   * Récupérer un événement par ID
   */
  getEvent(id: string): Observable<ApplicationEvent> {
    return this.http.get<ApplicationEvent>(`${this.baseUrl}/${id}`);
  }

  /**
   * Créer un nouvel événement
   */
  createEvent(event: CreateEventRequest): Observable<ApplicationEvent> {
    return this.http.post<ApplicationEvent>(this.baseUrl, event);
  }

  /**
   * Supprimer un événement
   */
  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupérer les événements par candidature
   */
  getEventsByApplication(applicationId: string): Observable<ApplicationEvent[]> {
    return this.http.get<ApplicationEvent[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('application_id', applicationId)
    });
  }

  /**
   * Récupérer les événements récents
   */
  getRecentEvents(limit: number = 10): Observable<ApplicationEvent[]> {
    return this.http.get<ApplicationEvent[]>(`${this.baseUrl}/recent`, {
      params: new HttpParams().set('limit', limit.toString())
    });
  }

  /**
   * Récupérer les événements par type
   */
  getEventsByType(eventType: string): Observable<ApplicationEvent[]> {
    return this.http.get<ApplicationEvent[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('event_type', eventType)
    });
  }

  /**
   * Créer un événement de changement de statut
   */
  createStatusChangeEvent(applicationId: string, oldStatus: string, newStatus: string, reason?: string): Observable<ApplicationEvent> {
    return this.createEvent({
      application_id: applicationId,
      event_type: 'STATUS_CHANGED',
      description: `Statut changé de ${oldStatus} vers ${newStatus}${reason ? ` - ${reason}` : ''}`,
      metadata: {
        old_status: oldStatus,
        new_status: newStatus,
        reason
      }
    });
  }

  /**
   * Créer un événement d'email reçu
   */
  createEmailReceivedEvent(applicationId: string, emailId: string, subject: string, sender: string): Observable<ApplicationEvent> {
    return this.createEvent({
      application_id: applicationId,
      event_type: 'EMAIL_RECEIVED',
      description: `Email reçu de ${sender}: ${subject}`,
      metadata: {
        email_id: emailId,
        sender,
        subject
      }
    });
  }

  /**
   * Créer un événement d'entretien planifié
   */
  createInterviewScheduledEvent(applicationId: string, interviewDate: string, location?: string): Observable<ApplicationEvent> {
    return this.createEvent({
      application_id: applicationId,
      event_type: 'INTERVIEW_SCHEDULED',
      description: `Entretien planifié le ${new Date(interviewDate).toLocaleDateString()}${location ? ` à ${location}` : ''}`,
      event_date: interviewDate,
      metadata: {
        interview_date: interviewDate,
        location
      }
    });
  }
}
