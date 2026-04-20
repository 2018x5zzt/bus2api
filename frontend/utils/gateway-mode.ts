export type GatewayMode = 'core' | 'enterprise'

interface GatewayModeRuntimeConfigLike {
  gatewayMode?: string
  public?: Record<string, unknown>
}

export function normalizeGatewayMode(mode?: string): GatewayMode {
  return mode === 'enterprise' ? 'enterprise' : 'core'
}

export function resolveGatewayMode(config?: GatewayModeRuntimeConfigLike): GatewayMode {
  const publicGatewayMode = typeof config?.public?.gatewayMode === 'string'
    ? config.public.gatewayMode
    : undefined

  return normalizeGatewayMode(publicGatewayMode || config?.gatewayMode)
}

export function isEnterpriseGatewayMode(mode?: string): boolean {
  return normalizeGatewayMode(mode) === 'enterprise'
}

export function rewriteApiPathForGatewayMode(
  path: string,
  mode?: string,
): string {
  if (!isEnterpriseGatewayMode(mode)) {
    return path
  }

  if (path === '/api/v1' || path === '/api/v1/') {
    return '/'
  }

  if (path.startsWith('/api/v1/')) {
    return path.slice('/api/v1'.length)
  }

  return path
}
