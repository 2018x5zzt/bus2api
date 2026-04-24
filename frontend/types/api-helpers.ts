import type { components } from './api'

export type ApiResponse<T> = {
  code: number
  message: string
  data: T
  reason?: string
  metadata?: Record<string, string>
}

export type PaginatedData<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type User = components['schemas']['User']
export type APIKey = components['schemas']['APIKey']
export type Group = components['schemas']['Group']
export type UsageLog = components['schemas']['UsageLog']
export type UserAnnouncement = components['schemas']['UserAnnouncement']
export type UserSubscription = components['schemas']['UserSubscription']
export type RedeemCode = components['schemas']['RedeemCode']
export type PublicSettings = components['schemas']['PublicSettings']

export type AuthResponse = components['schemas']['AuthResponse']
export type TotpLoginResponse = components['schemas']['TotpLoginResponse']
export type RefreshTokenResponse = components['schemas']['RefreshTokenResponse']
export type UserWithRunMode = components['schemas']['UserWithRunMode']
export type ConsoleUser = UserWithRunMode & {
  enterprise_display_name?: string
  enterprise_name?: string
}

export type UserDashboardStats = components['schemas']['UserDashboardStats']
export type TrendDataPoint = components['schemas']['TrendDataPoint']
export type ModelStat = components['schemas']['ModelStat']
export type UsageStats = components['schemas']['UsageStats']
export type BatchAPIKeyUsageStats = components['schemas']['BatchAPIKeyUsageStats']
export type DashboardTrendResponse = components['schemas']['DashboardTrendResponse']
export type DashboardModelsResponse = components['schemas']['DashboardModelsResponse']

export type SubscriptionProgress = components['schemas']['SubscriptionProgress']
export type SubscriptionProgressInfo = components['schemas']['SubscriptionProgressInfo']
export type SubscriptionSummary = components['schemas']['SubscriptionSummary']
