<script setup lang="ts">
/**
 * AccountsView — 号池管理页面
 * CRUD + 搜索 + 平台/类型/状态筛选 + 分页 + 测试 + 导出/导入
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search as SearchIcon } from 'lucide-vue-next'
import { adminAccountsAPI } from '@/api/admin'
import AccountFormModal from './AccountFormModal.vue'
import type { AccountFormData } from './AccountFormModal.vue'
import type {
  Account,
  AccountPlatform,
  AccountType,
  CreateAccountRequest,
  UpdateAccountRequest,
  AdminDataPayload,
} from '@/types'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

const { t } = useI18n()

// ==================== 列表状态 ====================
const accounts = ref<Account[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref<string | null>(null)

// ==================== 筛选 ====================
const search = ref('')
const platformFilter = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

// ==================== 模态框 ====================
const modalOpen = ref(false)
const isEditing = ref(false)
const selectedAccount = ref<Account | null>(null)
const submitting = ref(false)

// ==================== 测试 ====================
const testingId = ref<number | null>(null)
const testResult = ref<{ success: boolean; message: string; latency_ms?: number } | null>(null)

// ==================== 配置 ====================
const PLATFORMS: AccountPlatform[] = ['anthropic', 'openai', 'gemini', 'antigravity']
const ACCOUNT_TYPES: AccountType[] = ['oauth', 'setup-token', 'apikey', 'upstream', 'bedrock']

const PLATFORM_BADGE: Record<AccountPlatform, string> = {
  anthropic: 'badge-warning',
  openai: 'badge-success',
  gemini: 'badge-neutral',
  antigravity: 'badge-danger',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-neutral',
  error: 'badge-danger',
}

// ==================== 分页计算 ====================
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const pageNumbers = computed(() => {
  const MAX_VISIBLE = 5
  const current = page.value
  const last = totalPages.value
  let start = Math.max(1, current - Math.floor(MAX_VISIBLE / 2))
  const end = Math.min(last, start + MAX_VISIBLE - 1)
  start = Math.max(1, end - MAX_VISIBLE + 1)
  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// ==================== 数据加载 ====================
async function fetchAccounts(): Promise<void> {
  abortController?.abort()
  abortController = new AbortController()
  loading.value = true
  error.value = null
  try {
    const res = await adminAccountsAPI.list(
      {
        page: page.value,
        page_size: PAGE_SIZE,
        search: search.value || undefined,
        platform: platformFilter.value || undefined,
        type: typeFilter.value || undefined,
        status: statusFilter.value || undefined,
      },
      { signal: abortController.signal },
    )
    accounts.value = res.data
    total.value = res.total
  } catch (e) {
    if ((e as Error).name === 'CanceledError') return
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function onSearchInput(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchAccounts()
  }, DEBOUNCE_MS)
}

function onFilterChange(): void {
  page.value = 1
  fetchAccounts()
}

function goToPage(p: number): void {
  page.value = p
  fetchAccounts()
}

// ==================== 模态框控制 ====================
function openCreate(): void {
  isEditing.value = false
  selectedAccount.value = null
  modalOpen.value = true
}

function openEdit(account: Account): void {
  isEditing.value = true
  selectedAccount.value = account
  modalOpen.value = true
}

function closeModal(): void {
  modalOpen.value = false
  selectedAccount.value = null
  submitting.value = false
}

// ==================== 表单提交 ====================

/** datetime-local 字符串 → Unix 时间戳 */
function localToUnix(local: string): number | null {
  if (!local) return null
  const ts = Math.floor(new Date(local).getTime() / 1000)
  return Number.isNaN(ts) ? null : ts
}

/** 逗号分隔文本 → number[] */
function parseGroupIds(text: string): number[] {
  if (!text.trim()) return []
  return text
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n))
}

/** 安全解析 JSON 凭证 */
function parseCredentials(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

async function onSubmit(form: AccountFormData): Promise<void> {
  submitting.value = true
  try {
    const credentials = parseCredentials(form.credentials_json)
    const groupIds = parseGroupIds(form.group_ids_text)
    const expiresAt = localToUnix(form.expires_at_local)

    if (isEditing.value && selectedAccount.value) {
      const payload: UpdateAccountRequest = {
        name: form.name,
        type: form.type,
        credentials,
        proxy_id: form.proxy_id,
        concurrency: form.concurrency,
        load_factor: form.load_factor,
        priority: form.priority,
        rate_multiplier: form.rate_multiplier,
        group_ids: groupIds,
        notes: form.notes || null,
        expires_at: expiresAt,
        auto_pause_on_expired: form.auto_pause_on_expired,
        status: form.status,
        schedulable: form.schedulable,
      }
      await adminAccountsAPI.update(selectedAccount.value.id, payload)
    } else {
      const payload: CreateAccountRequest = {
        name: form.name,
        platform: form.platform,
        type: form.type,
        credentials,
        proxy_id: form.proxy_id,
        concurrency: form.concurrency,
        load_factor: form.load_factor,
        priority: form.priority,
        rate_multiplier: form.rate_multiplier,
        group_ids: groupIds,
        notes: form.notes || null,
        expires_at: expiresAt,
        auto_pause_on_expired: form.auto_pause_on_expired,
      }
      await adminAccountsAPI.create(payload)
    }
    closeModal()
    fetchAccounts()
  } catch (e) {
    alert((e as Error).message)
  } finally {
    submitting.value = false
  }
}

// ==================== 删除 ====================
async function deleteAccount(account: Account): Promise<void> {
  if (!window.confirm(t('adminAccounts.deleteConfirm'))) return
  try {
    await adminAccountsAPI.delete(account.id)
    fetchAccounts()
  } catch (e) {
    alert((e as Error).message)
  }
}

// ==================== 测试连通性 ====================
async function testAccount(account: Account): Promise<void> {
  testingId.value = account.id
  testResult.value = null
  try {
    const res = await adminAccountsAPI.testAccount(account.id)
    testResult.value = res
  } catch (e) {
    testResult.value = { success: false, message: (e as Error).message }
  } finally {
    testingId.value = null
  }
}

// ==================== 导出/导入 ====================
async function handleExport(): Promise<void> {
  try {
    const data = await adminAccountsAPI.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounts_export_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert((e as Error).message)
  }
}

async function handleImport(): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload: AdminDataPayload = JSON.parse(text)
      const result = await adminAccountsAPI.importData(payload)
      alert(`Import: ${result.account_created ?? 0} created, ${result.account_failed ?? 0} failed`)
      fetchAccounts()
    } catch (e) {
      alert((e as Error).message)
    }
  }
  input.click()
}

// ==================== 格式化工具 ====================
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

function formatGroupIds(account: Account): string {
  if (account.groups?.length) {
    return account.groups.map((g) => g.name).join(', ')
  }
  if (account.group_ids?.length) {
    return account.group_ids.join(', ')
  }
  return '-'
}

// ==================== 生命周期 ====================
onMounted(fetchAccounts)
onUnmounted(() => {
  abortController?.abort()
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="animate-fade-in">
    <!-- 页面标题 + 操作按钮 -->
    <div class="page-header">
      <h1 class="page-title">{{ t('adminAccounts.title') }}</h1>
      <div class="header-actions">
        <button class="btn-secondary" @click="handleExport">
          {{ t('adminAccounts.exportData') }}
        </button>
        <button class="btn-secondary" @click="handleImport">
          {{ t('adminAccounts.importData') }}
        </button>
        <button class="btn-primary" @click="openCreate">
          {{ t('adminAccounts.create') }}
        </button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <div class="search-box">
        <SearchIcon :size="16" class="search-icon" />
        <input
          v-model="search"
          class="input search-input"
          :placeholder="t('adminAccounts.searchPlaceholder')"
          @input="onSearchInput"
        />
      </div>
      <select v-model="platformFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminAccounts.platform') }}</option>
        <option v-for="p in PLATFORMS" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="typeFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminAccounts.type') }}</option>
        <option v-for="at in ACCOUNT_TYPES" :key="at" :value="at">
          {{ t(`adminAccounts.${at}`) }}
        </option>
      </select>
      <select v-model="statusFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminAccounts.status') }}</option>
        <option value="active">{{ t('adminAccounts.active') }}</option>
        <option value="inactive">{{ t('adminAccounts.inactive') }}</option>
        <option value="error">{{ t('adminAccounts.error') }}</option>
      </select>
    </div>

    <!-- 加载态 -->
    <div v-if="loading && accounts.length === 0" class="loading-center">
      <div class="spinner" />
    </div>

    <!-- 错误态 -->
    <div v-else-if="error && accounts.length === 0" class="empty-state">
      <p>{{ error }}</p>
      <button class="btn-primary" style="margin-top: 12px" @click="fetchAccounts">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- 空态 -->
    <div v-else-if="accounts.length === 0" class="empty-state">
      <p>{{ t('adminAccounts.noAccounts') }}</p>
    </div>

    <!-- 数据表格 -->
    <template v-else>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('adminAccounts.name') }}</th>
              <th>{{ t('adminAccounts.platform') }}</th>
              <th>{{ t('adminAccounts.type') }}</th>
              <th>{{ t('adminAccounts.status') }}</th>
              <th>{{ t('adminAccounts.concurrency') }}</th>
              <th>{{ t('adminAccounts.priority') }}</th>
              <th>{{ t('adminAccounts.groups') }}</th>
              <th>{{ t('adminAccounts.schedulable') }}</th>
              <th>{{ t('adminAccounts.lastUsed') }}</th>
              <th>{{ t('adminAccounts.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.id">
              <td class="font-medium">
                {{ account.name }}
                <span v-if="account.notes" class="notes-hint" :title="account.notes">*</span>
              </td>
              <td>
                <span :class="['badge', PLATFORM_BADGE[account.platform]]">
                  {{ account.platform }}
                </span>
              </td>
              <td>
                <span class="badge badge-neutral">
                  {{ t(`adminAccounts.${account.type}`) }}
                </span>
              </td>
              <td>
                <span :class="['badge', STATUS_BADGE[account.status]]">
                  {{ t(`adminAccounts.${account.status}`) }}
                </span>
                <span v-if="account.rate_limited_at" class="status-sub badge-warning">
                  {{ t('adminAccounts.rateLimited') }}
                </span>
                <span v-if="account.overload_until" class="status-sub badge-danger">
                  {{ t('adminAccounts.overloaded') }}
                </span>
              </td>
              <td>{{ account.current_concurrency ?? 0 }}/{{ account.concurrency }}</td>
              <td>{{ account.priority }}</td>
              <td class="groups-cell">{{ formatGroupIds(account) }}</td>
              <td>
                <span :class="['badge', account.schedulable ? 'badge-success' : 'badge-danger']">
                  {{ account.schedulable ? t('adminAccounts.yes') : t('adminAccounts.no') }}
                </span>
              </td>
              <td>{{ formatDate(account.last_used_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-ghost btn-sm" @click="openEdit(account)">
                    {{ t('adminAccounts.edit') }}
                  </button>
                  <button
                    class="btn-ghost btn-sm"
                    :disabled="testingId === account.id"
                    @click="testAccount(account)"
                  >
                    {{ testingId === account.id ? '...' : t('adminAccounts.test') }}
                  </button>
                  <button class="btn-danger btn-sm" @click="deleteAccount(account)">
                    {{ t('adminAccounts.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 测试结果提示 -->
      <div v-if="testResult" class="test-result" :class="testResult.success ? 'test-ok' : 'test-fail'">
        <span>{{ testResult.success ? t('adminAccounts.testSuccess') : t('adminAccounts.testFailed') }}</span>
        <span v-if="testResult.latency_ms"> — {{ t('adminAccounts.testLatency') }}: {{ testResult.latency_ms }}ms</span>
        <span v-if="!testResult.success && testResult.message"> — {{ testResult.message }}</span>
        <button class="btn-ghost btn-sm" style="margin-left: 12px" @click="testResult = null">✕</button>
      </div>

      <!-- 底部信息 + 分页 -->
      <div class="table-footer">
        <span class="total-info">
          {{ t('common.total') }} {{ total }} {{ t('common.items') }}
        </span>
        <div class="pagination">
          <button :disabled="page <= 1" @click="goToPage(page - 1)">{{ t('common.prev') }}</button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            :class="{ active: p === page }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button :disabled="page >= totalPages" @click="goToPage(page + 1)">
            {{ t('common.next') }}
          </button>
        </div>
      </div>
    </template>

    <!-- 创建/编辑模态框 -->
    <AccountFormModal
      :open="modalOpen"
      :editing="isEditing"
      :account="selectedAccount"
      :submitting="submitting"
      @close="closeModal"
      @submit="onSubmit"
    />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 320px;
  min-width: 180px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  padding-left: 36px;
}

.filter-select {
  width: auto;
  min-width: 130px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 64px 0;
}

.font-medium {
  font-weight: 500;
}

.notes-hint {
  color: var(--color-text-muted);
  font-size: 12px;
  margin-left: 4px;
  cursor: help;
}

.groups-cell {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-sub {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.test-result {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin-top: 12px;
  border-radius: 8px;
  font-size: 13px;
}

.test-ok {
  background: var(--color-success-bg, rgba(34, 197, 94, 0.1));
  color: var(--color-success, #22c55e);
}

.test-fail {
  background: var(--color-danger-bg, rgba(239, 68, 68, 0.1));
  color: var(--color-danger, #ef4444);
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.total-info {
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
