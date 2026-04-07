/**
 * Core type definitions for Bus2API enterprise frontend
 */

// ==================== Auth Types ====================

export interface LoginRequest {
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
  temp_token: string
  code: string
}

export type LoginResponse = AuthResponse | TotpLoginResponse

// ==================== User Types ====================

export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  balance: number
  status: string
  created_at: string
  updated_at: string
}

// ==================== API Key Types ====================

export interface ApiKey {
  id: number
  name: string
  key: string
  user_id: number
  group_id?: number
  status: 'active' | 'inactive'
  quota: number
  used_quota: number
  ip_whitelist?: string[]
  ip_blacklist?: string[]
  rate_limit_5h?: number
  rate_limit_1d?: number
  rate_limit_7d?: number
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface CreateApiKeyRequest {
  name: string
  group_id?: number | null
  custom_key?: string
  ip_whitelist?: string[]
  ip_blacklist?: string[]
  quota?: number
  expires_in_days?: number
  rate_limit_5h?: number
  rate_limit_1d?: number
  rate_limit_7d?: number
}

export interface UpdateApiKeyRequest {
  name?: string
  status?: 'active' | 'inactive'
  group_id?: number | null
  ip_whitelist?: string[]
  ip_blacklist?: string[]
  quota?: number
  rate_limit_5h?: number
  rate_limit_1d?: number
  rate_limit_7d?: number
}

// ==================== Usage Types ====================

export interface UsageLog {
  id: number
  api_key_id: number
  api_key_name?: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
  total_tokens: number
  cost: number
  actual_cost: number
  duration_ms: number
  status: string
  created_at: string
}

export interface UsageQueryParams {
  page?: number
  page_size?: number
  api_key_id?: number
  start_date?: string
  end_date?: string
  model?: string
}

export interface DashboardStats {
  total_api_keys: number
  active_api_keys: number
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_creation_tokens: number
  total_cache_read_tokens: number
  total_tokens: number
  total_cost: number
  total_actual_cost: number
  today_requests: number
  today_input_tokens: number
  today_output_tokens: number
  today_cache_creation_tokens: number
  today_cache_read_tokens: number
  today_tokens: number
  today_cost: number
  today_actual_cost: number
  average_duration_ms: number
  rpm: number
  tpm: number
}

export interface TrendDataPoint {
  date: string
  requests: number
  tokens: number
  cost: number
}

export interface TrendResponse {
  trend: TrendDataPoint[]
  start_date: string
  end_date: string
  granularity: string
}

export interface ModelStat {
  model: string
  requests: number
  tokens: number
  cost: number
}

export interface ModelStatsResponse {
  models: ModelStat[]
  start_date: string
  end_date: string
}

// ==================== Pagination ====================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ==================== Settings ====================

export interface PublicSettings {
  site_name?: string
  registration_enabled?: boolean
  turnstile_enabled?: boolean
  turnstile_site_key?: string
  email_verify_enabled?: boolean
  invitation_code_required?: boolean
  oauth_providers?: string[]
  simple_mode?: boolean
  backend_mode?: boolean
}
