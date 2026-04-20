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
})
