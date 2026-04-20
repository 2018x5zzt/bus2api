const ACCESS_TOKEN_COOKIE = 'access_token'

export function extractAccessTokenFromCookieHeader(
  cookieHeader?: string,
): string | null {
  if (!cookieHeader) {
    return null
  }

  for (const cookie of cookieHeader.split(';')) {
    const trimmedCookie = cookie.trim()

    if (!trimmedCookie.startsWith(`${ACCESS_TOKEN_COOKIE}=`)) {
      continue
    }

    const rawValue = trimmedCookie.slice(ACCESS_TOKEN_COOKIE.length + 1)

    try {
      return decodeURIComponent(rawValue)
    }
    catch {
      return rawValue
    }
  }

  return null
}

export function hasHeader(
  headers: Record<string, string>,
  headerName: string,
): boolean {
  const normalizedHeaderName = headerName.toLowerCase()

  return Object.keys(headers).some(
    header => header.toLowerCase() === normalizedHeaderName,
  )
}

export function getHeader(
  headers: Record<string, string>,
  headerName: string,
): string | undefined {
  const normalizedHeaderName = headerName.toLowerCase()
  const matchedHeader = Object.keys(headers).find(
    header => header.toLowerCase() === normalizedHeaderName,
  )

  return matchedHeader ? headers[matchedHeader] : undefined
}

export function ensureBearerAuthorizationHeader(
  headers: Record<string, string>,
): Record<string, string> {
  if (hasHeader(headers, 'authorization')) {
    return headers
  }

  const token = extractAccessTokenFromCookieHeader(getHeader(headers, 'cookie'))

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}
