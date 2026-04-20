<script setup lang="ts">
import type { APIKey, BatchAPIKeyUsageStats, Group, PaginatedData } from '~/types/api-helpers'
import { formatDateTime, formatMoney, formatNumber, maskSecret } from '~/utils/format'

definePageMeta({ layout: 'console' })

const { $api } = useApi()
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const copiedId = ref<number | null>(null)
const page = ref(1)
const pageSize = 10
const search = ref('')
const status = ref<'all' | 'active' | 'inactive'>('all')
const keys = ref<PaginatedData<APIKey> | null>(null)
const groups = ref<Group[]>([])
const usageStats = ref<Record<string, BatchAPIKeyUsageStats>>({})

const createForm = reactive({
  name: '',
  group_id: '',
  quota: '',
})

async function loadKeys() {
  pending.value = true
  errorMessage.value = ''

  try {
    const [keyData, groupData] = await Promise.all([
      $api<PaginatedData<APIKey>>('/api/v1/keys', {
        query: {
          page: page.value,
          page_size: pageSize,
          search: search.value || undefined,
          status: status.value === 'all' ? undefined : status.value,
        },
      }),
      $api<Group[]>('/api/v1/groups/available').catch(() => []),
    ])

    keys.value = keyData
    groups.value = groupData

    if (keyData.items.length > 0) {
      const statsResponse = await $api<{ stats: Record<string, BatchAPIKeyUsageStats> }>('/api/v1/usage/dashboard/api-keys-usage', {
        method: 'POST',
        body: {
          api_key_ids: keyData.items.map(item => item.id),
        },
      })
      usageStats.value = statsResponse.stats || {}
    }
    else {
      usageStats.value = {}
    }
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'API Keys 加载失败。'
  }
  finally {
    pending.value = false
  }
}

async function createKey() {
  if (!createForm.name || saving.value) {
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    await $api<APIKey>('/api/v1/keys', {
      method: 'POST',
      body: {
        name: createForm.name,
        group_id: createForm.group_id ? Number(createForm.group_id) : undefined,
        quota: createForm.quota ? Number(createForm.quota) : undefined,
      },
    })

    createForm.name = ''
    createForm.group_id = ''
    createForm.quota = ''
    page.value = 1
    await loadKeys()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建 API Key 失败。'
  }
  finally {
    saving.value = false
  }
}

async function toggleStatus(item: APIKey) {
  errorMessage.value = ''
  try {
    await $api<APIKey>(`/api/v1/keys/${item.id}`, {
      method: 'PUT',
      body: {
        status: item.status === 'active' ? 'inactive' : 'active',
      },
    })
    await loadKeys()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '状态更新失败。'
  }
}

async function deleteKey(id: number) {
  if (!window.confirm('确认删除这个 API Key？')) {
    return
  }

  errorMessage.value = ''
  try {
    await $api<{ message: string }>(`/api/v1/keys/${id}`, {
      method: 'DELETE',
    })
    await loadKeys()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除 API Key 失败。'
  }
}

async function copyKey(value: string, id: number) {
  try {
    await navigator.clipboard.writeText(value)
    copiedId.value = id
    window.setTimeout(() => {
      if (copiedId.value === id) {
        copiedId.value = null
      }
    }, 1500)
  }
  catch {
    errorMessage.value = '复制失败，请手动复制。'
  }
}

watch([page, status], loadKeys)
onMounted(loadKeys)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-medium text-teal-700">Keys</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">API Key 管理</h1>
          <p class="mt-3 text-sm leading-6 text-slate-600">在这里统一查看、创建、启停和删除 API Key，并快速核对使用状态与费用。</p>
        </div>

        <div class="flex flex-wrap gap-3">
          <input
            v-model="search"
            type="search"
            class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
            placeholder="搜索 Key 名称"
            @keydown.enter.prevent="page = 1; loadKeys()"
          >
          <select v-model="status" class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500">
            <option value="all">全部状态</option>
            <option value="active">启用</option>
            <option value="inactive">停用</option>
          </select>
          <button class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700" @click="page = 1; loadKeys()">
            查询
          </button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
      {{ errorMessage }}
    </div>

    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-950">新建 Key</h2>
      <div class="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          名称
          <input v-model="createForm.name" type="text" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500" placeholder="例如：production-app">
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          分组
          <select v-model="createForm.group_id" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
            <option value="">默认分组</option>
            <option v-for="group in groups" :key="group.id" :value="String(group.id)">{{ group.name }}</option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          额度上限（USD）
          <input v-model="createForm.quota" type="number" min="0" step="0.01" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500" placeholder="留空表示不限">
        </label>
        <button class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" :disabled="saving" @click="createKey">
          {{ saving ? '创建中...' : '创建' }}
        </button>
      </div>
    </section>

    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-slate-200 text-slate-500">
            <tr>
              <th class="px-3 py-3 font-medium">名称</th>
              <th class="px-3 py-3 font-medium">Key</th>
              <th class="px-3 py-3 font-medium">分组</th>
              <th class="px-3 py-3 font-medium">状态</th>
              <th class="px-3 py-3 font-medium">今日消费</th>
              <th class="px-3 py-3 font-medium">总消费</th>
              <th class="px-3 py-3 font-medium">最近使用</th>
              <th class="px-3 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in keys?.items || []" :key="item.id" class="border-b border-slate-100 align-top last:border-0">
              <td class="px-3 py-4">
                <p class="font-medium text-slate-950">{{ item.name }}</p>
                <p class="mt-1 text-xs text-slate-500">ID {{ item.id }} · 已用 {{ formatMoney(item.quota_used) }}</p>
              </td>
              <td class="px-3 py-4">
                <div class="flex items-center gap-2">
                  <code class="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">{{ maskSecret(item.key) }}</code>
                  <button class="text-xs font-medium text-teal-700" @click="copyKey(item.key, item.id)">
                    {{ copiedId === item.id ? '已复制' : '复制' }}
                  </button>
                </div>
              </td>
              <td class="px-3 py-4 text-slate-700">{{ item.group?.name || '--' }}</td>
              <td class="px-3 py-4">
                <span class="rounded-full px-3 py-1 text-xs font-medium" :class="item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'">
                  {{ item.status === 'active' ? '启用' : '停用' }}
                </span>
              </td>
              <td class="px-3 py-4 text-slate-950">{{ formatMoney(usageStats[String(item.id)]?.today_actual_cost) }}</td>
              <td class="px-3 py-4 text-slate-950">{{ formatMoney(usageStats[String(item.id)]?.total_actual_cost) }}</td>
              <td class="px-3 py-4 text-slate-700">{{ formatDateTime(item.last_used_at) }}</td>
              <td class="px-3 py-4">
                <div class="flex flex-wrap gap-2">
                  <button class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700" @click="toggleStatus(item)">
                    {{ item.status === 'active' ? '停用' : '启用' }}
                  </button>
                  <button class="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700" @click="deleteKey(item.id)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!pending && (keys?.items.length || 0) === 0">
              <td colspan="8" class="px-3 py-8 text-center text-slate-500">还没有 API Key，可以先创建一个。</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-5 flex items-center justify-between text-sm text-slate-500">
        <p>第 {{ keys?.page || 1 }} / {{ keys?.pages || 1 }} 页，共 {{ formatNumber(keys?.total) }} 条</p>
        <div class="flex gap-3">
          <button class="rounded-xl border border-slate-300 px-4 py-2" :disabled="page <= 1" @click="page -= 1">上一页</button>
          <button class="rounded-xl border border-slate-300 px-4 py-2" :disabled="page >= (keys?.pages || 1)" @click="page += 1">下一页</button>
        </div>
      </div>
    </section>
  </section>
</template>
