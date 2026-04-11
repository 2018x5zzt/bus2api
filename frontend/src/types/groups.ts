/**
 * Group type definitions (platform-specific groups with capacity tracking)
 */

export type GroupPlatform = 'anthropic' | 'openai' | 'gemini' | 'antigravity'
export type SubscriptionType = 'standard' | 'subscription'

export interface Group {
  id: number
  name: string
  description: string | null
  platform: GroupPlatform
  rate_multiplier: number
  is_exclusive: boolean
  status: 'active' | 'inactive'
  subscription_type: SubscriptionType
  daily_limit_usd: number | null
  weekly_limit_usd: number | null
  monthly_limit_usd: number | null
  image_price_1k: number | null
  image_price_2k: number | null
  image_price_4k: number | null
  claude_code_only: boolean
  fallback_group_id: number | null
  fallback_group_id_on_invalid_request: number | null
  allow_messages_dispatch?: boolean
  require_oauth_only: boolean
  require_privacy_set: boolean
  created_at: string
  updated_at: string
}

export interface AdminGroup extends Group {
  model_routing: Record<string, number[]> | null
  model_routing_enabled: boolean
  mcp_xml_inject: boolean
  simulate_claude_max_enabled: boolean
  supported_model_scopes?: string[]
  account_count?: number
  active_account_count?: number
  rate_limited_account_count?: number
  default_mapped_model?: string
  sort_order: number
}

export interface VisibleGroupOption {
  id: number
  name: string
  platform: string
}

export interface PoolTrendPoint {
  bucket_time: string
  health_percent: number
  health_state: 'healthy' | 'degraded' | 'down'
}

export interface EnterprisePoolStatusGroup {
  group_id: number
  group_name: string
  health_percent: number
  health_state: 'healthy' | 'degraded' | 'down'
  trend: PoolTrendPoint[]
  updated_at: string
}

export interface EnterprisePoolStatusResponse {
  visible_group_count: number
  overall_health_percent: number | null
  updated_at: string
  groups: EnterprisePoolStatusGroup[]
}

export interface CreateGroupRequest {
  name: string
  description?: string | null
  platform?: GroupPlatform
  rate_multiplier?: number
  is_exclusive?: boolean
  subscription_type?: SubscriptionType
  daily_limit_usd?: number | null
  weekly_limit_usd?: number | null
  monthly_limit_usd?: number | null
  image_price_1k?: number | null
  image_price_2k?: number | null
  image_price_4k?: number | null
  claude_code_only?: boolean
  fallback_group_id?: number | null
  fallback_group_id_on_invalid_request?: number | null
  mcp_xml_inject?: boolean
  simulate_claude_max_enabled?: boolean
  supported_model_scopes?: string[]
  require_oauth_only?: boolean
  require_privacy_set?: boolean
  copy_accounts_from_group_ids?: number[]
}

export interface UpdateGroupRequest {
  name?: string
  description?: string | null
  platform?: GroupPlatform
  rate_multiplier?: number
  is_exclusive?: boolean
  status?: 'active' | 'inactive'
  subscription_type?: SubscriptionType
  daily_limit_usd?: number | null
  weekly_limit_usd?: number | null
  monthly_limit_usd?: number | null
  image_price_1k?: number | null
  image_price_2k?: number | null
  image_price_4k?: number | null
  claude_code_only?: boolean
  fallback_group_id?: number | null
  fallback_group_id_on_invalid_request?: number | null
  mcp_xml_inject?: boolean
  simulate_claude_max_enabled?: boolean
  supported_model_scopes?: string[]
  require_oauth_only?: boolean
  require_privacy_set?: boolean
  copy_accounts_from_group_ids?: number[]
}
