/**
 * Auth & User type definitions
 */

// ==================== Auth Types ====================

export interface LoginRequest {
  company_name: string
  email: string
  password: string
  turnstile_token?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  user: User
}

export interface TotpLoginResponse {
  requires_2fa: true
  temp_token: string
}

export interface TotpLogin2FARequest {
  company_name: string
  temp_token: string
  totp_code: string
}

export type LoginResponse = AuthResponse | TotpLoginResponse

// ==================== User Types ====================

export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  balance: number
  concurrency: number
  status: 'active' | 'disabled'
  allowed_groups: number[] | null
  enterprise_name?: string
  enterprise_display_name?: string
  enterprise_support_contact?: string
  created_at: string
  updated_at: string
}

export interface AdminUser extends User {
  notes: string
  group_rates?: Record<number, number>
  current_concurrency?: number
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  username?: string
  notes?: string
  role?: 'admin' | 'user'
  balance?: number
  concurrency?: number
  status?: 'active' | 'disabled'
  allowed_groups?: number[] | null
  group_rates?: Record<number, number | null>
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

// ==================== Settings ====================

export interface PublicSettings {
  site_name?: string
  enterprise_name?: string
  enterprise_display_name?: string
  enterprise_support_contact?: string
  registration_enabled?: boolean
  turnstile_enabled?: boolean
  turnstile_site_key?: string
  email_verify_enabled?: boolean
  invitation_code_required?: boolean
  oauth_providers?: string[]
  simple_mode?: boolean
  backend_mode?: boolean
}
