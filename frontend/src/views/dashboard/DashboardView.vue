<!-- DashboardView: Overview stats + charts -->
<template>
  <div class="animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">{{ t('dashboard.title') }}</h1>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
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
        <div class="stat-sub">{{ t('dashboard.todayCost') }}: ${{ stats?.today_cost?.toFixed(4) ?? '0.00' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('dashboard.totalRequests') }}</div>
        <div class="stat-value">{{ formatNumber(stats?.total_requests) }}</div>
        <div class="stat-sub">{{ t('dashboard.totalCost') }}: ${{ stats?.total_cost?.toFixed(4) ?? '0.00' }}</div>
      </div>
    </div>

    <!-- Charts Row -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import { useAuthStore } from '@/stores/auth'
import { usageAPI } from '@/api/usage'
import type { DashboardStats, TrendDataPoint, ModelStat } from '@/types'

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

function formatNumber(n: number | undefined): string {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

const trendOption = computed(() => {
  if (trendData.value.length === 0) return null
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: {
      type: 'category',
      data: trendData.value.map((d) => d.date),
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
        data: trendData.value.map((d) => d.requests),
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
        data: modelData.value.map((m) => ({
          name: m.model,
          value: m.requests,
        })),
      },
    ],
  }
})

onMounted(async () => {
  try {
    const [s, tr, md] = await Promise.all([
      usageAPI.getDashboardStats(),
      usageAPI.getDashboardTrend(),
      usageAPI.getDashboardModels(),
    ])
    stats.value = s
    trendData.value = tr.trend ?? []
    modelData.value = md.models ?? []
  } catch {
    // API unavailable — show empty state
  }
})
</script>

<style scoped>
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

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
