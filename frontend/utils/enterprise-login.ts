export const LAST_COMPANY_NAME_KEY = 'bus2api.last_company_name'

export interface EnterpriseLoginBodyInput {
  companyName?: string
  email: string
  password: string
  turnstileToken?: string
}

export interface EnterpriseLogin2FABodyInput {
  companyName?: string
  tempToken: string
  totpCode: string
}

export function normalizeCompanyName(companyName?: string): string {
  return companyName?.trim() || ''
}

export function buildEnterpriseLoginBody(
  input: EnterpriseLoginBodyInput,
): {
  company_name: string
  email: string
  password: string
  turnstile_token?: string
} {
  return {
    company_name: normalizeCompanyName(input.companyName),
    email: input.email,
    password: input.password,
    turnstile_token: input.turnstileToken,
  }
}

export function buildEnterpriseLogin2FABody(
  input: EnterpriseLogin2FABodyInput,
): {
  company_name: string
  temp_token: string
  totp_code: string
} {
  return {
    company_name: normalizeCompanyName(input.companyName),
    temp_token: input.tempToken,
    totp_code: input.totpCode,
  }
}
