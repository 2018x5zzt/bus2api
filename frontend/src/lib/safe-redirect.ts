/**
 * Safe redirect utility — prevents open-redirect attacks.
 *
 * Only allows relative paths that start with '/' and do not contain
 * protocol schemes or double slashes (which browsers may interpret
 * as protocol-relative URLs).
 */

const SAFE_FALLBACK = '/dashboard'

/** Allowed internal route prefixes (whitelist) */
const ALLOWED_PREFIXES = [
  '/dashboard',
  '/keys',
  '/usage',
  '/status',
  '/admin',
] as const

/**
 * Returns a safe redirect target from an untrusted input string.
 * Falls back to `/dashboard` when the input is invalid.
 */
export function safeRedirect(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    return SAFE_FALLBACK
  }

  const trimmed = raw.trim()

  // Must start with exactly one '/'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return SAFE_FALLBACK
  }

  // Block embedded protocol schemes (e.g. /http://evil.com)
  if (/[a-z]+:/i.test(trimmed.slice(1))) {
    return SAFE_FALLBACK
  }

  // Extract pathname (strip query and hash)
  const pathname = trimmed.split('?')[0].split('#')[0]

  const isAllowed = ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  return isAllowed ? trimmed : SAFE_FALLBACK
}
