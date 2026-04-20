import { clearTokenCookies, proxyToBackend, setTokenCookies } from '~/server/utils/proxy'

interface RefreshBackendResponse {
  code: number
  message: string
  data: {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }
}

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'refresh_token')

  if (!refreshToken) {
    clearTokenCookies(event)
    throw createError({ statusCode: 401, message: 'No refresh token' })
  }

  try {
    const res = await proxyToBackend<RefreshBackendResponse>(
      event,
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken },
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
      },
    }
  }
  catch {
    clearTokenCookies(event)
    throw createError({ statusCode: 401, message: 'Refresh token expired' })
  }
})
