import type { ApiResponse } from '~/types/api-helpers'
import {
  ensureBearerAuthorizationHeader,
  hasHeader,
} from '~/utils/request-auth'

const ACCESS_TOKEN_COOKIE = 'access_token'

let refreshPromise: Promise<void> | null = null

export function useApi() {
  const config = useRuntimeConfig()

  function buildHeaders(opts?: Record<string, unknown>): HeadersInit {
    const headers = normalizeHeaders(
      (opts as { headers?: HeadersInit })?.headers,
    )

    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(['cookie'])
      if (reqHeaders.cookie && !hasHeader(headers, 'cookie')) {
        headers.cookie = reqHeaders.cookie
      }

      ensureBearerAuthorizationHeader(headers)
    }

    if (import.meta.client) {
      const token = useCookie(ACCESS_TOKEN_COOKIE)
      if (token.value && !hasHeader(headers, 'authorization')) {
        headers.Authorization = `Bearer ${token.value}`
      }
    }

    return headers
  }

  async function $api<T>(
    url: string,
    opts?: Parameters<typeof $fetch>[1],
  ): Promise<T> {
    const baseURL = import.meta.server
      ? config.sub2apiBaseUrl
      : (config.public.apiBaseUrl || '')

    const mergedOpts = {
      ...opts,
      baseURL: opts?.baseURL ?? baseURL,
      headers: buildHeaders(opts as Record<string, unknown>),
    }

    try {
      const res = await $fetch<ApiResponse<T>>(url, mergedOpts)
      return res.data
    }
    catch (err: unknown) {
      if (is401(err)) {
        await refreshOnce()
        const retryOpts = {
          ...opts,
          baseURL: mergedOpts.baseURL,
          headers: buildHeaders(opts as Record<string, unknown>),
        }
        const res = await $fetch<ApiResponse<T>>(url, retryOpts)
        return res.data
      }
      throw err
    }
  }

  return { $api }
}

function is401(err: unknown): boolean {
  return Boolean(
    typeof err === 'object'
    && err !== null
    && 'statusCode' in err
    && (err as { statusCode: number }).statusCode === 401,
  )
}

async function refreshOnce(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function doRefresh(): Promise<void> {
  try {
    await $fetch('/api/auth/refresh', { method: 'POST' })
  }
  catch {
    clearAuth()
    const route = useRoute()
    navigateTo(`/auth/login?next=${encodeURIComponent(route.fullPath)}`)
    throw new Error('Refresh token expired')
  }
}

function clearAuth(): void {
  const accessToken = useCookie(ACCESS_TOKEN_COOKIE)
  accessToken.value = null
}

function normalizeHeaders(input?: HeadersInit): Record<string, string> {
  if (!input) {
    return {}
  }

  if (input instanceof Headers) {
    return Object.fromEntries(input.entries())
  }

  if (Array.isArray(input)) {
    return Object.fromEntries(input)
  }

  return { ...input }
}
