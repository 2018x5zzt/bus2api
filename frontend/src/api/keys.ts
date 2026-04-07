/**
 * API Keys management endpoints
 */

import { apiClient } from './client'
import type {
  ApiKey,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  PaginatedResponse,
} from '@/types'

/** List API keys with pagination and filters */
export async function list(
  page = 1,
  pageSize = 10,
  filters?: { search?: string; status?: string; group_id?: number | string },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<ApiKey>> {
  const { data } = await apiClient.get<PaginatedResponse<ApiKey>>('/keys', {
    params: { page, page_size: pageSize, ...filters },
    signal: options?.signal,
  })
  return data
}

/** Get API key by ID */
export async function getById(id: number): Promise<ApiKey> {
  const { data } = await apiClient.get<ApiKey>(`/keys/${id}`)
  return data
}

/** Create new API key */
export async function create(payload: CreateApiKeyRequest): Promise<ApiKey> {
  const { data } = await apiClient.post<ApiKey>('/keys', payload)
  return data
}

/** Update API key */
export async function update(id: number, updates: UpdateApiKeyRequest): Promise<ApiKey> {
  const { data } = await apiClient.put<ApiKey>(`/keys/${id}`, updates)
  return data
}

/** Delete API key */
export async function deleteKey(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/keys/${id}`)
  return data
}

/** Toggle API key status */
export async function toggleStatus(
  id: number,
  status: 'active' | 'inactive',
): Promise<ApiKey> {
  return update(id, { status })
}

export const keysAPI = {
  list,
  getById,
  create,
  update,
  delete: deleteKey,
  toggleStatus,
}
