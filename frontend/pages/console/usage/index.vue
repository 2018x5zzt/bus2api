<script setup lang="ts">
import type { PaginatedData, UsageLog, UsageStats } from '~/types/api-helpers'
import { formatDateTime, formatMoney, formatNumber } from '~/utils/format'

definePageMeta({ layout: 'console' })

const { $api } = useApi()
const pending = ref(true)
const errorMessage = ref('')
const page = ref(1)
const pageSize = 20
const selectedLog = ref<UsageLog | null>(null)

const filters = reactive({
  model: '',
  api_key_id: '',
  start_date: '',
  end_date: '',
})

const stats = ref<UsageStats | null>(null)
const logs = ref<PaginatedData<UsageLog> | null>(null)

async function loadUsage() {
  pending.value = true
  errorMessage.value = ''

  try {
    const query = {
      page: page.value,
      page_size: pageSize,
      model: filters.model || undefined,
      api_key_id: filters.api_key_id ? Number(filters.api_key_id) : undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    }

    const [statsData, logsData] = await Promise.all([
      $api<UsageStats>('/api/v1/usage/stats', {
        query: {
          period: 'month',
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        },
      }),
      $api<PaginatedData<UsageLog>>('/api/v1/usage', { query }),
    ])

    stats.value = statsData
    logs.value = logsData
    selectedLog.value = logsData.items[0] ?? null
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '调用记录加载失败。'
  }
  finally {
    pending.value = false
  }
}

watch(page, loadUsage)
onMounted(loadUsage)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-medium text-teal-700">Usage</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">调用记录与费用核对</h1>
      <p class="mt-3 text-sm leading-6 text-slate-600">MVP 版本先把筛选、分页和详情核对做出来，方便你上线后快速排查用户账单问题。</p>
    </div>

    <div v-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
      {{ errorMessage }}
    </div>

    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-5">
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          模型
          <input v-model="filters.model" type="text" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500" placeholder="例如 gpt-5.4">
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          API Key ID
          <input v-model="filters.api_key_id" type="number" min="1" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500" placeholder="可选">
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          开始日期
          <input v-model="filters.start_date" type="date" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          结束日期
          <input v-model="filters.end_date" type="date" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
        </label>
        <div class="flex items-end">
          <button class="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800" @click="page = 1; loadUsage()">
            查询
          </button>
        </div>
      </div>
    </section>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">请求数</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatNumber(stats?.total_requests) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">总 Tokens</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatNumber(stats?.total_tokens) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">实际消费</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatMoney(stats?.total_actual_cost) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">平均耗时</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatNumber(stats?.average_duration_ms) }} ms</p>
      </article>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-slate-200 text-slate-500">
              <tr>
                <th class="px-3 py-3 font-medium">时间</th>
                <th class="px-3 py-3 font-medium">模型</th>
                <th class="px-3 py-3 font-medium">类型</th>
                <th class="px-3 py-3 font-medium">Key</th>
                <th class="px-3 py-3 font-medium">Tokens</th>
                <th class="px-3 py-3 font-medium">实际消费</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in logs?.items || []"
                :key="item.id"
                class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                @click="selectedLog = item"
              >
                <td class="px-3 py-4 text-slate-700">{{ formatDateTime(item.created_at) }}</td>
                <td class="px-3 py-4 text-slate-950">{{ item.model }}</td>
                <td class="px-3 py-4 text-slate-700">{{ item.request_type }} <span v-if="item.stream">· stream</span></td>
                <td class="px-3 py-4 text-slate-700">{{ item.api_key_id }}</td>
                <td class="px-3 py-4 text-slate-950">{{ formatNumber(item.input_tokens + item.output_tokens + (item.cache_creation_tokens || 0) + (item.cache_read_tokens || 0)) }}</td>
                <td class="px-3 py-4 text-slate-950">{{ formatMoney(item.actual_cost) }}</td>
              </tr>
              <tr v-if="!pending && (logs?.items.length || 0) === 0">
                <td colspan="6" class="px-3 py-8 text-center text-slate-500">当前筛选条件下没有调用记录。</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-5 flex items-center justify-between text-sm text-slate-500">
          <p>第 {{ logs?.page || 1 }} / {{ logs?.pages || 1 }} 页，共 {{ formatNumber(logs?.total) }} 条</p>
          <div class="flex gap-3">
            <button class="rounded-xl border border-slate-300 px-4 py-2" :disabled="page <= 1" @click="page -= 1">上一页</button>
            <button class="rounded-xl border border-slate-300 px-4 py-2" :disabled="page >= (logs?.pages || 1)" @click="page += 1">下一页</button>
          </div>
        </div>
      </section>

      <aside class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">详情</h2>
        <div v-if="selectedLog" class="mt-5 space-y-4 text-sm text-slate-700">
          <div>
            <p class="text-slate-500">请求 ID</p>
            <p class="mt-1 break-all font-medium text-slate-950">{{ selectedLog.request_id }}</p>
          </div>
          <div>
            <p class="text-slate-500">模型 / 端点</p>
            <p class="mt-1 font-medium text-slate-950">{{ selectedLog.model }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ selectedLog.inbound_endpoint || '--' }} → {{ selectedLog.upstream_endpoint || '--' }}</p>
          </div>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <div>
              <p class="text-slate-500">输入 Tokens</p>
              <p class="mt-1 font-medium text-slate-950">{{ formatNumber(selectedLog.input_tokens) }}</p>
            </div>
            <div>
              <p class="text-slate-500">输出 Tokens</p>
              <p class="mt-1 font-medium text-slate-950">{{ formatNumber(selectedLog.output_tokens) }}</p>
            </div>
            <div>
              <p class="text-slate-500">倍率</p>
              <p class="mt-1 font-medium text-slate-950">{{ selectedLog.rate_multiplier }}</p>
            </div>
            <div>
              <p class="text-slate-500">耗时</p>
              <p class="mt-1 font-medium text-slate-950">{{ formatNumber(selectedLog.duration_ms) }} ms</p>
            </div>
          </div>
          <div>
            <p class="text-slate-500">费用</p>
            <p class="mt-1 font-medium text-slate-950">总价 {{ formatMoney(selectedLog.total_cost) }} / 实际 {{ formatMoney(selectedLog.actual_cost) }}</p>
          </div>
        </div>
        <p v-else class="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">选择一条调用记录后可查看详情。</p>
      </aside>
    </div>
  </section>
</template>
