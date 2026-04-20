import { proxyToBackend } from '~/server/utils/proxy'

interface SendVerifyCodeResponse {
  code: number
  message: string
  data: {
    message: string
    countdown: number
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; turnstile_token?: string }>(event)
  return await proxyToBackend<SendVerifyCodeResponse>(event, '/api/v1/auth/send-verify-code', body)
})
