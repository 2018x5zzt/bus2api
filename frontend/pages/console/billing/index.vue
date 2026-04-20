<script setup lang="ts">
import type { RedeemCode, SubscriptionProgressInfo, SubscriptionSummary } from '~/types/api-helpers'
import { formatDateTime, formatMoney, formatNumber } from '~/utils/format'

definePageMeta({ layout: 'console' })

const { $api } = useApi()
const pending = ref(true)
const redeeming = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const summary = ref<SubscriptionSummary | null>(null)
const progress = ref<SubscriptionProgressInfo[]>([])
const history = ref<RedeemCode[]>([])
const redeemCode = ref('')

async function loadBilling() {
  pending.value = true
  errorMessage.value = ''

  try {
    const [summaryData, progressData, historyData] = await Promise.all([
      $api<SubscriptionSummary>('/api/v1/subscriptions/summary'),
      $api<SubscriptionProgressInfo[]>('/api/v1/subscriptions/progress'),
      $api<RedeemCode[]>('/api/v1/redeem/history'),
    ])

    summary.value = summaryData
    progress.value = progressData
    history.value = historyData
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '账单信息加载失败。'
  }
  finally {
    pending.value = false
  }
}

async function redeem() {
  if (!redeemCode.value || redeeming.value) {
    return
  }

  redeeming.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $api<RedeemCode>('/api/v1/redeem', {
      method: 'POST',
      body: { code: redeemCode.value },
    })
    redeemCode.value = ''
    successMessage.value = '兑换成功。'
    await loadBilling()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '兑换失败。'
  }
  finally {
    redeeming.value = false
  }
}

onMounted(loadBilling)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-medium text-teal-700">Billing</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">订阅与账单</h1>
      <p class="mt-3 text-sm leading-6 text-slate-600">这版先保证用户能看到订阅摘要、额度窗口和兑换记录，不把支付系统绑定到这次上线节奏里。</p>
    </div>

    <div v-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
      {{ successMessage }}
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">活跃订阅</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatNumber(summary?.active_count) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">累计已用</p>
        <p class="mt-3 text-3xl font-semibold text-slate-950">{{ pending ? '--' : formatMoney(summary?.total_used_usd) }}</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">兑换码</p>
        <div class="mt-3 flex gap-3">
          <input v-model="redeemCode" type="text" class="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-teal-500" placeholder="输入兑换码">
          <button class="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" :disabled="redeeming" @click="redeem">
            {{ redeeming ? '兑换中...' : '兑换' }}
          </button>
        </div>
      </article>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">额度窗口</h2>
        <div class="mt-5 space-y-4">
          <div v-for="item in progress" :key="item.subscription?.id || item.progress?.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-medium text-slate-950">{{ item.progress?.group_name || item.subscription?.group?.name || '未命名套餐' }}</p>
                <p class="mt-1 text-xs text-slate-500">到期时间 {{ formatDateTime(item.progress?.expires_at || item.subscription?.expires_at || null) }}</p>
              </div>
              <p class="text-sm font-medium text-slate-950">剩余 {{ item.progress?.expires_in_days ?? '--' }} 天</p>
            </div>
            <div class="mt-4 grid gap-3 md:grid-cols-3">
              <div class="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700">
                <p class="text-slate-500">日额度</p>
                <p class="mt-1 font-medium text-slate-950">{{ formatMoney(item.progress?.daily?.used_usd) }} / {{ formatMoney(item.progress?.daily?.limit_usd) }}</p>
              </div>
              <div class="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700">
                <p class="text-slate-500">周额度</p>
                <p class="mt-1 font-medium text-slate-950">{{ formatMoney(item.progress?.weekly?.used_usd) }} / {{ formatMoney(item.progress?.weekly?.limit_usd) }}</p>
              </div>
              <div class="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700">
                <p class="text-slate-500">月额度</p>
                <p class="mt-1 font-medium text-slate-950">{{ formatMoney(item.progress?.monthly?.used_usd) }} / {{ formatMoney(item.progress?.monthly?.limit_usd) }}</p>
              </div>
            </div>
          </div>
          <p v-if="!pending && progress.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">当前没有可展示的订阅额度。</p>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">兑换记录</h2>
        <div class="mt-5 space-y-3">
          <div v-for="item in history.slice(0, 10)" :key="item.id" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-medium text-slate-950">{{ item.code }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ item.type }} · {{ item.status }}</p>
              </div>
              <div class="text-right">
                <p class="font-medium text-slate-950">{{ item.value }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ formatDateTime(item.used_at || item.created_at) }}</p>
              </div>
            </div>
          </div>
          <p v-if="!pending && history.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">还没有兑换记录。</p>
        </div>
      </section>
    </div>
  </section>
</template>
