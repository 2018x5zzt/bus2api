import { proxyToBackend, setTokenCookies } from '~/server/utils/proxy'
import { buildEnterpriseLogin2FABody } from '~/utils/enterprise-login'

interface Login2FABackendResponse {
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
    company_name: string
    temp_token: string
    totp_code: string
  }>(event)

  const res = await proxyToBackend<Login2FABackendResponse>(
    event,
    '/api/v1/auth/login/2fa',
    buildEnterpriseLogin2FABody({
      companyName: body.company_name,
      tempToken: body.temp_token,
      totpCode: body.totp_code,
    }),
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
