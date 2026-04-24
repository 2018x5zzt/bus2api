import type { H3Event } from 'h3'
import {
  buildPublicApiProxyHeaders,
  buildPublicApiProxyTarget,
} from '~/server/utils/public-api-proxy'

const RESPONSE_HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'keep-alive',
  'transfer-encoding',
])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const requestUrl = new URL(event.node.req.url || '/v1', 'http://localhost')
  const method = event.node.req.method || 'GET'
  const path = event.context.params?.path || ''
  const targetUrl = buildPublicApiProxyTarget(
    config.publicApiBaseUrl || config.sub2apiBaseUrl,
    path,
    requestUrl.search,
  )

  const body = await readProxyRequestBody(event, method)

  let upstream: Response

  try {
    upstream = await fetch(targetUrl, {
      method,
      headers: buildPublicApiProxyHeaders(event.node.req.headers),
      body,
      redirect: 'manual',
    })
  }
  catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Failed to reach public API upstream',
    })
  }

  const responseHeaders = new Headers()

  for (const [key, value] of upstream.headers.entries()) {
    if (!RESPONSE_HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  }

  return new Response(method === 'HEAD' ? undefined : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
})

async function readProxyRequestBody(
  event: H3Event,
  method: string,
): Promise<BodyInit | undefined> {
  if (method === 'GET' || method === 'HEAD') {
    return undefined
  }

  const rawBody = await readRawBody(event, false)

  if (typeof rawBody === 'string' || rawBody === undefined) {
    return rawBody
  }

  return new Uint8Array(rawBody)
}
