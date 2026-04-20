import { describe, expect, it } from 'vitest'

import {
  ensureBearerAuthorizationHeader,
  extractAccessTokenFromCookieHeader,
} from '~/utils/request-auth'

describe('extractAccessTokenFromCookieHeader', () => {
  it('returns the access token from a cookie header', () => {
    expect(
      extractAccessTokenFromCookieHeader(
        'theme=dark; access_token=server-token-123; refresh_token=refresh-456',
      ),
    ).toBe('server-token-123')
  })

  it('decodes url-encoded access tokens', () => {
    expect(
      extractAccessTokenFromCookieHeader(
        'access_token=token%20with%20spaces; refresh_token=refresh-456',
      ),
    ).toBe('token with spaces')
  })

  it('returns null when no access token is present', () => {
    expect(extractAccessTokenFromCookieHeader('theme=dark')).toBeNull()
    expect(extractAccessTokenFromCookieHeader()).toBeNull()
  })
})

describe('ensureBearerAuthorizationHeader', () => {
  it('adds Authorization from the access_token cookie when absent', () => {
    expect(
      ensureBearerAuthorizationHeader({
        cookie: 'theme=dark; access_token=server-token-123',
        accept: 'application/json',
      }),
    ).toEqual({
      cookie: 'theme=dark; access_token=server-token-123',
      accept: 'application/json',
      Authorization: 'Bearer server-token-123',
    })
  })

  it('does not overwrite an existing lowercase authorization header', () => {
    expect(
      ensureBearerAuthorizationHeader({
        cookie: 'access_token=server-token-123',
        authorization: 'Bearer upstream-token',
      }),
    ).toEqual({
      cookie: 'access_token=server-token-123',
      authorization: 'Bearer upstream-token',
    })
  })
})
