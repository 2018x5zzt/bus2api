import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// ── Mock infrastructure ──
const mockFetch = vi.fn()
const mockCookieValue = { value: 'test-access-token' }
const mockRoute = { fullPath: '/console/dashboard' }

// Mock Nuxt auto-imports
mockNuxtImport('$fetch', () => mockFetch)
mockNuxtImport('useCookie', () => () => mockCookieValue)
mockNuxtImport('useRoute', () => () => mockRoute)
mockNuxtImport('useRuntimeConfig', () => () => ({
  sub2apiBaseUrl: 'http://localhost:8080',
  public: { siteName: 'Test' },
}))
mockNuxtImport('useRequestHeaders', () => () => ({}))
mockNuxtImport('navigateTo', () => vi.fn())

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieValue.value = 'test-access-token'
  })

  it('unwraps envelope and returns data', async () => {
    mockFetch.mockResolvedValueOnce({
      code: 0,
      message: 'success',
      data: { id: 1, name: 'test-key' },
    })

    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()
    const result = await $api('/api/v1/keys/1')

    expect(result).toEqual({ id: 1, name: 'test-key' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries after 401 with auto-refresh', async () => {
    // First call: 401
    const error401 = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    mockFetch.mockRejectedValueOnce(error401)

    // Refresh call: success
    mockFetch.mockResolvedValueOnce({
      code: 0,
      message: 'success',
      data: { access_token: 'new-token' },
    })

    // Retry: success
    mockFetch.mockResolvedValueOnce({
      code: 0,
      message: 'success',
      data: { id: 2 },
    })

    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()
    const result = await $api('/api/v1/keys/2')

    expect(result).toEqual({ id: 2 })
    // original + refresh + retry = 3
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('redirects to login when refresh fails', async () => {
    const { navigateTo: mockNav } = await import('#imports')

    const error401 = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    mockFetch.mockRejectedValueOnce(error401)

    // Refresh fails
    mockFetch.mockRejectedValueOnce(new Error('refresh failed'))

    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()

    await expect($api('/api/v1/keys/3')).rejects.toThrow('Refresh token expired')
    expect(mockNav).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login?next='),
    )
  })

  it('deduplicates concurrent refresh requests', async () => {
    const error401 = Object.assign(new Error('Unauthorized'), { statusCode: 401 })

    // Two 401 errors
    mockFetch.mockRejectedValueOnce(error401)
    mockFetch.mockRejectedValueOnce(error401)

    // Single refresh
    mockFetch.mockResolvedValueOnce({
      code: 0,
      message: 'success',
      data: { access_token: 'new' },
    })

    // Two retries
    mockFetch.mockResolvedValueOnce({ code: 0, message: 'success', data: { a: 1 } })
    mockFetch.mockResolvedValueOnce({ code: 0, message: 'success', data: { b: 2 } })

    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()

    const [r1, r2] = await Promise.all([
      $api('/api/v1/endpoint-a'),
      $api('/api/v1/endpoint-b'),
    ])

    expect(r1).toEqual({ a: 1 })
    expect(r2).toEqual({ b: 2 })

    // 2 originals + 1 refresh + 2 retries = 5
    expect(mockFetch).toHaveBeenCalledTimes(5)
  })

  it('throws non-401 errors directly', async () => {
    const error500 = Object.assign(new Error('Server Error'), { statusCode: 500 })
    mockFetch.mockRejectedValueOnce(error500)

    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()

    await expect($api('/api/v1/keys')).rejects.toThrow('Server Error')
    // No refresh attempted
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
