<!-- UsageView: Token usage logs with pagination -->
<template>
  <div class="animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">{{ t('usage.title') }}</h1>
    </div>

    <div class="card" style="padding: 0">
      <div class="table-container" v-if="logs.length > 0">
        <table>
          <thead>
            <tr>
              <th>{{ t('usage.model') }}</th>
              <th>{{ t('usage.inputTokens') }}</th>
              <th>{{ t('usage.outputTokens') }}</th>
              <th>{{ t('usage.cacheTokens') }}</th>
              <th>{{ t('usage.cost') }}</th>
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
      <button :disabled="page <= 1" @click="goPage(page - 1)">&lt;</button>
      <button
        v-for="p in visiblePages"
        :key="p"
        :class="{ active: p === page }"
        @click="goPage(p)"
      >
        {{ p }}
      </button>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">&gt;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usageAPI } from '@/api/usage'
import type { UsageLog } from '@/types'

const { t } = useI18n()

const PAGE_SIZE = 20

const logs = ref<UsageLog[]>([])
const page = ref(1)
const pageSize = PAGE_SIZE
const total = ref(0)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const visiblePages = computed(() => {
  const pages: number[] = []
  const MAX_VISIBLE = 5
  let start = Math.max(1, page.value - Math.floor(MAX_VISIBLE / 2))
  const end = Math.min(totalPages.value, start + MAX_VISIBLE - 1)
  start = Math.max(1, end - MAX_VISIBLE + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

async function fetchLogs(): Promise<void> {
  loading.value = true
  try {
    const resp = await usageAPI.query({
      page: page.value,
      page_size: pageSize,
    })
    logs.value = resp.data ?? []
    total.value = resp.total ?? 0
  } catch {
    // API error
  } finally {
    loading.value = false
  }
}

function goPage(p: number): void {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  fetchLogs()
}

onMounted(fetchLogs)
</script>

<style scoped>
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
</style>
