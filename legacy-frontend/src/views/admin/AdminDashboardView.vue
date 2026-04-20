<script setup lang="ts">
/**
 * AdminDashboardView — 管理概览页面
 * 展示平台统计数据、实时监控指标、用量趋势图表
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw as RefreshIcon } from 'lucide-vue-next'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { adminDashboardAPI } from '@/api/admin'
import type {
  AdminDashboardStats,
  AdminRealtimeStats,
} from '@/api/admin/dashboard'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const REALTIME_REFRESH_MS = 10_000

const { t } = useI18n()

// ==================== 状态 ====================
const loading = ref(true)
const error = ref<string | null>(null)
const stats = ref<AdminDashboardStats | null>(null)
const realtime = ref<AdminRealtimeStats | null>(null)
const trendPoints = ref<
  Array<{ date: string; requests: number; cost: number; tokens: number }>
>([])

let realtimeTimer: ReturnType<typeof setInterval> | null = null

// ==================== 统计卡片配置 ====================
const statCards = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { label: t('adminDashboard.totalUsers'), value: s.total_users.toLocaleString() },
    { label: t('adminDashboard.activeUsers'), value: s.active_users.toLocaleString() },
    { label: t('adminDashboard.totalAccounts'), value: s.total_accounts.toLocaleString() },
    { label: t('adminDashboard.activeAccounts'), value: s.active_accounts.toLocaleString() },
    { label: t('adminDashboard.totalGroups'), value: s.total_groups.toLocaleString() },
    { label: t('adminDashboard.totalChannels'), value: s.total_channels.toLocaleString() },
    { label: t('adminDashboard.totalKeys'), value: s.total_keys.toLocaleString() },
    { label: t('adminDashboard.todayRequests'), value: s.today_requests.toLocaleString() },
    { label: t('adminDashboard.todayCost'), value: `$${s.today_cost.toFixed(2)}` },
    { label: t('adminDashboard.totalRevenue'), value: `$${s.total_revenue.toFixed(2)}` },
  ]
})

// ==================== 实时卡片配置 ====================
const realtimeCards = computed(() => {
  if (!realtime.value) return []
  const r = realtime.value
  return [
    { label: t('adminDashboard.activeConnections'), value: r.active_connections.toLocaleString() },
    { label: t('adminDashboard.requestsPerMinute'), value: r.requests_per_minute.toLocaleString() },
    { label: t('adminDashboard.avgLatency'), value: `${r.avg_latency_ms.toFixed(0)}ms` },
    { label: t('adminDashboard.errorRate'), value: `${(r.error_rate * 100).toFixed(2)}%` },
  ]
})

// ==================== ECharts 配置 ====================
const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' as const },
  legend: {
    data: [
      t('adminDashboard.requests'),
      t('adminDashboard.cost'),
      t('adminDashboard.tokens'),
    ],
  },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: trendPoints.value.map((p) => p.date),
  },
  yAxis: [
    { type: 'value' as const, name: t('adminDashboard.requests') },
    { type: 'value' as const, name: t('adminDashboard.cost'), alignTicks: true },
  ],
  series: [
    {
      name: t('adminDashboard.requests'),
      type: 'line' as const,
      smooth: true,
      data: trendPoints.value.map((p) => p.requests),
    },
    {
      name: t('adminDashboard.cost'),
      type: 'line' as const,
      smooth: true,
      yAxisIndex: 1,
      data: trendPoints.value.map((p) => p.cost),
    },
    {
      name: t('adminDashboard.tokens'),
      type: 'line' as const,
      smooth: true,
      data: trendPoints.value.map((p) => p.tokens),
    },
  ],
}))

// ==================== 数据加载 ====================
async function fetchAll(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [statsRes, realtimeRes, trendRes] = await Promise.all([
      adminDashboardAPI.getStats(),
      adminDashboardAPI.getRealtimeStats(),
      adminDashboardAPI.getTrend(),
    ])
    stats.value = statsRes
    realtime.value = realtimeRes
    trendPoints.value = trendRes.points
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function refreshRealtime(): Promise<void> {
  try {
    realtime.value = await adminDashboardAPI.getRealtimeStats()
  } catch {
    // 静默失败，保留旧数据
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchAll()
  realtimeTimer = setInterval(refreshRealtime, REALTIME_REFRESH_MS)
})

onUnmounted(() => {
  if (realtimeTimer) {
    clearInterval(realtimeTimer)
    realtimeTimer = null
  }
})
</script>

<template>
  <div class="animate-fade-in">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">{{ t('adminDashboard.title') }}</h1>
      <button class="btn-secondary" :disabled="loading" @click="fetchAll">
        <RefreshIcon :size="16" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- 加载态 -->
    <div v-if="loading && !stats" class="loading-center">
      <div class="spinner" />
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error && !stats" class="empty-state">
      <p>{{ t('common.error') }}: {{ error }}</p>
      <button class="btn-primary" style="margin-top: 12px" @click="fetchAll">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div v-for="card in statCards" :key="card.label" class="stat-card">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
        </div>
      </div>

      <!-- 实时监控 -->
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title">{{ t('adminDashboard.realtimeTitle') }}</h2>
        </div>
        <div class="realtime-grid">
          <div v-for="card in realtimeCards" :key="card.label" class="stat-card">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value">{{ card.value }}</div>
          </div>
        </div>
      </div>

      <!-- 用量趋势图表 -->
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title">{{ t('adminDashboard.trendTitle') }}</h2>
        </div>
        <VChart
          v-if="trendPoints.length > 0"
          :option="chartOption"
          class="trend-chart"
          autoresize
        />
        <div v-else class="empty-state">
          <p>{{ t('common.noData') }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--color-text-secondary);
}

.section-card {
  margin-bottom: 24px;
}

.realtime-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.trend-chart {
  width: 100%;
  height: 360px;
}

@media (max-width: 768px) {
  .realtime-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
