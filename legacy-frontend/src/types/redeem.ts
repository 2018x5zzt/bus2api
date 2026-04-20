/**
 * Redeem code type definitions
 */

import type { User } from './auth'
import type { Group } from './groups'

export type RedeemCodeType = 'balance' | 'concurrency' | 'subscription' | 'invitation'

export interface RedeemCode {
  id: number
  code: string
  type: RedeemCodeType
  value: number
  status: 'active' | 'used' | 'expired' | 'unused'
  used_by: number | null
  used_at: string | null
  created_at: string
  updated_at?: string
  group_id?: number | null
  validity_days?: number
  user?: User
  group?: Group
}

export interface GenerateRedeemCodesRequest {
  count: number
  type: RedeemCodeType
  value: number
  group_id?: number | null
  validity_days?: number
}

export interface RedeemCodeRequest {
  code: string
}
