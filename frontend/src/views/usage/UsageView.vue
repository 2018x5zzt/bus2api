<!-- UsageView: Token usage logs with filter bar and pagination -->
<template>
  <div class="animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">{{ t('usage.title') }}</h1>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar card">
      <div class="filter-item">
        <label class="filter-label">{{ t('usage.filterModel') }}</label>
        <input
          v-model="filters.model"
          type="text"
          class="input input-sm"
          :placeholder="t('usage.filterModelPlaceholder')"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ t('usage.apiKeyId') }}</label>
        <input
          v-model.number="filters.api_key_id"
          type="number"
          class="input input-sm"
          placeholder="ID"
          min="0"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ t('usage.groupId') }}</label>
        <select v-model="filters.group_id" class="input input-sm">
          <option value="">{{ t('usage.filterAll') }}</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ t('usage.startDate') }}</label>
        <input
          v-model="filters.start_date"
          type="date"
          class="input input-sm"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ t('usage.endDate') }}</label>
        <input
          v-model="filters.end_date"
          type="date"
          class="input input-sm"
        />
      </div>
      <div class="filter-actions">
        <button class="btn-primary btn-sm" @click="applyFilter">
          {{ t('usage.applyFilter') }}
        </button>
        <button class="btn-secondary btn-sm" @click="resetFilter">
          {{ t('usage.resetFilter') }}
        </button>
      </div>
    </div>

    <!-- Usage Table -->
    <div class="card" style="padding: 0">
      <div class="table-container" v-if="logs.length > 0">
        <table>
          <thead>
            <tr>
              <th>{{ t('usage.model') }}</th>
              <th>{{ t('usage.inputTokens') }}</th>
              <th>{{ t('usage.outputTokens') }}</th>
              <th>{{ t('usage.cacheTokens') }}</th>
              <th>{{ t('usage.actualCost') }}</th>
              <th>{{ t('usage.billableCost') }}</th>
              <th>{{ t('usage.duration') }}</th>
              <th>{{ t('usage.time') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>
                <span class="model-name">{{ log.model }}</span>
              </td>
              <td>{{ formatTokens(log.input_tokens) }}</td>
              <td>{{ formatTokens(log.output_tokens) }}</td>
              <td>{{ formatTokens(log.cache_read_tokens) }}</td>
              <td class="cost-cell">${{ log.actual_cost?.toFixed(6) ?? '0.00' }}</td>
              <td class="cost-cell">${{ log.total_cost?.toFixed(6) ?? '0.00' }}</td>
              <td class="text-muted">{{ log.duration_ms ? log.duration_ms + 'ms' : '-' }}</td>
              <td class="text-muted">{{ formatTime(log.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <p>{{ t('usage.noRecords') }}</p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usageAPI } from '@/api/usage'
import type { UsageLog, Group } from '@/types'

const { t } = useI18n()

const PAGE_SIZE = 20

const logs = ref<UsageLog[]>([])
const groups = ref<Group[]>([])
const page = ref(1)
const pageSize = PAGE_SIZE
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  model: '',
  api_key_id: undefined as number | undefined,
  group_id: '' as string | number,
  start_date: '',
  end_date: '',
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

function formatTokens(n: number): string {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function buildQueryParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {
    page: page.value,
    page_size: pageSize,
  }
  if (filters.model) params.model = filters.model
  if (filters.api_key_id) params.api_key_id = filters.api_key_id
  if (filters.group_id) params.group_id = filters.group_id
  if (filters.start_date) params.start_date = filters.start_date
  if (filters.end_date) params.end_date = filters.end_date
  return params
}

async function fetchLogs(): Promise<void> {
  loading.value = true
  try {
    const resp = await usageAPI.query(buildQueryParams())
    logs.value = resp.data ?? []
    total.value = resp.total ?? 0
  } catch {
    // API error handled by interceptor
  } finally {
    loading.value = false
  }
}

async function fetchGroups(): Promise<void> {
  try {
    const { apiClient } = await import('@/api/client')
    const { data } = await apiClient.get<{ data: Group[] }>('/groups')
    groups.value = (data as unknown as Group[]) ?? []
  } catch {
    // Groups may not be available
  }
}

function applyFilter(): void {
  page.value = 1
  fetchLogs()
}

function resetFilter(): void {
  filters.model = ''
  filters.api_key_id = undefined
  filters.group_id = ''
  filters.start_date = ''
  filters.end_date = ''
  page.value = 1
  fetchLogs()
}

function goPage(p: number): void {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  fetchLogs()
}

onMounted(() => {
  fetchLogs()
  fetchGroups()
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 16px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.filter-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.filter-item .input-sm {
  height: 34px;
  font-size: 13px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.btn-sm {
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
}

.model-name {
  font-weight: 500;
  font-size: 13px;
}

.cost-cell {
  font-family: var(--font-mono);
  font-size: 13px;
}

.text-muted {
  color: var(--color-text-secondary);
  font-size: 13px;
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
  padding: 0 8px;
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
    align-items: stretch;
  }

  .filter-item {
    width: 100%;
    min-width: auto;
  }

  .filter-actions {
    justify-content: flex-end;
  }
}
</style>
