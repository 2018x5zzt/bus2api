<template>
  <div class="animate-fade-in">
    <div class="page-header dashboard-header">
      <h1 class="page-title">{{ t('dashboard.title') }}</h1>
      <div class="dashboard-controls">
        <div class="segmented">
          <button
            :class="['segment', { active: selectedRange === '7d' }]"
            data-testid="range-7d"
            @click="changeRange('7d')"
          >
            {{ t('dashboard.range7d') }}
          </button>
          <button
            :class="['segment', { active: selectedRange === '30d' }]"
            data-testid="range-30d"
            @click="changeRange('30d')"
          >
            {{ t('dashboard.range30d') }}
          </button>
        </div>

        <div class="segmented">
          <button
            :class="['segment', { active: granularity === 'day' }]"
            data-testid="granularity-day"
            @click="changeGranularity('day')"
          >
            {{ t('dashboard.granularityDay') }}
          </button>
          <button
            :class="['segment', { active: granularity === 'hour' }]"
            data-testid="granularity-hour"
            @click="changeGranularity('hour')"
          >
            {{ t('dashboard.granularityHour') }}
          </button>
        </div>
      </div>
    </div>

    <div class="stats-grid dashboard-stats-grid">
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.balance') }}</div>
        <div class="stat-value">${{ authStore.balance.toFixed(2) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.totalKeys') }}</div>
        <div class="stat-value">{{ stats?.total_api_keys ?? 0 }}</div>
        <div class="stat-sub">{{ t('dashboard.activeKeys') }}: {{ stats?.active_api_keys ?? 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.todayRequests') }}</div>
        <div class="stat-value">{{ formatNumber(stats?.today_requests) }}</div>
        <div class="stat-sub">{{ t('dashboard.todayCost') }}: ${{ stats?.today_cost?.toFixed(4) ?? '0.0000' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.totalRequests') }}</div>
        <div class="stat-value">{{ formatNumber(stats?.total_requests) }}</div>
        <div class="stat-sub">{{ t('dashboard.totalCost') }}: ${{ stats?.total_cost?.toFixed(4) ?? '0.0000' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.todayTokens') }}</div>
        <div class="stat-value">{{ formatNumber(stats?.today_tokens) }}</div>
        <div class="stat-sub">{{ t('dashboard.todayInputTokens') }}: {{ formatNumber(stats?.today_input_tokens) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.totalTokens') }}</div>
        <div class="stat-value">{{ formatNumber(stats?.total_tokens) }}</div>
        <div class="stat-sub">{{ t('dashboard.todayOutputTokens') }}: {{ formatNumber(stats?.today_output_tokens) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.rpm') }}</div>
        <div class="stat-value">{{ stats?.rpm ?? 0 }}</div>
        <div class="stat-sub">{{ t('dashboard.tpm') }}: {{ formatNumber(stats?.tpm) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.averageResponseTime') }}</div>
        <div class="stat-value">{{ formatDuration(stats?.average_duration_ms) }}</div>
        <div class="stat-sub">{{ t('dashboard.modelUsage') }}: {{ modelData.length }}</div>
      </div>
    </div>

    <div class="charts-row">
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">{{ t('dashboard.trend') }}</span>
        </div>
        <div class="chart-wrap">
          <v-chart v-if="trendOption" :option="trendOption" autoresize />
          <div v-else class="empty-state">{{ t('common.loading') }}</div>
        </div>
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">{{ t('dashboard.modelUsage') }}</span>
        </div>
        <div class="chart-wrap">
          <v-chart v-if="modelOption" :option="modelOption" autoresize />
          <div v-else class="empty-state">{{ t('common.loading') }}</div>
        </div>
      </div>
    </div>

    <div class="card recent-usage-card">
      <div class="card-header">
        <span class="card-title">{{ t('dashboard.recentUsage') }}</span>
      </div>
      <div v-if="recentUsage.length > 0" class="recent-usage-list">
        <div v-for="record in recentUsage" :key="record.id" class="recent-usage-item">
          <div class="recent-usage-main">
            <div class="recent-usage-model">{{ record.model }}</div>
            <div class="recent-usage-meta">
              <span>{{ formatDateTime(record.created_at) }}</span>
              <span>{{ formatNumber(record.input_tokens + record.output_tokens) }} tokens</span>
            </div>
          </div>
          <div class="recent-usage-cost">${{ record.actual_cost.toFixed(4) }}</div>
        </div>
      </div>
      <div v-else class="empty-state recent-usage-empty">{{ t('usage.noRecords') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAuthStore } from '@/stores/auth'
import { usageAPI } from '@/api/usage'
import type { DashboardStats, ModelStat, TrendDataPoint, UsageLog } from '@/types'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
])

const { t } = useI18n()
const authStore = useAuthStore()

const stats = ref<DashboardStats | null>(null)
const trendData = ref<TrendDataPoint[]>([])
const modelData = ref<ModelStat[]>([])
const recentUsage = ref<UsageLog[]>([])
const selectedRange = ref<'7d' | '30d'>('7d')
const granularity = ref<'day' | 'hour'>('day')

function formatNumber(value: number | undefined): string {
  if (!value) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

function formatDuration(value: number | undefined): string {
  return `${Math.round(value ?? 0)} ms`
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDateRange(range: '7d' | '30d'): { start_date: string; end_date: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (range === '30d' ? 29 : 6))
  return {
    start_date: formatDate(start),
    end_date: formatDate(end),
  }
}

async function loadDashboard(): Promise<void> {
  const range = getDateRange(selectedRange.value)
  const [statsResp, trendResp, modelsResp, usageResp] = await Promise.all([
    usageAPI.getDashboardStats(),
    usageAPI.getDashboardTrend({
      ...range,
      granularity: granularity.value,
    }),
    usageAPI.getDashboardModels(range),
    usageAPI.query({ page: 1, page_size: 5 }),
  ])

  stats.value = statsResp
  trendData.value = trendResp.trend ?? []
  modelData.value = modelsResp.models ?? []
  recentUsage.value = usageResp.data ?? []
}

async function changeRange(range: '7d' | '30d'): Promise<void> {
  if (selectedRange.value === range) return
  selectedRange.value = range
  await loadDashboard()
}

async function changeGranularity(nextGranularity: 'day' | 'hour'): Promise<void> {
  if (granularity.value === nextGranularity) return
  granularity.value = nextGranularity
  await loadDashboard()
}

const trendOption = computed(() => {
  if (trendData.value.length === 0) return null
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: {
      type: 'category',
      data: trendData.value.map((item) => item.date),
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        type: 'line',
        data: trendData.value.map((item) => item.requests),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#2563eb', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37,99,235,0.15)' },
              { offset: 1, color: 'rgba(37,99,235,0)' },
            ],
          },
        },
      },
    ],
  }
})

const modelOption = computed(() => {
  if (modelData.value.length === 0) return null
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        label: { show: true, fontSize: 11 },
        data: modelData.value.map((item) => ({
          name: item.model,
          value: item.requests,
        })),
      },
    ],
  }
})

onMounted(async () => {
  try {
    await loadDashboard()
  } catch {
    // Empty-state fallback is sufficient for the current dashboard surface.
  }
})
</script>

<style scoped>
.dashboard-header {
  align-items: flex-start;
  gap: 12px;
}

.dashboard-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.segmented {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg);
}

.segment {
  border: 0;
  background: transparent;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.segment.active {
  background: var(--color-primary);
  color: white;
}

.dashboard-stats-grid {
  margin-bottom: 16px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  min-height: 320px;
}

.chart-wrap {
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recent-usage-card {
  margin-top: 16px;
}

.recent-usage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-usage-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.recent-usage-item:last-child {
  border-bottom: 0;
}

.recent-usage-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-usage-model {
  font-weight: 600;
}

.recent-usage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.recent-usage-cost {
  font-weight: 600;
  white-space: nowrap;
}

.recent-usage-empty {
  min-height: 120px;
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }

  .recent-usage-item {
    flex-direction: column;
  }
}
</style>
