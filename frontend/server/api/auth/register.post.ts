import { proxyToBackend, setTokenCookies } from '~/server/utils/proxy'

interface RegisterBackendResponse {
  code: number
  message: string
  data: {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type: string
    user?: Record<string, unknown>
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    password: string
    verify_code?: string
    promo_code?: string
    invitation_code?: string
    turnstile_token?: string
  }>(event)

  const res = await proxyToBackend<RegisterBackendResponse>(
    event,
    '/api/v1/auth/register',
    body,
  )

  const data = res.data

  setTokenCookies(event, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  })

  return {
    code: 0,
    message: 'success',
    data: {
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user,
    },
  }
})
