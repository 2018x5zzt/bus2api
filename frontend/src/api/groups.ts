/**
 * User-visible group pool status endpoints.
 */

import { apiClient } from './client'
import type { GroupPoolStatusResponse } from '@/types'

/** Get realtime pool availability for groups visible to the current user */
export async function getPoolStatus(): Promise<GroupPoolStatusResponse> {
  const { data } = await apiClient.get<GroupPoolStatusResponse>('/groups/pool-status')
  return data
}

export const groupsAPI = {
  getPoolStatus,
}
