/**
 * Auth store - manages authentication state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, isTotp2FARequired } from '@/api/auth'
import type { User, LoginRequest, AuthResponse } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)

  const isAdmin = computed(() => user.value?.role === 'admin')
  const username = computed(() => user.value?.username ?? '')
  const balance = computed(() => user.value?.balance ?? 0)

  /** Restore auth state from localStorage */
  function checkAuth(): void {
    const token = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')
    if (token && savedUser) {
      try {
        user.value = JSON.parse(savedUser) as User
        isAuthenticated.value = true
      } catch {
        clearAuth()
      }
    }
  }

  /** Login with email/password */
  async function login(credentials: LoginRequest): Promise<{
    success: boolean
    requires2FA?: boolean
    tempToken?: string
  }> {
    const response = await authAPI.login(credentials)
    if (isTotp2FARequired(response)) {
      return { success: true, requires2FA: true, tempToken: response.temp_token }
    }
    const authResp = response as AuthResponse
    user.value = authResp.user
    isAuthenticated.value = true
    return { success: true }
  }

  /** Complete 2FA login */
  async function complete2FA(tempToken: string, code: string): Promise<void> {
    const response = await authAPI.login2FA({ temp_token: tempToken, totp_code: code })
    user.value = response.user
    isAuthenticated.value = true
  }

  /** Refresh user profile from server */
  async function refreshProfile(): Promise<void> {
    try {
      const userData = await authAPI.getCurrentUser()
      user.value = userData
      localStorage.setItem('auth_user', JSON.stringify(userData))
    } catch {
      // Token might be invalid
      clearAuth()
    }
  }

  /** Logout */
  async function logout(): Promise<void> {
    await authAPI.logout()
    clearAuth()
  }

  function clearAuth(): void {
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('token_expires_at')
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    username,
    balance,
    checkAuth,
    login,
    complete2FA,
    refreshProfile,
    logout,
    clearAuth,
  }
})
