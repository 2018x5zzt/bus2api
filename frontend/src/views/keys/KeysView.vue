<template>
  <div class="animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">{{ t('keys.title') }}</h1>
      <button class="btn-primary" @click="openCreate">
        <PlusIcon :size="16" />
        {{ t('keys.create') }}
      </button>
    </div>

    <div class="filter-bar card">
      <div class="filter-item">
        <input
          v-model="filters.search"
          type="text"
          class="input input-sm"
          :placeholder="t('keys.searchPlaceholder')"
          @input="debouncedFetch"
        />
      </div>
      <div class="filter-item">
        <select v-model="filters.group_id" class="input input-sm" @change="fetchKeys">
          <option value="">{{ t('keys.groupAll') }}</option>
          <option v-for="group in visibleGroups" :key="group.id" :value="String(group.id)">
            {{ group.name }}
          </option>
        </select>
      </div>
      <div class="filter-item">
        <select v-model="filters.status" class="input input-sm" @change="fetchKeys">
          <option value="">{{ t('keys.statusAll') }}</option>
          <option value="active">{{ t('keys.active') }}</option>
          <option value="inactive">{{ t('keys.inactive') }}</option>
        </select>
      </div>
    </div>

    <div class="card" style="padding: 0">
      <div v-if="keys.length > 0" class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('keys.name') }}</th>
              <th>{{ t('keys.key') }}</th>
              <th>{{ t('keys.group') }}</th>
              <th>{{ t('keys.status') }}</th>
              <th>{{ t('keys.quota') }}</th>
              <th>{{ t('keys.used') }}</th>
              <th>{{ t('keys.lastUsedAt') }}</th>
              <th>{{ t('keys.rateLimit') }}</th>
              <th>{{ t('keys.expires') }}</th>
              <th>{{ t('keys.created') }}</th>
              <th>{{ t('keys.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in keys" :key="key.id">
              <td class="key-name">{{ key.name || '-' }}</td>
              <td>
                <div class="key-cell">
                  <code class="key-text">{{ maskKey(key.key) }}</code>
                  <button class="btn-ghost btn-sm" @click="copyKey(key.key)">
                    <CopyIcon :size="14" />
                  </button>
                </div>
              </td>
              <td>
                <span v-if="key.group" class="badge badge-neutral">{{ key.group.name }}</span>
                <span v-else class="text-muted">{{ t('keys.createDialog.noGroup') }}</span>
              </td>
              <td>
                <span :class="['badge', key.status === 'active' ? 'badge-success' : 'badge-neutral']">
                  {{ key.status === 'active' ? t('keys.active') : t('keys.inactive') }}
                </span>
              </td>
              <td>
                <div class="stack-cell">
                  <span>{{ formatCurrency(key.quota, true) }}</span>
                  <span v-if="key.quota > 0" class="text-muted">
                    {{ quotaProgressLabel(key) }}
                  </span>
                </div>
              </td>
              <td>
                <div class="stack-cell">
                  <span>{{ formatCurrency(key.used_quota) }}</span>
                  <span class="text-muted">
                    {{ t('keys.todayUsage') }}: {{ formatCurrency(keyUsageStats[key.id]?.today_actual_cost ?? 0) }}
                  </span>
                  <span class="text-muted">
                    {{ t('keys.totalUsage') }}: {{ formatCurrency(keyUsageStats[key.id]?.total_actual_cost ?? 0) }}
                  </span>
                </div>
              </td>
              <td class="text-muted">{{ key.last_used_at ? formatDateTime(key.last_used_at) : '-' }}</td>
              <td>
                <div class="rate-limit-cell">
                  <span v-if="hasRateLimit(key)" class="rate-limits">
                    <span v-if="key.rate_limit_5h">{{ t('keys.rateLimit5h') }}: {{ rateLimitWindow(key.usage_5h, key.rate_limit_5h) }}</span>
                    <span v-if="key.rate_limit_1d">{{ t('keys.rateLimit1d') }}: {{ rateLimitWindow(key.usage_1d, key.rate_limit_1d) }}</span>
                    <span v-if="key.rate_limit_7d">{{ t('keys.rateLimit7d') }}: {{ rateLimitWindow(key.usage_7d, key.rate_limit_7d) }}</span>
                  </span>
                  <span v-else class="text-muted">{{ t('keys.noLimit') }}</span>
                </div>
              </td>
              <td class="text-muted">{{ key.expires_at ? formatDateTime(key.expires_at) : t('keys.never') }}</td>
              <td class="text-muted">{{ formatDateTime(key.created_at) }}</td>
              <td>
                <div class="action-btns">
                  <button
                    class="btn-ghost btn-sm"
                    :data-testid="`edit-key-${key.id}`"
                    @click="openEdit(key)"
                  >
                    {{ t('common.edit') }}
                  </button>
                  <button
                    v-if="key.quota > 0"
                    class="btn-ghost btn-sm"
                    :data-testid="`reset-quota-${key.id}`"
                    @click="resetQuota(key)"
                  >
                    {{ t('keys.resetQuota') }}
                  </button>
                  <button
                    v-if="hasRateLimit(key)"
                    class="btn-ghost btn-sm"
                    :data-testid="`reset-rate-limit-${key.id}`"
                    @click="resetRateLimitUsage(key)"
                  >
                    {{ t('keys.resetUsage') }}
                  </button>
                  <button class="btn-ghost btn-sm" @click="toggleStatus(key)">
                    {{ key.status === 'active' ? t('common.disable') : t('common.enable') }}
                  </button>
                  <button class="btn-ghost btn-sm text-danger" @click="confirmDelete(key)">
                    <TrashIcon :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <KeyIcon :size="40" class="empty-state-icon" />
        <p>{{ t('keys.noKeys') }}</p>
      </div>

      <div v-else class="empty-state">
        <div class="spinner"></div>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="goPage(page - 1)">{{ t('common.prev') }}</button>
      <button
        v-for="p in visiblePages"
        :key="p"
        :class="{ active: p === page }"
        @click="goPage(p)"
      >
        {{ p }}
      </button>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">{{ t('common.next') }}</button>
    </div>

    <div v-if="showCreate" class="modal-overlay" @click.self="closeCreate">
      <div class="modal modal-lg animate-fade-in">
        <div class="modal-header">{{ t('keys.createDialog.title') }}</div>
        <form class="create-form" @submit.prevent="handleCreate">
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.name') }}</label>
              <input
                v-model="createForm.name"
                data-testid="create-name"
                type="text"
                class="input"
                :placeholder="t('keys.createDialog.namePlaceholder')"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.group') }}</label>
              <select
                v-model="createForm.group_id"
                data-testid="create-group-select"
                class="input"
              >
                <option :value="null">{{ t('keys.createDialog.noGroup') }}</option>
                <option v-for="group in visibleGroups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
              <p v-if="visibleGroups.length === 0" class="empty-hint">
                {{ t('keys.noVisibleGroupsHint') }}
              </p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.customKey') }}</label>
              <input
                v-model="createForm.custom_key"
                data-testid="create-custom-key"
                type="text"
                class="input"
                :placeholder="t('keys.customKeyPlaceholder')"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.quota') }}</label>
              <input
                v-model.number="createForm.quota"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.quotaPlaceholder')"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.expiry') }}</label>
              <input
                v-model.number="createForm.expires_in_days"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.expiryPlaceholder')"
                min="0"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.ipWhitelist') }}</label>
              <input
                v-model="createForm.ip_whitelist_raw"
                type="text"
                class="input"
                :placeholder="t('keys.createDialog.ipWhitelistPlaceholder')"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.ipBlacklist') }}</label>
              <input
                v-model="createForm.ip_blacklist_raw"
                type="text"
                class="input"
                :placeholder="t('keys.createDialog.ipBlacklistPlaceholder')"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.rateLimit5h') }}</label>
              <input
                v-model.number="createForm.rate_limit_5h"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.rateLimitPlaceholder')"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.rateLimit1d') }}</label>
              <input
                v-model.number="createForm.rate_limit_1d"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.rateLimitPlaceholder')"
                min="0"
                step="0.01"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.rateLimit7d') }}</label>
              <input
                v-model.number="createForm.rate_limit_7d"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.rateLimitPlaceholder')"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeCreate">
              {{ t('keys.createDialog.cancel') }}
            </button>
            <button
              type="button"
              class="btn-primary"
              data-testid="submit-create-key"
              :disabled="creating"
              @click="handleCreate"
            >
              <span v-if="creating" class="spinner"></span>
              {{ t('keys.createDialog.submit') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEdit && editingKey" class="modal-overlay" @click.self="closeEdit">
      <div class="modal modal-lg animate-fade-in">
        <div class="modal-header">{{ t('keys.editDialog.title') }}</div>
        <form class="create-form" @submit.prevent="handleEdit">
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.name') }}</label>
              <input
                v-model="editForm.name"
                data-testid="edit-name"
                type="text"
                class="input"
                :placeholder="t('keys.editDialog.namePlaceholder')"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.boundGroup') }}</label>
              <div class="input read-only-input">{{ editingKey.group?.name || t('keys.createDialog.noGroup') }}</div>
              <p class="empty-hint">{{ t('keys.boundGroupHint') }}</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.status') }}</label>
              <select v-model="editForm.status" class="input">
                <option value="active">{{ t('keys.active') }}</option>
                <option value="inactive">{{ t('keys.inactive') }}</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.quota') }}</label>
              <input
                v-model.number="editForm.quota"
                type="number"
                class="input"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.expiresAt') }}</label>
              <input
                v-model="editForm.expires_at"
                type="datetime-local"
                class="input"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.ipWhitelist') }}</label>
              <textarea
                v-model="editForm.ip_whitelist_raw"
                class="input textarea"
                :placeholder="t('keys.editDialog.ipListPlaceholder')"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.ipBlacklist') }}</label>
              <textarea
                v-model="editForm.ip_blacklist_raw"
                class="input textarea"
                :placeholder="t('keys.editDialog.ipListPlaceholder')"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.rateLimit5h') }}</label>
              <input
                v-model.number="editForm.rate_limit_5h"
                type="number"
                class="input"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.rateLimit1d') }}</label>
              <input
                v-model.number="editForm.rate_limit_1d"
                type="number"
                class="input"
                min="0"
                step="0.01"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.editDialog.rateLimit7d') }}</label>
              <input
                v-model.number="editForm.rate_limit_7d"
                type="number"
                class="input"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeEdit">
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn-primary"
              data-testid="save-edit-key"
              :disabled="savingEdit"
              @click="handleEdit"
            >
              <span v-if="savingEdit" class="spinner"></span>
              {{ t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Copy as CopyIcon,
  Key as KeyIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
} from 'lucide-vue-next'
import { groupsAPI } from '@/api/groups'
import { keysAPI } from '@/api/keys'
import { usageAPI, type BatchApiKeyUsageStats } from '@/api/usage'
import type { ApiKey, VisibleGroupOption } from '@/types'

const { t } = useI18n()

const PAGE_SIZE = 20

const keys = ref<ApiKey[]>([])
const keyUsageStats = ref<Record<number, BatchApiKeyUsageStats>>({})
const page = ref(1)
const pageSize = PAGE_SIZE
const total = ref(0)
const loading = ref(false)
const creating = ref(false)
const savingEdit = ref(false)
const showCreate = ref(false)
const showEdit = ref(false)
const editingKey = ref<ApiKey | null>(null)
const visibleGroups = ref<VisibleGroupOption[]>([])

const filters = reactive({
  search: '',
  status: '' as string,
  group_id: '' as string | number,
})

const createForm = reactive({
  name: '',
  custom_key: '',
  quota: 0,
  expires_in_days: 0,
  group_id: null as number | null,
  ip_whitelist_raw: '',
  ip_blacklist_raw: '',
  rate_limit_5h: 0,
  rate_limit_1d: 0,
  rate_limit_7d: 0,
})

const editForm = reactive({
  name: '',
  status: 'active' as 'active' | 'inactive',
  quota: 0,
  expires_at: '',
  ip_whitelist_raw: '',
  ip_blacklist_raw: '',
  rate_limit_5h: 0,
  rate_limit_1d: 0,
  rate_limit_7d: 0,
})

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, page.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages.value, start + maxVisible - 1)
  start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_DELAY_MS = 300

function debouncedFetch(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    void fetchKeys()
  }, DEBOUNCE_DELAY_MS)
}

function hasRateLimit(key: ApiKey): boolean {
  return (key.rate_limit_5h ?? 0) > 0
    || (key.rate_limit_1d ?? 0) > 0
    || (key.rate_limit_7d ?? 0) > 0
}

function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 12) return key
  return `${key.slice(0, 8)}...${key.slice(-4)}`
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function formatDateTimeInput(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function formatCurrency(value: number, allowInfinity = false): string {
  if (allowInfinity && value <= 0) return t('keys.never')
  return `$${(value ?? 0).toFixed(2)}`
}

function quotaProgressLabel(key: ApiKey): string {
  if (key.quota <= 0) return t('keys.noLimit')
  const percent = Math.min(Math.round(((key.used_quota ?? 0) / key.quota) * 100), 100)
  return `${percent}%`
}

function rateLimitWindow(used: number | undefined, limit: number | undefined): string {
  return `$${(used ?? 0).toFixed(2)} / $${(limit ?? 0).toFixed(2)}`
}

function parseIpList(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

async function copyKey(key: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(key)
  }
}

async function fetchKeys(): Promise<void> {
  loading.value = true
  try {
    const apiFilters: Record<string, unknown> = {}
    if (filters.search) apiFilters.search = filters.search
    if (filters.status) apiFilters.status = filters.status
    if (filters.group_id) apiFilters.group_id = filters.group_id

    const resp = await keysAPI.list(page.value, pageSize, apiFilters)
    keys.value = resp.data ?? []
    total.value = resp.total ?? 0

    if (keys.value.length > 0) {
      const usageResp = await usageAPI.getDashboardApiKeysUsage(keys.value.map((key) => key.id))
      keyUsageStats.value = Object.fromEntries(
        Object.values(usageResp.stats ?? {}).map((item) => [item.api_key_id, item]),
      )
    } else {
      keyUsageStats.value = {}
    }
  } catch {
    keyUsageStats.value = {}
  } finally {
    loading.value = false
  }
}

async function loadVisibleGroups(): Promise<void> {
  try {
    visibleGroups.value = await groupsAPI.getVisibleGroups()
  } catch {
    visibleGroups.value = []
  }
}

function resetCreateForm(): void {
  createForm.name = ''
  createForm.custom_key = ''
  createForm.quota = 0
  createForm.expires_in_days = 0
  createForm.group_id = null
  createForm.ip_whitelist_raw = ''
  createForm.ip_blacklist_raw = ''
  createForm.rate_limit_5h = 0
  createForm.rate_limit_1d = 0
  createForm.rate_limit_7d = 0
}

function openCreate(): void {
  resetCreateForm()
  showCreate.value = true
}

function closeCreate(): void {
  showCreate.value = false
}

async function handleCreate(): Promise<void> {
  creating.value = true
  try {
    await keysAPI.create({
      name: createForm.name.trim(),
      custom_key: createForm.custom_key.trim() || undefined,
      quota: createForm.quota || undefined,
      expires_in_days: createForm.expires_in_days || undefined,
      group_id: createForm.group_id ?? undefined,
      ip_whitelist: parseIpList(createForm.ip_whitelist_raw),
      ip_blacklist: parseIpList(createForm.ip_blacklist_raw),
      rate_limit_5h: createForm.rate_limit_5h || undefined,
      rate_limit_1d: createForm.rate_limit_1d || undefined,
      rate_limit_7d: createForm.rate_limit_7d || undefined,
    })
    closeCreate()
    await fetchKeys()
  } finally {
    creating.value = false
  }
}

function openEdit(key: ApiKey): void {
  editingKey.value = key
  editForm.name = key.name
  editForm.status = key.status === 'active' ? 'active' : 'inactive'
  editForm.quota = key.quota
  editForm.expires_at = formatDateTimeInput(key.expires_at)
  editForm.ip_whitelist_raw = (key.ip_whitelist ?? []).join('\n')
  editForm.ip_blacklist_raw = (key.ip_blacklist ?? []).join('\n')
  editForm.rate_limit_5h = key.rate_limit_5h ?? 0
  editForm.rate_limit_1d = key.rate_limit_1d ?? 0
  editForm.rate_limit_7d = key.rate_limit_7d ?? 0
  showEdit.value = true
}

function closeEdit(): void {
  showEdit.value = false
  editingKey.value = null
}

async function handleEdit(): Promise<void> {
  if (!editingKey.value) return
  savingEdit.value = true
  try {
    await keysAPI.update(editingKey.value.id, {
      name: editForm.name.trim(),
      status: editForm.status,
      quota: editForm.quota,
      expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : '',
      ip_whitelist: parseIpList(editForm.ip_whitelist_raw),
      ip_blacklist: parseIpList(editForm.ip_blacklist_raw),
      rate_limit_5h: editForm.rate_limit_5h,
      rate_limit_1d: editForm.rate_limit_1d,
      rate_limit_7d: editForm.rate_limit_7d,
    })
    closeEdit()
    await fetchKeys()
  } finally {
    savingEdit.value = false
  }
}

async function resetQuota(key: ApiKey): Promise<void> {
  await keysAPI.update(key.id, { reset_quota: true })
  await fetchKeys()
}

async function resetRateLimitUsage(key: ApiKey): Promise<void> {
  await keysAPI.update(key.id, { reset_rate_limit_usage: true })
  await fetchKeys()
}

async function toggleStatus(key: ApiKey): Promise<void> {
  const newStatus = key.status === 'active' ? 'inactive' : 'active'
  await keysAPI.toggleStatus(key.id, newStatus)
  await fetchKeys()
}

async function confirmDelete(key: ApiKey): Promise<void> {
  if (!window.confirm(t('keys.deleteConfirm'))) return
  await keysAPI.delete(key.id)
  await fetchKeys()
}

function goPage(targetPage: number): void {
  if (targetPage < 1 || targetPage > totalPages.value) return
  page.value = targetPage
  void fetchKeys()
}

onMounted(() => {
  void Promise.all([loadVisibleGroups(), fetchKeys()])
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 16px;
}

.filter-item {
  min-width: 160px;
}

.filter-item .input-sm {
  height: 34px;
  font-size: 13px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.key-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.key-text {
  font-size: 12px;
  padding: 2px 6px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  font-family: var(--font-mono);
}

.key-name {
  font-weight: 500;
}

.text-muted {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.text-danger {
  color: var(--color-danger) !important;
}

.action-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rate-limit-cell {
  font-size: 12px;
}

.rate-limits,
.stack-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rate-limits span {
  white-space: nowrap;
}

.read-only-input {
  display: flex;
  align-items: center;
  min-height: 40px;
  cursor: default;
}

.textarea {
  min-height: 88px;
  resize: vertical;
}

.modal-lg {
  max-width: 760px;
}

.pagination {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-top: 16px;
}

.pagination button {
  min-width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

@media (max-width: 960px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
