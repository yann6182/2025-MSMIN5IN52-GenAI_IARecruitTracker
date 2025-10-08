export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  
  // Champs OAuth optionnels
  google_id?: string;
  gmail_connected?: boolean;
  gmail_email?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  expires_in?: number;
}

export interface AuthError {
  detail: string;
  code?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UserProfile {
  full_name: string;
  email: string;
}

// Énumérations pour les rôles et statuts
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  TOKEN_EXPIRED = 'token_expired',
  ACCOUNT_DISABLED = 'account_disabled',
  EMAIL_NOT_VERIFIED = 'email_not_verified'
}
