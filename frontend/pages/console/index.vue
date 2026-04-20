<script setup lang="ts">
import type {
  DashboardModelsResponse,
  DashboardTrendResponse,
  UserDashboardStats,
} from '~/types/api-helpers'
import { formatMoney, formatNumber } from '~/utils/format'

definePageMeta({ layout: 'console' })

const { $api } = useApi()
const pending = ref(true)
const errorMessage = ref('')
const stats = ref<UserDashboardStats | null>(null)
const trend = ref<DashboardTrendResponse['trend']>([])
const models = ref<DashboardModelsResponse['models']>([])

async function loadDashboard() {
  pending.value = true
  errorMessage.value = ''

  try {
    const [statsData, trendData, modelData] = await Promise.all([
      $api<UserDashboardStats>('/api/v1/usage/dashboard/stats'),
      $api<DashboardTrendResponse>('/api/v1/usage/dashboard/trend'),
      $api<DashboardModelsResponse>('/api/v1/usage/dashboard/models'),
    ])

    stats.value = statsData
    trend.value = trendData.trend
    models.value = modelData.models
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '控制台数据加载失败。'
  }
  finally {
    pending.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-medium text-teal-700">Overview</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">用户控制台总览</h1>
      <p class="mt-3 text-sm leading-6 text-slate-600">这里先聚焦可运营的核心指标：Key 数量、调用量、Token 和实际消费。</p>
    </div>

    <div v-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
      {{ errorMessage }}
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">活跃 Keys</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatNumber(stats?.active_api_keys) }}</p>
        <p class="mt-2 text-sm text-slate-500">总数 {{ pending ? '--' : formatNumber(stats?.total_api_keys) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">今日请求数</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatNumber(stats?.today_requests) }}</p>
        <p class="mt-2 text-sm text-slate-500">累计 {{ pending ? '--' : formatNumber(stats?.total_requests) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">今日 Tokens</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatNumber(stats?.today_tokens) }}</p>
        <p class="mt-2 text-sm text-slate-500">累计 {{ pending ? '--' : formatNumber(stats?.total_tokens) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">实际消费</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatMoney(stats?.today_actual_cost) }}</p>
        <p class="mt-2 text-sm text-slate-500">累计 {{ pending ? '--' : formatMoney(stats?.total_actual_cost) }}</p>
      </article>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-slate-950">最近趋势</h2>
            <p class="mt-1 text-sm text-slate-500">最近时间片的请求量与消费。</p>
          </div>
          <button class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" @click="loadDashboard">
            刷新
          </button>
        </div>

        <div class="mt-5 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-slate-200 text-slate-500">
              <tr>
                <th class="px-3 py-3 font-medium">时间</th>
                <th class="px-3 py-3 font-medium">请求</th>
                <th class="px-3 py-3 font-medium">Tokens</th>
                <th class="px-3 py-3 font-medium">实际消费</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in trend.slice(0, 8)" :key="item.date" class="border-b border-slate-100 last:border-0">
                <td class="px-3 py-3 text-slate-700">{{ item.date }}</td>
                <td class="px-3 py-3 text-slate-950">{{ formatNumber(item.requests) }}</td>
                <td class="px-3 py-3 text-slate-950">{{ formatNumber(item.total_tokens) }}</td>
                <td class="px-3 py-3 text-slate-950">{{ formatMoney(item.actual_cost) }}</td>
              </tr>
              <tr v-if="!pending && trend.length === 0">
                <td colspan="4" class="px-3 py-6 text-center text-slate-500">还没有趋势数据。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">模型消耗分布</h2>
        <p class="mt-1 text-sm text-slate-500">按模型聚合调用量和消费。</p>
        <div class="mt-5 space-y-3">
          <div
            v-for="item in models.slice(0, 8)"
            :key="item.model"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-medium text-slate-950">{{ item.model }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ formatNumber(item.requests) }} 次请求 / {{ formatNumber(item.total_tokens) }} Tokens</p>
              </div>
              <p class="text-sm font-medium text-slate-950">{{ formatMoney(item.actual_cost) }}</p>
            </div>
          </div>
          <p v-if="!pending && models.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            还没有模型聚合数据。
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
