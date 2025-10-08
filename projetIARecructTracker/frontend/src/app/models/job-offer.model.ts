export interface JobOffer {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: 'CDI' | 'CDD' | 'FREELANCE' | 'STAGE' | 'ALTERNANCE';
  remote_policy?: 'ON_SITE' | 'REMOTE' | 'HYBRID';
  skills_required?: string[];
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  posted_date?: string;
  application_deadline?: string;
  external_url?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  company?: any; // Company will be imported separately
}

export interface CreateJobOfferRequest {
  company_id: string;
  title: string;
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: 'CDI' | 'CDD' | 'FREELANCE' | 'STAGE' | 'ALTERNANCE';
  remote_policy?: 'ON_SITE' | 'REMOTE' | 'HYBRID';
  skills_required?: string[];
  status?: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  posted_date?: string;
  application_deadline?: string;
  external_url?: string;
}

export interface UpdateJobOfferRequest extends Partial<CreateJobOfferRequest> {
}
