/**
 * Enterprise BFF contract header utilities.
 *
 * Every request to the BFF must include:
 *   - X-Contract-Version: current contract version
 *   - X-Request-ID: unique UUID per request
 *
 * Mutating requests (POST/PATCH/DELETE) also require:
 *   - X-Idempotency-Key: unique UUID for idempotent retries
 */

/** Current active contract version — must match contracts/enterprise_bff_openapi_v2.yaml */
export const CONTRACT_VERSION = 'v2'

/** Generate a UUID v4 (uses crypto.randomUUID when available) */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** HTTP methods that require an idempotency key */
const MUTATING_METHODS = new Set(['post', 'patch', 'put', 'delete'])

/**
 * Build contract headers for a given HTTP method.
 */
export function buildContractHeaders(method: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Contract-Version': CONTRACT_VERSION,
    'X-Request-ID': generateUUID(),
  }

  if (MUTATING_METHODS.has(method.toLowerCase())) {
    headers['X-Idempotency-Key'] = generateUUID()
  }

  return headers
}
