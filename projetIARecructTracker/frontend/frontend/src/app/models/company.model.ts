export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large';
  location?: string;
  description?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large';
  location?: string;
  description?: string;
  logo_url?: string;
}

export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {
}
