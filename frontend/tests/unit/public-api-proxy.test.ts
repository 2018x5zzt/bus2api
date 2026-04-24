import { describe, expect, it } from 'vitest'

import {
  buildPublicApiProxyHeaders,
  buildPublicApiProxyTarget,
} from '~/server/utils/public-api-proxy'

describe('buildPublicApiProxyTarget', () => {
  it('joins the core base URL with the requested public v1 path and query', () => {
    expect(
      buildPublicApiProxyTarget(
        'http://laogouapi:8080',
        'messages',
        '?beta=true',
      ),
    ).toBe('http://laogouapi:8080/v1/messages?beta=true')
  })

  it('supports nested anthropic-compatible paths', () => {
    expect(
      buildPublicApiProxyTarget(
        'http://laogouapi:8080',
        'messages/count_tokens',
      ),
    ).toBe('http://laogouapi:8080/v1/messages/count_tokens')
  })
})

describe('buildPublicApiProxyHeaders', () => {
  it('keeps explicit client auth headers and strips cookies plus hop-by-hop headers', () => {
    expect(
      buildPublicApiProxyHeaders({
        host: 'laogouapi.com',
        cookie: 'access_token=session-token; refresh_token=refresh-token',
        connection: 'keep-alive',
        authorization: 'Bearer openai-key',
        'x-api-key': 'anthropic-key',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      }),
    ).toEqual({
      authorization: 'Bearer openai-key',
      'x-api-key': 'anthropic-key',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'content-type': 'application/json',
    })
  })

  it('does not synthesize authorization from access_token cookies', () => {
    expect(
      buildPublicApiProxyHeaders({
        cookie: 'access_token=session-token',
        accept: 'application/json',
      }),
    ).toEqual({
      accept: 'application/json',
    })
  })
})
