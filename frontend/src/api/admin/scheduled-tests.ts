/**
 * Admin: Scheduled test plan endpoints
 */

import { apiClient } from '../client'
import type {
  ScheduledTestPlan,
  ScheduledTestResult,
  CreateScheduledTestPlanRequest,
  UpdateScheduledTestPlanRequest,
  PaginatedResponse,
} from '@/types'

/** List scheduled test plans for an account */
export async function list(
  accountId: number,
  options?: { signal?: AbortSignal },
): Promise<ScheduledTestPlan[]> {
  const { data } = await apiClient.get<ScheduledTestPlan[]>(
    `/admin/accounts/${accountId}/scheduled-tests`,
    { signal: options?.signal },
  )
  return data
}

/** Create scheduled test plan */
export async function create(
  payload: CreateScheduledTestPlanRequest,
): Promise<ScheduledTestPlan> {
  const { data } = await apiClient.post<ScheduledTestPlan>(
    `/admin/accounts/${payload.account_id}/scheduled-tests`,
    payload,
  )
  return data
}

/** Update scheduled test plan */
export async function update(
  accountId: number,
  planId: number,
  payload: UpdateScheduledTestPlanRequest,
): Promise<ScheduledTestPlan> {
  const { data } = await apiClient.put<ScheduledTestPlan>(
    `/admin/accounts/${accountId}/scheduled-tests/${planId}`,
    payload,
  )
  return data
}

/** Delete scheduled test plan */
export async function deletePlan(
  accountId: number,
  planId: number,
): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(
    `/admin/accounts/${accountId}/scheduled-tests/${planId}`,
  )
  return data
}

/** Get test results for a plan */
export async function getResults(
  accountId: number,
  planId: number,
  params?: { page?: number; page_size?: number },
): Promise<PaginatedResponse<ScheduledTestResult>> {
  const { data } = await apiClient.get<PaginatedResponse<ScheduledTestResult>>(
    `/admin/accounts/${accountId}/scheduled-tests/${planId}/results`,
    { params },
  )
  return data
}

/** Run test immediately */
export async function runNow(
  accountId: number,
  planId: number,
): Promise<ScheduledTestResult> {
  const { data } = await apiClient.post<ScheduledTestResult>(
    `/admin/accounts/${accountId}/scheduled-tests/${planId}/run`,
  )
  return data
}

export const adminScheduledTestsAPI = {
  list,
  create,
  update,
  delete: deletePlan,
  getResults,
  runNow,
}
