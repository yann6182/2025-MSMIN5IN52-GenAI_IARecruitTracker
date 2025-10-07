export interface JobApplication {
  id: string;
  job_offer_id?: string; // Optionnel pour compatibilité
  job_title: string; // Nouveau champ pour correspondre au backend
  company_name: string; // Nouveau champ pour correspondre au backend
  location?: string;
  status: 'APPLIED' | 'ACKNOWLEDGED' | 'SCREENING' | 'INTERVIEW' | 'TECHNICAL_TEST' | 'OFFER' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN';
  applied_date?: string;
  last_update_date?: string;
  expected_salary?: number;
  motivation_letter?: string;
  cv_path?: string;
  cover_letter_path?: string;
  notes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  source?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  follow_up_date?: string;
  interview_date?: string;
  technical_test_date?: string;
  offer_date?: string;
  offer_amount?: number;
  offer_deadline?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  
  // Nouveaux champs pour le tracking intelligent
  response_deadline?: string;
  job_reference?: string;
  urgency_level?: 'NORMAL' | 'HIGH' | 'URGENT';
  
  // Relations
  job_offer?: any; // JobOffer
  emails?: any[]; // Email[]
  events?: any[]; // ApplicationEvent[]
}

export interface CreateJobApplicationRequest {
  job_offer_id?: string;
  job_title: string;
  company_name: string;
  location?: string;
  status?: 'APPLIED' | 'ACKNOWLEDGED' | 'SCREENING' | 'INTERVIEW' | 'TECHNICAL_TEST' | 'OFFER' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN';
  applied_date?: string;
  expected_salary?: number;
  motivation_letter?: string;
  cv_path?: string;
  cover_letter_path?: string;
  notes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  source?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  follow_up_date?: string;
  
  // Nouveaux champs pour le tracking intelligent
  response_deadline?: string;
  job_reference?: string;
  urgency_level?: 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface UpdateJobApplicationRequest extends Partial<CreateJobApplicationRequest> {
  status?: 'APPLIED' | 'ACKNOWLEDGED' | 'SCREENING' | 'INTERVIEW' | 'TECHNICAL_TEST' | 'OFFER' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN';
  last_update_date?: string;
  interview_date?: string;
  technical_test_date?: string;
  offer_date?: string;
  offer_amount?: number;
  offer_deadline?: string;
  rejection_reason?: string;
}
