const REQUEST_HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'cookie',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

export function buildPublicApiProxyTarget(
  baseUrl: string,
  path: string,
  search = '',
): string {
  const normalizedPath = path.replace(/^\/+/, '')
  const targetPath = normalizedPath ? `/v1/${normalizedPath}` : '/v1'
  const url = new URL(targetPath, ensureTrailingSlash(baseUrl))
  url.search = search.startsWith('?') ? search.slice(1) : search
  return url.toString()
}

export function buildPublicApiProxyHeaders(
  requestHeaders: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const headers: Record<string, string> = {}

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (!value || REQUEST_HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue
    }

    headers[key] = Array.isArray(value) ? value.join(', ') : value
  }

  return headers
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}
