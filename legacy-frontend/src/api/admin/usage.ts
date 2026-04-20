/**
 * Admin: Usage management endpoints (admin-scoped)
 */

import { apiClient } from '../client'
import type { UsageLog, PaginatedResponse } from '@/types'

/** Query all users' usage logs (admin) */
export async function query(
  params?: {
    page?: number
    page_size?: number
    user_id?: number
    api_key_id?: number
    model?: string
    start_date?: string
    end_date?: string
  },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<UsageLog>> {
  const { data } = await apiClient.get<PaginatedResponse<UsageLog>>('/admin/usage', {
    params,
    signal: options?.signal,
  })
  return data
}

/** Get usage summary by user */
export async function getUserSummary(params?: {
  start_date?: string
  end_date?: string
}): Promise<
  Array<{
    user_id: number
    username: string
    total_requests: number
    total_cost: number
    total_tokens: number
  }>
> {
  const { data } = await apiClient.get<
    Array<{
      user_id: number
      username: string
      total_requests: number
      total_cost: number
      total_tokens: number
    }>
  >('/admin/usage/by-user', { params })
  return data
}

/** Get usage summary by model */
export async function getModelSummary(params?: {
  start_date?: string
  end_date?: string
}): Promise<
  Array<{
    model: string
    total_requests: number
    total_cost: number
    total_tokens: number
  }>
> {
  const { data } = await apiClient.get<
    Array<{
      model: string
      total_requests: number
      total_cost: number
      total_tokens: number
    }>
  >('/admin/usage/by-model', { params })
  return data
}

export const adminUsageAPI = {
  query,
  getUserSummary,
  getModelSummary,
}
