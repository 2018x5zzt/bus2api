<script setup lang="ts">
/**
 * AccountFormModal — 号池创建/编辑模态框
 * 可折叠分区表单：基本信息 / 调度配置 / 高级选项 / 配额管理
 */

import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Account, AccountPlatform, AccountType } from '@/types'

const PLATFORMS: AccountPlatform[] = ['anthropic', 'openai', 'gemini', 'antigravity']
const ACCOUNT_TYPES: AccountType[] = ['oauth', 'setup-token', 'apikey', 'upstream', 'bedrock']

const props = defineProps<{
  open: boolean
  editing: boolean
  account: Account | null
  submitting: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [form: AccountFormData]
}>()

const { t } = useI18n()

// ==================== 表单数据结构 ====================
export interface AccountFormData {
  name: string
  platform: AccountPlatform
  type: AccountType
  credentials_json: string
  proxy_id: number | null
  concurrency: number
  load_factor: number | null
  priority: number
  rate_multiplier: number
  group_ids_text: string
  notes: string
  expires_at_local: string
  auto_pause_on_expired: boolean
  status: 'active' | 'inactive' | 'error'
  schedulable: boolean
  // 调度
  base_rpm: number | null
  rpm_strategy: string
  rpm_sticky_buffer: number | null
  window_cost_limit: number | null
  window_cost_sticky_reserve: number | null
  max_sessions: number | null
  session_idle_timeout_minutes: number | null
  // 高级
  enable_tls_fingerprint: boolean
  tls_fingerprint_profile_id: number | null
  session_id_masking_enabled: boolean
  cache_ttl_override_enabled: boolean
  cache_ttl_override_target: string
  custom_base_url_enabled: boolean
  custom_base_url: string
  client_affinity_enabled: boolean
  affinity_client_count: number | null
  // 配额
  quota_limit: number | null
  quota_daily_limit: number | null
  quota_weekly_limit: number | null
}

function defaultForm(): AccountFormData {
  return {
    name: '', platform: 'anthropic', type: 'oauth',
    credentials_json: '{}', proxy_id: null,
    concurrency: 1, load_factor: null, priority: 0,
    rate_multiplier: 1, group_ids_text: '', notes: '',
    expires_at_local: '', auto_pause_on_expired: false,
    status: 'active', schedulable: true,
    base_rpm: null, rpm_strategy: '', rpm_sticky_buffer: null,
    window_cost_limit: null, window_cost_sticky_reserve: null,
    max_sessions: null, session_idle_timeout_minutes: null,
    enable_tls_fingerprint: false, tls_fingerprint_profile_id: null,
    session_id_masking_enabled: false,
    cache_ttl_override_enabled: false, cache_ttl_override_target: '',
    custom_base_url_enabled: false, custom_base_url: '',
    client_affinity_enabled: false, affinity_client_count: null,
    quota_limit: null, quota_daily_limit: null, quota_weekly_limit: null,
  }
}

/** Unix 时间戳 → datetime-local 字符串 */
function unixToLocal(ts: number | null): string {
  if (!ts) return ''
  return new Date(ts * 1000).toISOString().slice(0, 16)
}

const form = ref<AccountFormData>(defaultForm())

// 监听 open 变化，重置/填充表单
watch(() => props.open, (val) => {
  if (!val) return
  if (props.editing && props.account) {
    const a = props.account
    form.value = {
      name: a.name, platform: a.platform, type: a.type,
      credentials_json: JSON.stringify(a.credentials ?? {}, null, 2),
      proxy_id: a.proxy_id, concurrency: a.concurrency,
      load_factor: a.load_factor ?? null, priority: a.priority,
      rate_multiplier: a.rate_multiplier ?? 1,
      group_ids_text: (a.group_ids ?? []).join(', '),
      notes: a.notes ?? '',
      expires_at_local: unixToLocal(a.expires_at),
      auto_pause_on_expired: a.auto_pause_on_expired,
      status: a.status, schedulable: a.schedulable,
      base_rpm: a.base_rpm ?? null,
      rpm_strategy: a.rpm_strategy ?? '',
      rpm_sticky_buffer: a.rpm_sticky_buffer ?? null,
      window_cost_limit: a.window_cost_limit ?? null,
      window_cost_sticky_reserve: a.window_cost_sticky_reserve ?? null,
      max_sessions: a.max_sessions ?? null,
      session_idle_timeout_minutes: a.session_idle_timeout_minutes ?? null,
      enable_tls_fingerprint: a.enable_tls_fingerprint ?? false,
      tls_fingerprint_profile_id: a.tls_fingerprint_profile_id ?? null,
      session_id_masking_enabled: a.session_id_masking_enabled ?? false,
      cache_ttl_override_enabled: a.cache_ttl_override_enabled ?? false,
      cache_ttl_override_target: a.cache_ttl_override_target ?? '',
      custom_base_url_enabled: a.custom_base_url_enabled ?? false,
      custom_base_url: a.custom_base_url ?? '',
      client_affinity_enabled: a.client_affinity_enabled ?? false,
      affinity_client_count: a.affinity_client_count ?? null,
      quota_limit: a.quota_limit ?? null,
      quota_daily_limit: a.quota_daily_limit ?? null,
      quota_weekly_limit: a.quota_weekly_limit ?? null,
    }
  } else {
    form.value = defaultForm()
  }
})

function onSubmit(): void {
  emit('submit', { ...form.value })
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-wide">
      <div class="modal-header">
        {{ editing ? t('adminAccounts.editTitle') : t('adminAccounts.createTitle') }}
      </div>
      <form @submit.prevent="onSubmit">
        <!-- 基本信息 (始终展开) -->
        <details open class="section-toggle">
          <summary>{{ t('adminAccounts.basicInfo') }}</summary>
          <div class="form-grid">
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.name') }}</label>
              <input v-model="form.name" class="input" required />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.platform') }}</label>
              <select v-model="form.platform" class="input" :disabled="editing">
                <option v-for="p in PLATFORMS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.type') }}</label>
              <select v-model="form.type" class="input" :disabled="editing">
                <option v-for="at in ACCOUNT_TYPES" :key="at" :value="at">
                  {{ t(`adminAccounts.${at}`) }}
                </option>
              </select>
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.concurrency') }}</label>
              <input v-model.number="form.concurrency" class="input" type="number" min="1" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.priority') }}</label>
              <input v-model.number="form.priority" class="input" type="number" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.rateMultiplier') }}</label>
              <input v-model.number="form.rate_multiplier" class="input" type="number" step="0.01" min="0" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.loadFactor') }}</label>
              <input v-model.number="form.load_factor" class="input" type="number" step="0.1" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.proxy') }} ID</label>
              <input v-model.number="form.proxy_id" class="input" type="number" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.groupIds') }}</label>
              <input v-model="form.group_ids_text" class="input" :placeholder="t('adminAccounts.groupIdsPlaceholder')" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.expiresAt') }}</label>
              <input v-model="form.expires_at_local" class="input" type="datetime-local" />
            </div>
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.auto_pause_on_expired" type="checkbox" />
                {{ t('adminAccounts.autoExpirePause') }}
              </label>
            </div>
            <template v-if="editing">
              <div class="form-field">
                <label class="label">{{ t('adminAccounts.status') }}</label>
                <select v-model="form.status" class="input">
                  <option value="active">{{ t('adminAccounts.active') }}</option>
                  <option value="inactive">{{ t('adminAccounts.inactive') }}</option>
                  <option value="error">{{ t('adminAccounts.error') }}</option>
                </select>
              </div>
              <div class="form-field checkbox-field">
                <label class="checkbox-label">
                  <input v-model="form.schedulable" type="checkbox" />
                  {{ t('adminAccounts.schedulable') }}
                </label>
              </div>
            </template>
            <div class="form-field full-width">
              <label class="label">{{ t('adminAccounts.credentials') }}</label>
              <textarea v-model="form.credentials_json" class="input" rows="4" :placeholder="t('adminAccounts.credentialsPlaceholder')" />
            </div>
            <div class="form-field full-width">
              <label class="label">{{ t('adminAccounts.notes') }}</label>
              <textarea v-model="form.notes" class="input" rows="2" />
            </div>
          </div>
        </details>

        <!-- 调度配置 -->
        <details class="section-toggle">
          <summary>{{ t('adminAccounts.scheduling') }}</summary>
          <div class="form-grid">
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.baseRpm') }}</label>
              <input v-model.number="form.base_rpm" class="input" type="number" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.rpmStrategy') }}</label>
              <input v-model="form.rpm_strategy" class="input" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.rpmStickyBuffer') }}</label>
              <input v-model.number="form.rpm_sticky_buffer" class="input" type="number" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.windowCostLimit') }}</label>
              <input v-model.number="form.window_cost_limit" class="input" type="number" step="0.01" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.windowCostReserve') }}</label>
              <input v-model.number="form.window_cost_sticky_reserve" class="input" type="number" step="0.01" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.maxSessions') }}</label>
              <input v-model.number="form.max_sessions" class="input" type="number" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.sessionIdleTimeout') }}</label>
              <input v-model.number="form.session_idle_timeout_minutes" class="input" type="number" />
            </div>
          </div>
        </details>

        <!-- 高级选项 -->
        <details class="section-toggle">
          <summary>{{ t('adminAccounts.advanced') }}</summary>
          <div class="form-grid">
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.enable_tls_fingerprint" type="checkbox" />
                {{ t('adminAccounts.enableTls') }}
              </label>
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.tlsProfileId') }}</label>
              <input v-model.number="form.tls_fingerprint_profile_id" class="input" type="number" />
            </div>
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.session_id_masking_enabled" type="checkbox" />
                {{ t('adminAccounts.sessionIdMasking') }}
              </label>
            </div>
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.cache_ttl_override_enabled" type="checkbox" />
                {{ t('adminAccounts.cacheTtlOverride') }}
              </label>
            </div>
            <div v-if="form.cache_ttl_override_enabled" class="form-field">
              <label class="label">{{ t('adminAccounts.cacheTtlTarget') }}</label>
              <input v-model="form.cache_ttl_override_target" class="input" />
            </div>
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.custom_base_url_enabled" type="checkbox" />
                {{ t('adminAccounts.customBaseUrl') }}
              </label>
            </div>
            <div v-if="form.custom_base_url_enabled" class="form-field">
              <label class="label">{{ t('adminAccounts.customBaseUrlValue') }}</label>
              <input v-model="form.custom_base_url" class="input" />
            </div>
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.client_affinity_enabled" type="checkbox" />
                {{ t('adminAccounts.clientAffinity') }}
              </label>
            </div>
            <div v-if="form.client_affinity_enabled" class="form-field">
              <label class="label">{{ t('adminAccounts.affinityClientCount') }}</label>
              <input v-model.number="form.affinity_client_count" class="input" type="number" />
            </div>
          </div>
        </details>

        <!-- 配额管理 -->
        <details class="section-toggle">
          <summary>{{ t('adminAccounts.quota') }}</summary>
          <div class="form-grid">
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.quotaLimit') }}</label>
              <input v-model.number="form.quota_limit" class="input" type="number" step="0.01" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.quotaDailyLimit') }}</label>
              <input v-model.number="form.quota_daily_limit" class="input" type="number" step="0.01" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminAccounts.quotaWeeklyLimit') }}</label>
              <input v-model.number="form.quota_weekly_limit" class="input" type="number" step="0.01" />
            </div>
          </div>
        </details>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="emit('close')">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn-primary" :disabled="submitting || !form.name">
            {{ t('common.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-wide {
  max-width: 680px;
  max-height: 85vh;
  overflow-y: auto;
}

.section-toggle {
  margin-bottom: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.section-toggle summary {
  padding: 10px 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  background: var(--color-bg-elevated);
  color: var(--color-text);
  user-select: none;
}

.section-toggle summary:hover {
  background: var(--color-bg-hover);
}

.section-toggle .form-grid {
  padding: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.checkbox-field {
  justify-content: flex-end;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

textarea.input {
  resize: vertical;
}
</style>
