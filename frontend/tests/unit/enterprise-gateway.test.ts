import { describe, expect, it } from 'vitest'

import {
  buildEnterpriseLogin2FABody,
  buildEnterpriseLoginBody,
} from '~/utils/enterprise-login'
import {
  rewriteApiPathForGatewayMode,
} from '~/utils/gateway-mode'

describe('rewriteApiPathForGatewayMode', () => {
  it('keeps /api/v1 paths unchanged in core mode', () => {
    expect(rewriteApiPathForGatewayMode('/api/v1/settings/public', 'core')).toBe(
      '/api/v1/settings/public',
    )
  })

  it('rewrites /api/v1 paths to enterprise-bff compatibility endpoints', () => {
    expect(rewriteApiPathForGatewayMode('/api/v1/settings/public', 'enterprise')).toBe(
      '/settings/public',
    )
    expect(rewriteApiPathForGatewayMode('/api/v1/auth/me', 'enterprise')).toBe(
      '/auth/me',
    )
  })
})

describe('buildEnterpriseLoginBody', () => {
  it('includes normalized company_name in login payloads', () => {
    expect(buildEnterpriseLoginBody({
      companyName: '  laogou  ',
      email: 'ops@example.com',
      password: 'secret',
    })).toEqual({
      company_name: 'laogou',
      email: 'ops@example.com',
      password: 'secret',
    })
  })
})

describe('buildEnterpriseLogin2FABody', () => {
  it('includes normalized company_name in 2fa payloads', () => {
    expect(buildEnterpriseLogin2FABody({
      companyName: '  laogou  ',
      tempToken: 'temp-token',
      totpCode: '123456',
    })).toEqual({
      company_name: 'laogou',
      temp_token: 'temp-token',
      totp_code: '123456',
    })
  })
})
