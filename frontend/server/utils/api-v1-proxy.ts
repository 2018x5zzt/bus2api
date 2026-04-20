import {
  ensureBearerAuthorizationHeader,
} from '~/utils/request-auth'
import { rewriteApiPathForGatewayMode } from '~/utils/gateway-mode'

const REQUEST_HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

export function buildApiV1ProxyTarget(
  baseUrl: string,
  path: string,
  search = '',
  gatewayMode = 'core',
): string {
  const normalizedPath = path.replace(/^\/+/, '')
  const targetPath = rewriteApiPathForGatewayMode(
    `/api/v1/${normalizedPath}`,
    gatewayMode,
  )
  const url = new URL(targetPath, ensureTrailingSlash(baseUrl))
  url.search = search.startsWith('?') ? search.slice(1) : search
  return url.toString()
}

export function buildApiV1ProxyHeaders(
  requestHeaders: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const headers: Record<string, string> = {}

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (!value || REQUEST_HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue
    }

    headers[key] = Array.isArray(value) ? value.join(', ') : value
  }

  return ensureBearerAuthorizationHeader(headers)
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}
