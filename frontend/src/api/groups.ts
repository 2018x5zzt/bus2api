/**
 * User-visible group pool status endpoints.
 */

import { apiClient } from './client'
import type { EnterprisePoolStatusResponse, VisibleGroupOption } from '@/types'

/** Get realtime pool availability for groups visible to the current user */
export async function getPoolStatus(): Promise<EnterprisePoolStatusResponse> {
  const { data } = await apiClient.get<EnterprisePoolStatusResponse>('/groups/pool-status')
  return data
}

/** List enterprise-visible groups for the current user */
export async function getVisibleGroups(): Promise<VisibleGroupOption[]> {
  const { data } = await apiClient.get<VisibleGroupOption[]>('/groups/available')
  return data
}

export const groupsAPI = {
  getPoolStatus,
  getVisibleGroups,
}
