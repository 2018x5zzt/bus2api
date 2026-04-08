/**
 * Common / shared type definitions
 */

// ==================== Pagination ====================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface SelectOption {
  value: string | number | boolean | null
  label: string
  [key: string]: unknown
}

export interface FetchOptions {
  signal?: AbortSignal
}

// ==================== API Response ====================

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface ApiError {
  detail: string
  code?: string
  field?: string
}
