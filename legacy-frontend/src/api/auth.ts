/**
 * Authentication API endpoints
 */

import { apiClient } from './client'
import type {
  LoginRequest,
  LoginResponse,
  AuthResponse,
  TotpLogin2FARequest,
  PublicSettings,
} from '@/types'

/** Type guard: check if login response requires 2FA */
export function isTotp2FARequired(
  response: LoginResponse,
): response is { requires_2fa: true; temp_token: string } {
  return 'requires_2fa' in response && (response as unknown as Record<string, unknown>).requires_2fa === true
}

/** Store auth tokens in localStorage */
function storeTokens(data: AuthResponse): void {
  localStorage.setItem('auth_token', data.access_token)
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token)
  }
  if (data.expires_in) {
    const expiresAt = Date.now() + data.expires_in * 1000
    localStorage.setItem('token_expires_at', String(expiresAt))
  }
  localStorage.setItem('auth_user', JSON.stringify(data.user))
}

/** User login */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials)
  if (!isTotp2FARequired(data)) {
    storeTokens(data as AuthResponse)
  }
  return data
}

/** Complete login with 2FA code */
export async function login2FA(request: TotpLogin2FARequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login/2fa', request)
  storeTokens(data)
  return data
}

/** Get current authenticated user */
export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const { data } = await apiClient.get<AuthResponse['user']>('/auth/me')
  return data
}

/** User logout */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout', { refresh_token: refreshToken })
    } catch {
      // Ignore - still clear local state
    }
  }
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('token_expires_at')
}

/** Get public settings */
export async function getPublicSettings(): Promise<PublicSettings> {
  const { data } = await apiClient.get<PublicSettings>('/settings/public')
  return data
}

export const authAPI = {
  login,
  login2FA,
  getCurrentUser,
  logout,
  getPublicSettings,
  isTotp2FARequired,
}
