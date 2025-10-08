export interface Email {
  id: string;
  external_id?: string;
  subject: string;
  sender?: string;
  recipients?: string[];
  cc?: string[];
  bcc?: string[];
  sent_at: string;
  application_id?: string;
  snippet?: string;
  language?: string;
  classification?: 'ACK' | 'REJECTED' | 'INTERVIEW' | 'OFFER' | 'REQUEST' | 'OTHER';
  raw_headers?: string;
  raw_body?: string;
  created_at: string;
  
  // Relations
  application?: any; // JobApplication
}

export interface EmailExtractedEntities {
  company?: string;
  job_title?: string;
  contact_person?: string;
  contact_email?: string;
  dates?: string[];
  keywords?: string[];
  location?: string;
  salary?: string;
}

export interface EmailClassification {
  email_type: 'ACK' | 'REJECTED' | 'INTERVIEW' | 'OFFER' | 'REQUEST' | 'OTHER';
  confidence: number;
  reasoning: string;
  suggested_status?: string;
}

export interface EmailMatching {
  application_id?: string;
  confidence: number;
  reasoning: string;
  auto_linked: boolean;
}

export interface NLPProcessingResult {
  entities: EmailExtractedEntities;
  classification: EmailClassification;
  matching: EmailMatching;
  processing_time: number;
  model_used: string;
}

export interface ProcessEmailRequest {
  subject: string;
  body: string;
  sender_email: string; // Keep as sender_email for backend compatibility
  sender_name?: string;
  received_date?: string;
}
