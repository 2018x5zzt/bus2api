/**
 * Admin: Dashboard statistics endpoints
 */

import { apiClient } from '../client'

export interface AdminDashboardStats {
  total_users: number
  active_users: number
  total_accounts: number
  active_accounts: number
  total_groups: number
  total_channels: number
  total_keys: number
  today_requests: number
  today_cost: number
  total_revenue: number
}

export interface AdminRealtimeStats {
  active_connections: number
  requests_per_minute: number
  avg_latency_ms: number
  error_rate: number
}

/** Get admin dashboard statistics */
export async function getStats(): Promise<AdminDashboardStats> {
  const { data } = await apiClient.get<AdminDashboardStats>('/admin/dashboard/stats')
  return data
}

/** Get realtime monitoring stats */
export async function getRealtimeStats(): Promise<AdminRealtimeStats> {
  const { data } = await apiClient.get<AdminRealtimeStats>('/admin/dashboard/realtime')
  return data
}

/** Get admin usage trend */
export async function getTrend(params?: {
  start_date?: string
  end_date?: string
  granularity?: 'day' | 'hour'
}): Promise<{
  points: Array<{ date: string; requests: number; cost: number; tokens: number }>
}> {
  const { data } = await apiClient.get<{
    points: Array<{ date: string; requests: number; cost: number; tokens: number }>
  }>('/admin/dashboard/trend', { params })
  return data
}

export const adminDashboardAPI = {
  getStats,
  getRealtimeStats,
  getTrend,
}
