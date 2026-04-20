<script setup lang="ts">
import type { components } from '~/types/api'

definePageMeta({ layout: 'console' })

type TotpStatusResponse = components['schemas']['TotpStatusResponse']

const { $api } = useApi()
const pending = ref(true)
const actionPending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const totpStatus = ref<TotpStatusResponse | null>(null)

async function loadSecurity() {
  pending.value = true
  errorMessage.value = ''

  try {
    totpStatus.value = await $api<TotpStatusResponse>('/api/v1/user/totp/status')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '安全信息加载失败。'
  }
  finally {
    pending.value = false
  }
}

async function revokeAllSessions() {
  if (!window.confirm('确认撤销全部会话？当前设备也会重新登录。')) {
    return
  }

  actionPending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $api<{ message: string }>('/api/v1/auth/revoke-all-sessions', { method: 'POST' })
    await $fetch('/api/auth/logout', { method: 'POST' })
    successMessage.value = '已撤销全部会话，请重新登录。'
    await navigateTo('/auth/login')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '会话撤销失败。'
  }
  finally {
    actionPending.value = false
  }
}

onMounted(loadSecurity)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-medium text-teal-700">Security</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">安全中心</h1>
      <p class="mt-3 text-sm leading-6 text-slate-600">现阶段先把 TOTP 状态查看和一键撤销会话做出来，满足最核心的安全运维需求。</p>
    </div>

    <div v-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
      {{ successMessage }}
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">双重验证状态</h2>
        <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
          <p class="text-sm text-slate-500">功能开关</p>
          <p class="mt-2 text-xl font-semibold text-slate-950">{{ pending ? '--' : (totpStatus?.feature_enabled ? '已启用' : '未启用') }}</p>
          <p class="mt-4 text-sm text-slate-500">账户状态</p>
          <p class="mt-2 text-xl font-semibold text-slate-950">{{ pending ? '--' : (totpStatus?.enabled ? '当前账户已绑定 TOTP' : '当前账户未绑定 TOTP') }}</p>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">会话管理</h2>
        <p class="mt-4 text-sm leading-6 text-slate-600">如果账户出现异常登录或需要强制下线所有设备，可以直接撤销全部会话。</p>
        <button class="mt-6 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60" :disabled="actionPending" @click="revokeAllSessions">
          {{ actionPending ? '处理中...' : '撤销全部会话' }}
        </button>
      </section>
    </div>
  </section>
</template>
