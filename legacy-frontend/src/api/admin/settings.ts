/**
 * Admin: System settings endpoints
 */

import { apiClient } from '../client'
import type {
  SystemSettings,
  UpdateSettingsRequest,
  TestSmtpRequest,
  SendTestEmailRequest,
  AdminApiKeyStatus,
  OverloadCooldownSettings,
  StreamTimeoutSettings,
  RectifierSettings,
  BetaPolicySettings,
} from '@/types'

/** Get all system settings */
export async function getAll(): Promise<SystemSettings> {
  const { data } = await apiClient.get<SystemSettings>('/admin/settings')
  return data
}

/** Update system settings */
export async function update(payload: UpdateSettingsRequest): Promise<SystemSettings> {
  const { data } = await apiClient.put<SystemSettings>('/admin/settings', payload)
  return data
}

/** Test SMTP connection */
export async function testSmtp(
  payload: TestSmtpRequest,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    '/admin/settings/smtp/test',
    payload,
  )
  return data
}

/** Send test email */
export async function sendTestEmail(
  payload: SendTestEmailRequest,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    '/admin/settings/smtp/send-test',
    payload,
  )
  return data
}

/** Get admin API key status */
export async function getAdminApiKeyStatus(): Promise<AdminApiKeyStatus> {
  const { data } = await apiClient.get<AdminApiKeyStatus>('/admin/settings/api-key')
  return data
}

/** Regenerate admin API key */
export async function regenerateAdminApiKey(): Promise<{ key: string }> {
  const { data } = await apiClient.post<{ key: string }>('/admin/settings/api-key/regenerate')
  return data
}

/** Get overload cooldown settings */
export async function getOverloadCooldown(): Promise<OverloadCooldownSettings> {
  const { data } = await apiClient.get<OverloadCooldownSettings>(
    '/admin/settings/overload-cooldown',
  )
  return data
}

/** Update overload cooldown settings */
export async function updateOverloadCooldown(
  payload: OverloadCooldownSettings,
): Promise<OverloadCooldownSettings> {
  const { data } = await apiClient.put<OverloadCooldownSettings>(
    '/admin/settings/overload-cooldown',
    payload,
  )
  return data
}

/** Get stream timeout settings */
export async function getStreamTimeout(): Promise<StreamTimeoutSettings> {
  const { data } = await apiClient.get<StreamTimeoutSettings>('/admin/settings/stream-timeout')
  return data
}

/** Update stream timeout settings */
export async function updateStreamTimeout(
  payload: StreamTimeoutSettings,
): Promise<StreamTimeoutSettings> {
  const { data } = await apiClient.put<StreamTimeoutSettings>(
    '/admin/settings/stream-timeout',
    payload,
  )
  return data
}

/** Get rectifier settings */
export async function getRectifier(): Promise<RectifierSettings> {
  const { data } = await apiClient.get<RectifierSettings>('/admin/settings/rectifier')
  return data
}

/** Update rectifier settings */
export async function updateRectifier(payload: RectifierSettings): Promise<RectifierSettings> {
  const { data } = await apiClient.put<RectifierSettings>('/admin/settings/rectifier', payload)
  return data
}

/** Get beta policy settings */
export async function getBetaPolicy(): Promise<BetaPolicySettings> {
  const { data } = await apiClient.get<BetaPolicySettings>('/admin/settings/beta-policy')
  return data
}

/** Update beta policy settings */
export async function updateBetaPolicy(
  payload: BetaPolicySettings,
): Promise<BetaPolicySettings> {
  const { data } = await apiClient.put<BetaPolicySettings>(
    '/admin/settings/beta-policy',
    payload,
  )
  return data
}

export const adminSettingsAPI = {
  getAll,
  update,
  testSmtp,
  sendTestEmail,
  getAdminApiKeyStatus,
  regenerateAdminApiKey,
  getOverloadCooldown,
  updateOverloadCooldown,
  getStreamTimeout,
  updateStreamTimeout,
  getRectifier,
  updateRectifier,
  getBetaPolicy,
  updateBetaPolicy,
}
