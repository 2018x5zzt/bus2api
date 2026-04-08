<!-- StatusView: User-visible group pool availability -->
<template>
  <div class="animate-fade-in">
    <div class="page-header status-header">
      <div>
        <h1 class="page-title">{{ t('status.title') }}</h1>
        <p class="status-subtitle">{{ t('status.description') }}</p>
      </div>
      <button class="btn-secondary btn-sm" :disabled="loading" @click="loadStatus">
        <RefreshCw :size="14" :class="{ spinning: loading }" />
        {{ t('status.refresh') }}
      </button>
    </div>

    <section class="status-hero" :class="`hero-${overallState}`">
      <div class="status-hero-copy">
        <div class="status-hero-kicker">{{ t('status.overall') }}</div>
        <div class="status-hero-value">{{ formatPercent(overallRatio) }}</div>
        <p class="status-hero-text">{{ overallMessage }}</p>
      </div>
      <div class="status-hero-icon">
        <ShieldCheck v-if="overallState === 'healthy'" :size="32" />
        <Activity v-else-if="overallState === 'degraded'" :size="32" />
        <ShieldAlert v-else :size="32" />
      </div>
    </section>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">{{ t('status.visiblePools') }}</div>
        <div class="stat-value">{{ groups.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('status.availableAccounts') }}</div>
        <div class="stat-value">{{ totalAvailable }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('status.limitedAccounts') }}</div>
        <div class="stat-value">{{ totalLimited }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('status.lastCheck') }}</div>
        <div class="stat-value status-last-check">{{ lastCheck }}</div>
      </div>
    </div>

    <div v-if="error && groups.length === 0" class="empty-state">
      <ShieldAlert :size="40" class="empty-state-icon" />
      <div>{{ error }}</div>
      <button class="btn-secondary btn-sm" @click="loadStatus">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="!loading && groups.length === 0" class="empty-state">
      <TrendingUp :size="40" class="empty-state-icon" />
      <div>{{ t('status.noGroups') }}</div>
      <div class="empty-hint">{{ t('status.noGroupsHint') }}</div>
    </div>

    <div v-else class="pool-grid">
      <article v-for="group in groups" :key="group.group_id" class="card pool-card">
        <div class="pool-card-header">
          <div class="pool-card-copy">
            <div class="pool-name-row">
              <h2 class="pool-name">{{ group.group_name }}</h2>
              <span class="platform-badge">{{ formatPlatform(group.platform) }}</span>
            </div>
            <p class="pool-status-text">{{ groupSummaryText(group) }}</p>
          </div>
          <div class="pool-percent" :class="`percent-${groupDisplayState(group)}`">
            {{ formatPercent(group.availability_ratio) }}
          </div>
        </div>

        <div class="pool-metrics">
          <div class="pool-metric">
            <span class="pool-metric-label">{{ t('status.availableAccounts') }}</span>
            <strong>{{ group.available_account_count }}</strong>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">{{ t('status.limitedAccounts') }}</span>
            <strong>{{ group.rate_limited_account_count }}</strong>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">{{ t('status.totalAccounts') }}</span>
            <strong>{{ group.total_accounts }}</strong>
          </div>
        </div>

        <div class="pool-trend">
          <div class="pool-trend-header">
            <span>{{ t('status.trend') }}</span>
            <span class="pool-trend-hint">
              {{
                hasTrend(group.group_id)
                  ? t('status.trendHint')
                  : t('status.noTrend')
              }}
            </span>
          </div>
          <svg
            class="pool-trend-chart"
            viewBox="0 0 240 64"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="0" y1="58" x2="240" y2="58" class="trend-axis" />
            <polyline
              :points="sparklinePoints(group.group_id)"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              :class="['trend-line', `trend-${groupDisplayState(group)}`]"
            />
          </svg>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Activity, RefreshCw, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-vue-next'
import { groupsAPI } from '@/api/groups'
import type { GroupPoolStatus } from '@/types'

const { t } = useI18n()

const POLL_INTERVAL_MS = 30_000
const HISTORY_LIMIT = 20
const CHART_WIDTH = 240
const CHART_HEIGHT = 64
const CHART_PADDING = 6
const HEALTHY_RATIO_THRESHOLD = 0.65

type DisplayState = 'healthy' | 'degraded' | 'down'

const groups = ref<GroupPoolStatus[]>([])
const historyByGroup = ref<Record<number, number[]>>({})
const loading = ref(false)
const error = ref('')
const lastCheck = ref('-')

let timer: ReturnType<typeof setInterval> | undefined

const totalAvailable = computed(() =>
  groups.value.reduce((sum, group) => sum + group.available_account_count, 0),
)

const totalLimited = computed(() =>
  groups.value.reduce((sum, group) => sum + group.rate_limited_account_count, 0),
)

const overallRatio = computed(() => {
  const denominator = totalAvailable.value + totalLimited.value
  if (denominator <= 0) {
    return totalAvailable.value > 0 ? 1 : 0
  }
  return totalAvailable.value / denominator
})

function resolveDisplayState(available: number, ratio: number): DisplayState {
  if (available <= 0) {
    return 'down'
  }

  if (ratio >= HEALTHY_RATIO_THRESHOLD) {
    return 'healthy'
  }

  return 'degraded'
}

const overallState = computed<DisplayState>(() =>
  groups.value.length === 0 ? 'down' : resolveDisplayState(totalAvailable.value, overallRatio.value),
)

const overallMessage = computed(() => {
  const percent = formatPercent(overallRatio.value)
  const messages: Record<DisplayState, string> = {
    healthy: t('status.overallHealthy', { percent }),
    degraded: t('status.overallDegraded', { percent }),
    down: t('status.overallDown'),
  }
  return messages[overallState.value]
})

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatPlatform(platform: string): string {
  return platform.replace(/_/g, ' ').toUpperCase()
}

function groupDisplayState(group: GroupPoolStatus): DisplayState {
  return resolveDisplayState(group.available_account_count, group.availability_ratio)
}

function groupSummaryText(group: GroupPoolStatus): string {
  const state = groupDisplayState(group)
  const percent = formatPercent(group.availability_ratio)
  const messages: Record<DisplayState, string> = {
    healthy: t('status.groupHealthy', { percent }),
    degraded: t('status.groupDegraded', { percent }),
    down: t('status.groupDown'),
  }

  return messages[state]
}

function hasTrend(groupID: number): boolean {
  return (historyByGroup.value[groupID]?.length ?? 0) > 1
}

function pushHistory(nextGroups: GroupPoolStatus[]): void {
  const nextHistory: Record<number, number[]> = {}

  nextGroups.forEach((group) => {
    const previous = historyByGroup.value[group.group_id] ?? []
    nextHistory[group.group_id] = [...previous, group.availability_ratio * 100].slice(-HISTORY_LIMIT)
  })

  historyByGroup.value = nextHistory
}

function sparklinePoints(groupID: number): string {
  const rawValues = historyByGroup.value[groupID] ?? []
  const values = rawValues.length > 1 ? rawValues : [rawValues[0] ?? 0, rawValues[0] ?? 0]
  const stepX = (CHART_WIDTH - CHART_PADDING * 2) / (values.length - 1)

  return values
    .map((value, index) => {
      const x = CHART_PADDING + stepX * index
      const y = CHART_HEIGHT - CHART_PADDING - (Math.max(0, Math.min(100, value)) / 100) * (CHART_HEIGHT - CHART_PADDING * 2)
      return `${x},${y}`
    })
    .join(' ')
}

async function loadStatus(): Promise<void> {
  loading.value = true
  try {
    const data = await groupsAPI.getPoolStatus()
    groups.value = data.groups ?? []
    pushHistory(groups.value)
    lastCheck.value = new Date(data.checked_at).toLocaleTimeString()
    error.value = ''
  } catch {
    error.value = t('status.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStatus()
  timer = setInterval(loadStatus, POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.status-header {
  align-items: flex-start;
}

.status-subtitle {
  margin-top: 6px;
  color: var(--color-text-secondary);
  max-width: 720px;
}

.status-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border-radius: var(--radius-xl);
  margin-bottom: 24px;
  border: 1px solid transparent;
}

.hero-healthy {
  background: linear-gradient(135deg, #ecfdf5, #dcfce7);
  border-color: #bbf7d0;
  color: #166534;
}

.hero-degraded {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.hero-down {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border-color: #fecaca;
  color: #991b1b;
}

.status-hero-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-hero-value {
  font-size: 42px;
  line-height: 1;
  font-weight: 800;
  margin: 8px 0 10px;
}

.status-hero-text {
  max-width: 640px;
  font-size: 14px;
}

.status-hero-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.status-last-check {
  font-size: 16px;
}

.pool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.pool-card {
  padding: 20px;
}

.pool-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.pool-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.pool-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.platform-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.pool-status-text {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.pool-percent {
  font-size: 28px;
  line-height: 1;
  font-weight: 800;
}

.percent-healthy {
  color: var(--color-success);
}

.percent-degraded {
  color: #2563eb;
}

.percent-down {
  color: var(--color-danger);
}

.pool-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.pool-metric {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.pool-metric-label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.pool-metric strong {
  font-size: 20px;
  line-height: 1;
}

.pool-trend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.pool-trend-hint {
  font-size: 11px;
  color: var(--color-text-muted);
}

.pool-trend-chart {
  display: block;
  width: 100%;
  height: 64px;
}

.trend-axis {
  stroke: #e2e8f0;
  stroke-width: 1;
}

.trend-line {
  transition: stroke 0.2s ease;
}

.trend-healthy {
  stroke: var(--color-success);
}

.trend-degraded {
  stroke: #2563eb;
}

.trend-down {
  stroke: var(--color-danger);
}

.empty-hint {
  color: var(--color-text-secondary);
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .status-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .pool-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
