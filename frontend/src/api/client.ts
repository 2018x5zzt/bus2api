/**
 * Axios HTTP client with API envelope unwrapping and token refresh support.
 *
 * Security hardening:
 *   - Base URL must be set via VITE_API_BASE_URL; no unsafe fallback.
 *   - Contract headers (X-Contract-Version, X-Request-ID, X-Idempotency-Key)
 *     are injected automatically per the BFF OpenAPI spec.
 */

import axios from 'axios'
import { buildContractHeaders } from '@/lib/contract-headers'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
if (!API_BASE_URL) {
  throw new Error('[bus2api] VITE_API_BASE_URL is not set. Refusing to start with an unsafe fallback.')
}

interface ApiResponse<T> {
  code: number
  message: string
  data?: T
}

interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && 'code' in value
}

function clearStoredAuth(): void {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('token_expires_at')
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor: attach JWT token + BFF contract headers
 */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Inject contract headers (X-Contract-Version, X-Request-ID, X-Idempotency-Key)
  const method = config.method ?? 'get'
  const contractHeaders = buildContractHeaders(method)
  Object.entries(contractHeaders).forEach(([key, value]) => {
    config.headers.set(key, value)
  })

  return config
})

/**
 * Response interceptor: handle 401 and token refresh
 */
let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

function onTokenRefreshed(token: string): void {
  pendingRequests.forEach((cb) => cb(token))
  pendingRequests = []
}

apiClient.interceptors.response.use(
  (response) => {
    if (isApiResponse(response.data)) {
      if (response.data.code === 0) {
        response.data = response.data.data
        return response
      }

      return Promise.reject({
        status: response.status,
        code: response.data.code,
        message: response.data.message || 'Unknown error',
      })
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config
    const url = String(originalRequest?.url || '')
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken || isAuthEndpoint) {
        clearStoredAuth()
        if (!isAuthEndpoint) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshResponse = await axios.post<ApiResponse<RefreshTokenResponse>>(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )

        const refreshData = refreshResponse.data
        if (!isApiResponse(refreshData) || refreshData.code !== 0 || !refreshData.data) {
          throw new Error('Token refresh failed')
        }

        localStorage.setItem('auth_token', refreshData.data.access_token)
        localStorage.setItem('refresh_token', refreshData.data.refresh_token)

        const expiresAt = Date.now() + refreshData.data.expires_in * 1000
        localStorage.setItem('token_expires_at', String(expiresAt))

        apiClient.defaults.headers.common.Authorization = `Bearer ${refreshData.data.access_token}`
        originalRequest.headers.Authorization = `Bearer ${refreshData.data.access_token}`

        onTokenRefreshed(refreshData.data.access_token)
        return apiClient(originalRequest)
      } catch {
        clearStoredAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)
