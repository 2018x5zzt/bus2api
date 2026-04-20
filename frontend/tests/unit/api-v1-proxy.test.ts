import { describe, expect, it } from 'vitest'

import {
  buildApiV1ProxyHeaders,
  buildApiV1ProxyTarget,
} from '~/server/utils/api-v1-proxy'

describe('buildApiV1ProxyTarget', () => {
  it('joins the core base URL with the requested v1 path and query', () => {
    expect(
      buildApiV1ProxyTarget(
        'http://sub2api:8080',
        'settings/public',
        '?locale=zh-CN',
      ),
    ).toBe('http://sub2api:8080/api/v1/settings/public?locale=zh-CN')
  })
})

describe('buildApiV1ProxyHeaders', () => {
  it('strips hop-by-hop host headers and injects Authorization from cookie', () => {
    expect(
      buildApiV1ProxyHeaders({
        host: 'laogouapi.com',
        cookie: 'theme=dark; access_token=browser-token-789',
        accept: 'application/json',
      }),
    ).toEqual({
      cookie: 'theme=dark; access_token=browser-token-789',
      accept: 'application/json',
      Authorization: 'Bearer browser-token-789',
    })
  })

  it('keeps an existing authorization header untouched', () => {
    expect(
      buildApiV1ProxyHeaders({
        cookie: 'access_token=browser-token-789',
        authorization: 'Bearer upstream-token',
      }),
    ).toEqual({
      cookie: 'access_token=browser-token-789',
      authorization: 'Bearer upstream-token',
    })
  })

  it('adds enterprise contract headers for read requests in enterprise mode', () => {
    const headers = buildApiV1ProxyHeaders(
      {
        cookie: 'access_token=browser-token-789',
        accept: 'application/json',
      },
      {
        gatewayMode: 'enterprise',
        method: 'GET',
      },
    )

    expect(headers).toMatchObject({
      cookie: 'access_token=browser-token-789',
      accept: 'application/json',
      Authorization: 'Bearer browser-token-789',
      'X-Contract-Version': 'v2',
    })
    expect(headers['X-Request-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(headers['X-Idempotency-Key']).toBeUndefined()
  })

  it('adds an idempotency key for enterprise write requests', () => {
    const headers = buildApiV1ProxyHeaders(
      {
        cookie: 'access_token=browser-token-789',
        'content-type': 'application/json',
      },
      {
        gatewayMode: 'enterprise',
        method: 'POST',
      },
    )

    expect(headers).toMatchObject({
      cookie: 'access_token=browser-token-789',
      'content-type': 'application/json',
      Authorization: 'Bearer browser-token-789',
      'X-Contract-Version': 'v2',
    })
    expect(headers['X-Request-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(headers['X-Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})
