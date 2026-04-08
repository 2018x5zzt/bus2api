/**
 * Admin: Channel & pricing management endpoints
 */

import { apiClient } from '../client'
import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
  ModelDefaultPricing,
  PaginatedResponse,
} from '@/types'

/** List channels */
export async function list(
  params?: { page?: number; page_size?: number; status?: string },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<Channel>> {
  const { data } = await apiClient.get<PaginatedResponse<Channel>>('/admin/channels', {
    params,
    signal: options?.signal,
  })
  return data
}

/** Get channel by ID */
export async function getById(id: number): Promise<Channel> {
  const { data } = await apiClient.get<Channel>(`/admin/channels/${id}`)
  return data
}

/** Create channel */
export async function create(payload: CreateChannelRequest): Promise<Channel> {
  const { data } = await apiClient.post<Channel>('/admin/channels', payload)
  return data
}

/** Update channel */
export async function update(id: number, payload: UpdateChannelRequest): Promise<Channel> {
  const { data } = await apiClient.put<Channel>(`/admin/channels/${id}`, payload)
  return data
}

/** Delete channel */
export async function deleteChannel(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/channels/${id}`)
  return data
}

/** Get default pricing for a model */
export async function getModelDefaultPricing(
  platform: string,
  model: string,
): Promise<ModelDefaultPricing> {
  const { data } = await apiClient.get<ModelDefaultPricing>(
    '/admin/channels/model-default-pricing',
    { params: { platform, model } },
  )
  return data
}

export const adminChannelsAPI = {
  list,
  getById,
  create,
  update,
  delete: deleteChannel,
  getModelDefaultPricing,
}
