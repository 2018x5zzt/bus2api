<!-- KeysView: API Key management with enterprise filters & create dialog -->
<template>
  <div class="animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">{{ t('keys.title') }}</h1>
      <button class="btn-primary" @click="showCreate = true">
        <PlusIcon :size="16" />
        {{ t('keys.create') }}
      </button>
    </div>

    <!-- Filter Bar -->
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
        <input
          v-model.number="filters.group_id"
          type="number"
          class="input input-sm"
          :placeholder="t('keys.groupId')"
          min="0"
          @change="fetchKeys"
        />
      </div>
      <div class="filter-item">
        <select v-model="filters.status" class="input input-sm" @change="fetchKeys">
          <option value="">{{ t('keys.statusAll') }}</option>
          <option value="active">{{ t('keys.active') }}</option>
          <option value="inactive">{{ t('keys.inactive') }}</option>
        </select>
      </div>
    </div>

    <!-- Keys Table -->
    <div class="card" style="padding: 0">
      <div class="table-container" v-if="keys.length > 0">
        <table>
          <thead>
            <tr>
              <th>{{ t('keys.name') }}</th>
              <th>{{ t('keys.key') }}</th>
              <th>{{ t('keys.group') }}</th>
              <th>{{ t('keys.status') }}</th>
              <th>{{ t('keys.quota') }}</th>
              <th>{{ t('keys.used') }}</th>
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
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span :class="['badge', key.status === 'active' ? 'badge-success' : 'badge-neutral']">
                  {{ key.status === 'active' ? t('keys.active') : t('keys.inactive') }}
                </span>
              </td>
              <td>{{ key.quota > 0 ? `$${key.quota.toFixed(2)}` : '∞' }}</td>
              <td>${{ key.used_quota?.toFixed(4) ?? '0.00' }}</td>
              <td>
                <div class="rate-limit-cell">
                  <span v-if="hasRateLimit(key)" class="rate-limits">
                    <span v-if="key.rate_limit_5h">{{ t('keys.rateLimit5h') }}: ${{ key.rate_limit_5h }}</span>
                    <span v-if="key.rate_limit_1d">{{ t('keys.rateLimit1d') }}: ${{ key.rate_limit_1d }}</span>
                    <span v-if="key.rate_limit_7d">{{ t('keys.rateLimit7d') }}: ${{ key.rate_limit_7d }}</span>
                  </span>
                  <span v-else class="text-muted">{{ t('keys.noLimit') }}</span>
                </div>
              </td>
              <td class="text-muted">{{ key.expires_at ? formatDate(key.expires_at) : '∞' }}</td>
              <td class="text-muted">{{ formatDate(key.created_at) }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn-ghost btn-sm" @click="toggleStatus(key)">
                    {{ key.status === 'active' ? '⏸' : '▶' }}
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

    <!-- Pagination -->
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

    <!-- Create Dialog -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal modal-lg animate-fade-in">
        <div class="modal-header">{{ t('keys.createDialog.title') }}</div>
        <form @submit.prevent="handleCreate" class="create-form">
          <!-- Basic -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.name') }}</label>
              <input
                v-model="newKey.name"
                type="text"
                class="input"
                :placeholder="t('keys.createDialog.namePlaceholder')"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.group') }}</label>
              <input
                v-model.number="newKey.group_id"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.groupPlaceholder')"
                min="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.quota') }}</label>
              <input
                v-model.number="newKey.quota"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.quotaPlaceholder')"
                min="0"
                step="0.01"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.expiry') }}</label>
              <input
                v-model.number="newKey.expires_in_days"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.expiryPlaceholder')"
                min="0"
              />
            </div>
          </div>

          <!-- IP Lists -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.ipWhitelist') }}</label>
              <input
                v-model="newKey.ip_whitelist_raw"
                type="text"
                class="input"
                :placeholder="t('keys.createDialog.ipWhitelistPlaceholder')"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.ipBlacklist') }}</label>
              <input
                v-model="newKey.ip_blacklist_raw"
                type="text"
                class="input"
                :placeholder="t('keys.createDialog.ipBlacklistPlaceholder')"
              />
            </div>
          </div>

          <!-- Rate Limits -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.rateLimit5h') }}</label>
              <input
                v-model.number="newKey.rate_limit_5h"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.rateLimitPlaceholder')"
                min="0"
                step="0.01"
              />
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('keys.createDialog.rateLimit1d') }}</label>
              <input
                v-model.number="newKey.rate_limit_1d"
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
                v-model.number="newKey.rate_limit_7d"
                type="number"
                class="input"
                :placeholder="t('keys.createDialog.rateLimitPlaceholder')"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showCreate = false">
              {{ t('keys.createDialog.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="creating">
              <span v-if="creating" class="spinner"></span>
              {{ t('keys.createDialog.submit') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Plus as PlusIcon,
  Copy as CopyIcon,
  Trash2 as TrashIcon,
  Key as KeyIcon,
} from 'lucide-vue-next'
import { keysAPI } from '@/api/keys'
import type { ApiKey } from '@/types'

const { t } = useI18n()

const PAGE_SIZE = 20

const keys = ref<ApiKey[]>([])
const page = ref(1)
const pageSize = PAGE_SIZE
const total = ref(0)
const loading = ref(false)
const showCreate = ref(false)
const creating = ref(false)

const filters = reactive({
  search: '',
  status: '' as string,
  group_id: '' as string | number,
})

const newKey = reactive({
  name: '',
  quota: 0,
  expires_in_days: 0,
  group_id: null as number | null,
  ip_whitelist_raw: '',
  ip_blacklist_raw: '',
  rate_limit_5h: 0,
  rate_limit_1d: 0,
  rate_limit_7d: 0,
})

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const visiblePages = computed(() => {
  const pages: number[] = []
  const MAX_VISIBLE = 5
  let start = Math.max(1, page.value - Math.floor(MAX_VISIBLE / 2))
  const end = Math.min(totalPages.value, start + MAX_VISIBLE - 1)
  start = Math.max(1, end - MAX_VISIBLE + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_DELAY_MS = 300

function debouncedFetch(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchKeys()
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
  return key.slice(0, 8) + '...' + key.slice(-4)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

function parseIpList(raw: string): string[] {
  if (!raw.trim()) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

async function copyKey(key: string): Promise<void> {
  await navigator.clipboard.writeText(key)
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
  } catch {
    // API error handled by interceptor
  } finally {
    loading.value = false
  }
}

function resetNewKey(): void {
  newKey.name = ''
  newKey.quota = 0
  newKey.expires_in_days = 0
  newKey.group_id = null
  newKey.ip_whitelist_raw = ''
  newKey.ip_blacklist_raw = ''
  newKey.rate_limit_5h = 0
  newKey.rate_limit_1d = 0
  newKey.rate_limit_7d = 0
}

async function handleCreate(): Promise<void> {
  creating.value = true
  try {
    await keysAPI.create({
      name: newKey.name,
      quota: newKey.quota || undefined,
      expires_in_days: newKey.expires_in_days || undefined,
      group_id: newKey.group_id ?? undefined,
      ip_whitelist: parseIpList(newKey.ip_whitelist_raw),
      ip_blacklist: parseIpList(newKey.ip_blacklist_raw),
      rate_limit_5h: newKey.rate_limit_5h || undefined,
      rate_limit_1d: newKey.rate_limit_1d || undefined,
      rate_limit_7d: newKey.rate_limit_7d || undefined,
    })
    showCreate.value = false
    resetNewKey()
    await fetchKeys()
  } catch {
    // Handle error
  } finally {
    creating.value = false
  }
}

async function toggleStatus(key: ApiKey): Promise<void> {
  try {
    const newStatus = key.status === 'active' ? 'inactive' : 'active'
    await keysAPI.toggleStatus(key.id, newStatus)
    await fetchKeys()
  } catch {
    // Handle error
  }
}

async function confirmDelete(key: ApiKey): Promise<void> {
  if (!window.confirm(t('keys.deleteConfirm'))) return
  try {
    await keysAPI.delete(key.id)
    await fetchKeys()
  } catch {
    // Handle error
  }
}

function goPage(p: number): void {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  fetchKeys()
}

onMounted(() => {
  fetchKeys()
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
  gap: 4px;
}

.rate-limit-cell {
  font-size: 12px;
}

.rate-limits {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rate-limits span {
  white-space: nowrap;
}

.modal-lg {
  max-width: 640px;
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

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }

  .filter-item {
    width: 100%;
    min-width: auto;
  }

  .form-row {
    flex-direction: column;
  }
}
</style>
