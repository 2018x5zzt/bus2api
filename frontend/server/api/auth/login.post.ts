import { proxyToBackend, setTokenCookies } from '~/server/utils/proxy'

interface LoginBackendResponse {
  code: number
  message: string
  data: {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type: string
    user?: Record<string, unknown>
    // 2FA response fields
    requires_2fa?: boolean
    temp_token?: string
    user_email_masked?: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    password: string
    turnstile_token?: string
  }>(event)

  const res = await proxyToBackend<LoginBackendResponse>(
    event,
    '/api/v1/auth/login',
    body,
  )

  const data = res.data

  // 2FA required — return directly without setting cookies
  if (data.requires_2fa) {
    return {
      code: 0,
      message: 'success',
      data: {
        requires_2fa: data.requires_2fa,
        temp_token: data.temp_token,
        user_email_masked: data.user_email_masked,
      },
    }
  }

  // Normal login — set cookies, strip refresh_token from response
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
