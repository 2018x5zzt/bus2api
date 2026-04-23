import { describe, expect, it } from 'vitest'

import {
  resolveGatewayModeEnv,
  resolveSub2apiBaseUrlEnv,
} from '~/utils/runtime-config'

describe('resolveGatewayModeEnv', () => {
  it('prefers the public gateway env when present', () => {
    expect(resolveGatewayModeEnv({
      NUXT_PUBLIC_GATEWAY_MODE: 'enterprise',
      NUXT_GATEWAY_MODE: 'core',
    })).toBe('enterprise')
  })

  it('defaults to core for empty or unknown values', () => {
    expect(resolveGatewayModeEnv({})).toBe('core')
    expect(resolveGatewayModeEnv({ NUXT_GATEWAY_MODE: 'weird' })).toBe('core')
  })
})

describe('resolveSub2apiBaseUrlEnv', () => {
  it('uses the explicit deployment target when provided', () => {
    expect(resolveSub2apiBaseUrlEnv({
      NUXT_SUB2API_BASE_URL: 'http://laogouapi:8080',
    })).toBe('http://laogouapi:8080')
  })

  it('falls back to the local development target', () => {
    expect(resolveSub2apiBaseUrlEnv({})).toBe('http://localhost:8080')
  })
})
