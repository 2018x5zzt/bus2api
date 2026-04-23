export type RuntimeEnv = Record<string, string | undefined>
type GatewayMode = 'core' | 'enterprise'

export function resolveGatewayModeEnv(env: RuntimeEnv): GatewayMode {
  const mode = env.NUXT_PUBLIC_GATEWAY_MODE || env.NUXT_GATEWAY_MODE

  return mode === 'enterprise' ? 'enterprise' : 'core'
}

export function resolveSub2apiBaseUrlEnv(env: RuntimeEnv): string {
  return env.NUXT_SUB2API_BASE_URL || 'http://localhost:8080'
}
