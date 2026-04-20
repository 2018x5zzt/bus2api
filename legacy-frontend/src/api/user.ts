/**
 * User profile API endpoints
 */

import { apiClient } from './client'
import type { User } from '@/types'

/** Get current user profile */
export async function getProfile(): Promise<User> {
  const { data } = await apiClient.get<User>('/user/profile')
  return data
}

/** Update user profile */
export async function updateProfile(profile: { username?: string }): Promise<User> {
  const { data } = await apiClient.put<User>('/user', profile)
  return data
}

/** Change password */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>('/user/password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
  return data
}

export const userAPI = {
  getProfile,
  updateProfile,
  changePassword,
}
