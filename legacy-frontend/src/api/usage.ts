/**
 * Usage tracking API endpoints
 */

import { apiClient } from './client'
import type {
  UsageLog,
  UsageQueryParams,
  DashboardStats,
  TrendResponse,
  ModelStatsResponse,
  PaginatedResponse,
} from '@/types'

/** Query usage logs with filters */
export async function query(
  params: UsageQueryParams,
  config: { signal?: AbortSignal } = {},
): Promise<PaginatedResponse<UsageLog>> {
  const { data } = await apiClient.get<PaginatedResponse<UsageLog>>('/usage', {
    ...config,
    params,
  })
  return data
}

/** Get dashboard statistics */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('/usage/dashboard/stats')
  return data
}

/** Get usage trend data */
export async function getDashboardTrend(params?: {
  start_date?: string
  end_date?: string
  granularity?: 'day' | 'hour'
}): Promise<TrendResponse> {
  const { data } = await apiClient.get<TrendResponse>('/usage/dashboard/trend', { params })
  return data
}

/** Get model usage statistics */
export async function getDashboardModels(params?: {
  start_date?: string
  end_date?: string
}): Promise<ModelStatsResponse> {
  const { data } = await apiClient.get<ModelStatsResponse>('/usage/dashboard/models', { params })
  return data
}

export interface BatchApiKeyUsageStats {
  api_key_id: number
  today_actual_cost: number
  total_actual_cost: number
}

/** Get batch usage stats for API keys */
export async function getDashboardApiKeysUsage(
  apiKeyIds: number[],
  options?: { signal?: AbortSignal },
): Promise<{ stats: Record<string, BatchApiKeyUsageStats> }> {
  const { data } = await apiClient.post<{ stats: Record<string, BatchApiKeyUsageStats> }>(
    '/usage/dashboard/api-keys-usage',
    { api_key_ids: apiKeyIds },
    { signal: options?.signal },
  )
  return data
}

export const usageAPI = {
  query,
  getDashboardStats,
  getDashboardTrend,
  getDashboardModels,
  getDashboardApiKeysUsage,
}
