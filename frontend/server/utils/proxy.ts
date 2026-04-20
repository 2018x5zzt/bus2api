import type { H3Event } from 'h3'
import { rewriteApiPathForGatewayMode } from '~/utils/gateway-mode'

const TOKEN_COOKIE_MAX_AGE_FALLBACK = 3600 // 1h
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 3600 // 7d

/**
 * Forward a request to the sub2api backend.
 * Reads `runtimeConfig.sub2apiBaseUrl` for the target host.
 */
export async function proxyToBackend<T>(
  event: H3Event,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const config = useRuntimeConfig(event)
  const resolvedPath = rewriteApiPathForGatewayMode(path, config.gatewayMode)
  const url = `${config.sub2apiBaseUrl}${resolvedPath}`

  const res = await $fetch<T>(url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return res
}

interface TokenPayload {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

/**
 * Write access_token + refresh_token as cookies on the response.
 * - access_token: readable by client JS (for Authorization header)
 * - refresh_token: httpOnly (only server routes can read it)
 */
export function setTokenCookies(event: H3Event, tokens: TokenPayload): void {
  const maxAge = tokens.expires_in ?? TOKEN_COOKIE_MAX_AGE_FALLBACK

  setCookie(event, 'access_token', tokens.access_token, {
    path: '/',
    maxAge,
    sameSite: 'lax',
    secure: !import.meta.dev,
  })

  if (tokens.refresh_token) {
    setCookie(event, 'refresh_token', tokens.refresh_token, {
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.dev,
    })
  }
}

/** Clear both token cookies. */
export function clearTokenCookies(event: H3Event): void {
  deleteCookie(event, 'access_token', { path: '/' })
  deleteCookie(event, 'refresh_token', { path: '/' })
}
