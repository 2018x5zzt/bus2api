<script setup lang="ts">
import type { PublicSettings } from '~/types/api-helpers'
import { isEnterpriseGatewayMode } from '~/utils/gateway-mode'

definePageMeta({ middleware: ['guest-only'] })

const authStore = useAuthStore()
const { $api } = useApi()
const config = useRuntimeConfig()

if (isEnterpriseGatewayMode(config.gatewayMode)) {
  await navigateTo('/auth/login')
}

const form = reactive({
  email: '',
  password: '',
  verify_code: '',
  promo_code: '',
  invitation_code: '',
})

const settings = ref<PublicSettings | null>(null)
const pending = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const errorMessage = ref('')
const successMessage = ref('')
let countdownTimer: ReturnType<typeof setInterval> | null = null

async function loadSettings() {
  try {
    settings.value = await $api<PublicSettings>('/api/v1/settings/public')
  }
  catch {
    settings.value = null
  }
}

function startCountdown(seconds: number) {
  countdown.value = seconds
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function sendVerifyCode() {
  if (!form.email || sendingCode.value || countdown.value > 0) {
    return
  }

  sendingCode.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await $fetch<{
      code: number
      message: string
      data: { message: string; countdown: number }
    }>('/api/auth/send-verify-code', {
      method: 'POST',
      body: { email: form.email },
    })

    successMessage.value = response.data.message || '验证码已发送'
    startCountdown(response.data.countdown || 60)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '验证码发送失败'
  }
  finally {
    sendingCode.value = false
  }
}

async function register() {
  pending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        verify_code: form.verify_code || undefined,
        promo_code: form.promo_code || undefined,
        invitation_code: form.invitation_code || undefined,
      },
    })

    await authStore.fetchCurrentUser(true)
    await navigateTo('/console')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '注册失败，请稍后重试。'
  }
  finally {
    pending.value = false
  }
}

onMounted(loadSettings)
onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<template>
  <section class="mx-auto flex min-h-[calc(100vh-161px)] max-w-6xl items-center px-4 py-16 lg:px-8">
    <div class="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p class="text-sm uppercase tracking-[0.24em] text-teal-700">Register</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight text-slate-950">创建账户，开始接入与管理 API。</h1>
        <p class="mt-4 text-sm leading-7 text-slate-600">
          注册表单会根据站点配置动态展示邮箱验证码、邀请码或促销码等字段，提交后即可进入控制台继续完成后续操作。
        </p>
      </div>

      <div class="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-slate-100">
        <div class="mb-8 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-400">创建账户</p>
            <h2 class="mt-1 text-2xl font-semibold text-white">注册并进入控制台</h2>
          </div>
          <NuxtLink to="/auth/login" class="text-sm font-medium text-teal-300 hover:text-teal-200">
            去登录
          </NuxtLink>
        </div>

        <div v-if="settings && settings.registration_enabled === false" class="rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          当前站点暂未开放公开注册，如需开通请联系管理员。
        </div>

        <form class="mt-6 grid gap-5" @submit.prevent="register">
          <label class="grid gap-2 text-sm font-medium text-slate-200">
            邮箱
            <input
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              class="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
              placeholder="name@example.com"
            >
          </label>

          <label class="grid gap-2 text-sm font-medium text-slate-200">
            密码
            <input
              v-model="form.password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              class="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
              placeholder="至少 6 位"
            >
          </label>

          <div v-if="settings?.email_verify_enabled" class="grid gap-2">
            <label class="text-sm font-medium text-slate-200">邮箱验证码</label>
            <div class="flex gap-3">
              <input
                v-model="form.verify_code"
                type="text"
                class="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
                placeholder="输入收到的验证码"
              >
              <button
                type="button"
                class="rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="sendingCode || countdown > 0 || !form.email"
                @click="sendVerifyCode"
              >
                {{ countdown > 0 ? `${countdown}s` : (sendingCode ? '发送中...' : '发送验证码') }}
              </button>
            </div>
          </div>

          <label v-if="settings?.promo_code_enabled" class="grid gap-2 text-sm font-medium text-slate-200">
            促销码
            <input
              v-model="form.promo_code"
              type="text"
              class="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
              placeholder="可选"
            >
          </label>

          <label v-if="settings?.invitation_code_enabled" class="grid gap-2 text-sm font-medium text-slate-200">
            邀请码
            <input
              v-model="form.invitation_code"
              type="text"
              class="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
              placeholder="可选"
            >
          </label>

          <p v-if="errorMessage" class="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {{ errorMessage }}
          </p>
          <p v-if="successMessage" class="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {{ successMessage }}
          </p>

          <button
            type="submit"
            class="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="pending || settings?.registration_enabled === false"
          >
            {{ pending ? '注册中...' : '注册并进入控制台' }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
