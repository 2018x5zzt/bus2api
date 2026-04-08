/**
 * Admin: User management endpoints
 */

import { apiClient } from '../client'
import type { AdminUser, UpdateUserRequest, PaginatedResponse } from '@/types'

/** List users with filters */
export async function list(
  params?: {
    page?: number
    page_size?: number
    search?: string
    role?: string
    status?: string
  },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminUser>>('/admin/users', {
    params,
    signal: options?.signal,
  })
  return data
}

/** Get user by ID */
export async function getById(id: number): Promise<AdminUser> {
  const { data } = await apiClient.get<AdminUser>(`/admin/users/${id}`)
  return data
}

/** Update user */
export async function update(id: number, payload: UpdateUserRequest): Promise<AdminUser> {
  const { data } = await apiClient.put<AdminUser>(`/admin/users/${id}`, payload)
  return data
}

/** Delete user */
export async function deleteUser(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/users/${id}`)
  return data
}

/** Reset user password (admin) */
export async function resetPassword(
  id: number,
  newPassword: string,
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>(`/admin/users/${id}/password`, {
    password: newPassword,
  })
  return data
}

/** Adjust user balance */
export async function adjustBalance(
  id: number,
  amount: number,
  reason?: string,
): Promise<AdminUser> {
  const { data } = await apiClient.post<AdminUser>(`/admin/users/${id}/balance`, {
    amount,
    reason,
  })
  return data
}

export const adminUsersAPI = {
  list,
  getById,
  update,
  delete: deleteUser,
  resetPassword,
  adjustBalance,
}
