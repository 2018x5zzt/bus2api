import { buildApiV1ProxyHeaders, buildApiV1ProxyTarget } from '~/server/utils/api-v1-proxy'

const RESPONSE_HOP_BY_HOP_HEADERS = new Set([
  'content-length',
  'transfer-encoding',
])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const requestUrl = new URL(event.node.req.url || '/api/v1', 'http://localhost')
  const method = event.node.req.method || 'GET'
  const path = event.context.params?.path || ''
  const targetUrl = buildApiV1ProxyTarget(
    config.sub2apiBaseUrl,
    path,
    requestUrl.search,
    config.gatewayMode,
  )

  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : await readRawBody(event, false)

  let upstream: Response

  try {
    upstream = await fetch(targetUrl, {
      method,
      headers: buildApiV1ProxyHeaders(event.node.req.headers, {
        gatewayMode: config.gatewayMode,
        method,
      }),
      body,
      redirect: 'manual',
    })
  }
  catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Failed to reach sub2api core backend',
    })
  }

  const responseHeaders = new Headers()

  for (const [key, value] of upstream.headers.entries()) {
    if (!RESPONSE_HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  }

  const payload = method === 'HEAD'
    ? undefined
    : await upstream.arrayBuffer()

  return new Response(payload, {
    status: upstream.status,
    headers: responseHeaders,
  })
})
