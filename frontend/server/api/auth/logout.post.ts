import { clearTokenCookies, proxyToBackend } from '~/server/utils/proxy'

interface LogoutBackendResponse {
  code: number
  message: string
  data: { message: string }
}

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'refresh_token')

  try {
    await proxyToBackend<LogoutBackendResponse>(
      event,
      '/api/v1/auth/logout',
      refreshToken ? { refresh_token: refreshToken } : {},
    )
  }
  catch {
    // Backend logout failure is non-critical — still clear local cookies
  }

  clearTokenCookies(event)

  return { code: 0, message: 'success', data: { message: 'ok' } }
})
