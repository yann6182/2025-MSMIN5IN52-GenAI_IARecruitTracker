// Export all models
export * from './company.model';
export * from './job-offer.model';
export * from './job-application.model';
export * from './email.model';
export * from './application-event.model';

// Common types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface FilterParams {
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  [key: string]: any;
}
