export const CONTRACT_VERSION = 'v2'

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export function buildContractHeaders(method = 'GET'): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Contract-Version': CONTRACT_VERSION,
    'X-Request-ID': generateUUID(),
  }

  if (MUTATING_METHODS.has(method.toLowerCase())) {
    headers['X-Idempotency-Key'] = generateUUID()
  }

  return headers
}

function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : ((random & 0x3) | 0x8)
    return value.toString(16)
  })
}
