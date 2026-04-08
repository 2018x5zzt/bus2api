/**
 * Admin: Account (号池) management endpoints
 */

import { apiClient } from '../client'
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  AccountUsageInfo,
  AccountUsageStatsResponse,
  CheckMixedChannelRequest,
  CheckMixedChannelResponse,
  AdminDataPayload,
  AdminDataImportResult,
  PaginatedResponse,
} from '@/types'

/** List accounts with filters */
export async function list(
  params?: {
    page?: number
    page_size?: number
    platform?: string
    type?: string
    status?: string
    group_id?: number
    search?: string
    schedulable?: boolean
  },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<Account>> {
  const { data } = await apiClient.get<PaginatedResponse<Account>>('/admin/accounts', {
    params,
    signal: options?.signal,
  })
  return data
}

/** Get account by ID */
export async function getById(id: number): Promise<Account> {
  const { data } = await apiClient.get<Account>(`/admin/accounts/${id}`)
  return data
}

/** Create account */
export async function create(payload: CreateAccountRequest): Promise<Account> {
  const { data } = await apiClient.post<Account>('/admin/accounts', payload)
  return data
}

/** Update account */
export async function update(id: number, payload: UpdateAccountRequest): Promise<Account> {
  const { data } = await apiClient.put<Account>(`/admin/accounts/${id}`, payload)
  return data
}

/** Delete account */
export async function deleteAccount(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/accounts/${id}`)
  return data
}

/** Batch update accounts */
export async function batchUpdate(
  ids: number[],
  updates: Partial<UpdateAccountRequest>,
): Promise<{ message: string; updated: number }> {
  const { data } = await apiClient.put<{ message: string; updated: number }>(
    '/admin/accounts/batch',
    { ids, ...updates },
  )
  return data
}

/** Get account usage info (rate limits, session window) */
export async function getUsageInfo(id: number): Promise<AccountUsageInfo> {
  const { data } = await apiClient.get<AccountUsageInfo>(`/admin/accounts/${id}/usage-info`)
  return data
}

/** Get account usage statistics (history, models, endpoints) */
export async function getUsageStats(
  id: number,
  params?: { days?: number },
): Promise<AccountUsageStatsResponse> {
  const { data } = await apiClient.get<AccountUsageStatsResponse>(
    `/admin/accounts/${id}/usage-stats`,
    { params },
  )
  return data
}

/** Check mixed-channel risk before assigning groups */
export async function checkMixedChannel(
  payload: CheckMixedChannelRequest,
): Promise<CheckMixedChannelResponse> {
  const { data } = await apiClient.post<CheckMixedChannelResponse>(
    '/admin/accounts/check-mixed-channel',
    payload,
  )
  return data
}

/** Export accounts data */
export async function exportData(): Promise<AdminDataPayload> {
  const { data } = await apiClient.get<AdminDataPayload>('/admin/accounts/export')
  return data
}

/** Import accounts data */
export async function importData(payload: AdminDataPayload): Promise<AdminDataImportResult> {
  const { data } = await apiClient.post<AdminDataImportResult>(
    '/admin/accounts/import',
    payload,
  )
  return data
}

/** Test account connectivity */
export async function testAccount(
  id: number,
  modelId?: string,
): Promise<{ success: boolean; message: string; latency_ms?: number }> {
  const { data } = await apiClient.post<{
    success: boolean
    message: string
    latency_ms?: number
  }>(`/admin/accounts/${id}/test`, { model_id: modelId })
  return data
}

export const adminAccountsAPI = {
  list,
  getById,
  create,
  update,
  delete: deleteAccount,
  batchUpdate,
  getUsageInfo,
  getUsageStats,
  checkMixedChannel,
  exportData,
  importData,
  testAccount,
}
