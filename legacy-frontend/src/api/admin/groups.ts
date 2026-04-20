/**
 * Admin: Group management endpoints
 */

import { apiClient } from '../client'
import type {
  AdminGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  PaginatedResponse,
} from '@/types'

/** List all groups */
export async function list(
  params?: { page?: number; page_size?: number; platform?: string; status?: string },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<AdminGroup>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminGroup>>('/admin/groups', {
    params,
    signal: options?.signal,
  })
  return data
}

/** Get group by ID */
export async function getById(id: number): Promise<AdminGroup> {
  const { data } = await apiClient.get<AdminGroup>(`/admin/groups/${id}`)
  return data
}

/** Create group */
export async function create(payload: CreateGroupRequest): Promise<AdminGroup> {
  const { data } = await apiClient.post<AdminGroup>('/admin/groups', payload)
  return data
}

/** Update group */
export async function update(id: number, payload: UpdateGroupRequest): Promise<AdminGroup> {
  const { data } = await apiClient.put<AdminGroup>(`/admin/groups/${id}`, payload)
  return data
}

/** Delete group */
export async function deleteGroup(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/groups/${id}`)
  return data
}

/** Reorder groups */
export async function reorder(orderedIds: number[]): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>('/admin/groups/reorder', {
    ordered_ids: orderedIds,
  })
  return data
}

export const adminGroupsAPI = {
  list,
  getById,
  create,
  update,
  delete: deleteGroup,
  reorder,
}
