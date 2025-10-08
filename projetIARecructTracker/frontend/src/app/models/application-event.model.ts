export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: 'APPLICATION_SUBMITTED' | 'EMAIL_RECEIVED' | 'STATUS_CHANGED' | 'INTERVIEW_SCHEDULED' | 'DOCUMENT_UPLOADED' | 'NOTE_ADDED' | 'FOLLOW_UP_SCHEDULED' | 'OFFER_RECEIVED' | 'REJECTION_RECEIVED';
  description: string;
  event_date: string;
  metadata?: Record<string, any>;
  user_id?: string;
  created_at: string;
  
  // Relations
  application?: any; // JobApplication
}

export interface CreateEventRequest {
  application_id: string;
  event_type: 'APPLICATION_SUBMITTED' | 'EMAIL_RECEIVED' | 'STATUS_CHANGED' | 'INTERVIEW_SCHEDULED' | 'DOCUMENT_UPLOADED' | 'NOTE_ADDED' | 'FOLLOW_UP_SCHEDULED' | 'OFFER_RECEIVED' | 'REJECTION_RECEIVED';
  description: string;
  event_date?: string;
  metadata?: Record<string, any>;
}
