/**
 * Admin: Proxy management endpoints
 */

import { apiClient } from '../client'
import type {
  Proxy,
  CreateProxyRequest,
  UpdateProxyRequest,
  ProxyAccountSummary,
  ProxyQualityCheckResult,
  PaginatedResponse,
} from '@/types'

/** List proxies */
export async function list(
  params?: { page?: number; page_size?: number; status?: string },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<Proxy>> {
  const { data } = await apiClient.get<PaginatedResponse<Proxy>>('/admin/proxies', {
    params,
    signal: options?.signal,
  })
  return data
}

/** Get proxy by ID */
export async function getById(id: number): Promise<Proxy> {
  const { data } = await apiClient.get<Proxy>(`/admin/proxies/${id}`)
  return data
}

/** Create proxy */
export async function create(payload: CreateProxyRequest): Promise<Proxy> {
  const { data } = await apiClient.post<Proxy>('/admin/proxies', payload)
  return data
}

/** Update proxy */
export async function update(id: number, payload: UpdateProxyRequest): Promise<Proxy> {
  const { data } = await apiClient.put<Proxy>(`/admin/proxies/${id}`, payload)
  return data
}

/** Delete proxy */
export async function deleteProxy(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/proxies/${id}`)
  return data
}

/** Get accounts using this proxy */
export async function getAccounts(id: number): Promise<ProxyAccountSummary[]> {
  const { data } = await apiClient.get<ProxyAccountSummary[]>(`/admin/proxies/${id}/accounts`)
  return data
}

/** Test proxy latency */
export async function testLatency(
  id: number,
): Promise<{ latency_ms: number; ip_address?: string }> {
  const { data } = await apiClient.post<{ latency_ms: number; ip_address?: string }>(
    `/admin/proxies/${id}/test`,
  )
  return data
}

/** Run quality check on proxy */
export async function qualityCheck(id: number): Promise<ProxyQualityCheckResult> {
  const { data } = await apiClient.post<ProxyQualityCheckResult>(
    `/admin/proxies/${id}/quality-check`,
  )
  return data
}

export const adminProxiesAPI = {
  list,
  getById,
  create,
  update,
  delete: deleteProxy,
  getAccounts,
  testLatency,
  qualityCheck,
}
