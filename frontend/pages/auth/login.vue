<script setup lang="ts">
import type { UserWithRunMode } from '~/types/api-helpers'
import {
  buildEnterpriseLogin2FABody,
  buildEnterpriseLoginBody,
  LAST_COMPANY_NAME_KEY,
} from '~/utils/enterprise-login'
import { isEnterpriseGatewayMode } from '~/utils/gateway-mode'

definePageMeta({ middleware: ['guest-only'] })

const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const isEnterprisePortal = isEnterpriseGatewayMode(config.gatewayMode)

const form = reactive({
  company_name: '',
  email: '',
  password: '',
  totp_code: '',
})

const step = ref<'credentials' | '2fa'>('credentials')
const tempToken = ref('')
const maskedEmail = ref('')
const pending = ref(false)
const errorMessage = ref('')

const nextPath = computed(() => {
  const next = typeof route.query.next === 'string' ? route.query.next : '/console'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/console'
})

async function completeLogin() {
  await authStore.fetchCurrentUser(true)
  await navigateTo(nextPath.value)
}

async function submitCredentials() {
  pending.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{
      code: number
      message: string
      data: {
        requires_2fa?: boolean
        temp_token?: string
        user_email_masked?: string
        user?: UserWithRunMode
      }
    }>('/api/auth/login', {
      method: 'POST',
      body: buildEnterpriseLoginBody({
        companyName: form.company_name,
        email: form.email,
        password: form.password,
      }),
    })

    if (import.meta.client) {
      window.localStorage.setItem(LAST_COMPANY_NAME_KEY, form.company_name.trim())
    }

    if (response.data.requires_2fa) {
      step.value = '2fa'
      tempToken.value = response.data.temp_token || ''
      maskedEmail.value = response.data.user_email_masked || form.email
      return
    }

    await completeLogin()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请检查邮箱或密码。'
  }
  finally {
    pending.value = false
  }
}

async function submit2FA() {
  pending.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/login/2fa', {
      method: 'POST',
      body: buildEnterpriseLogin2FABody({
        companyName: form.company_name,
        tempToken: tempToken.value,
        totpCode: form.totp_code,
      }),
    })
    await completeLogin()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '二次验证失败，请重试。'
  }
  finally {
    pending.value = false
  }
}

onMounted(() => {
  if (!import.meta.client || !isEnterprisePortal) {
    return
  }

  form.company_name = window.localStorage.getItem(LAST_COMPANY_NAME_KEY) || ''
})
</script>

<template>
  <section class="mx-auto flex min-h-[calc(100vh-161px)] max-w-6xl items-center px-4 py-16 lg:px-8">
    <div class="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-slate-100">
        <p class="text-sm uppercase tracking-[0.24em] text-teal-300">Sign In</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight text-white">登录后继续管理你的 API 与账单。</h1>
        <p class="mt-4 text-sm leading-7 text-slate-300">
          支持邮箱密码登录，并兼容已启用的 TOTP 两步验证流程。登录成功后会直接进入控制台，继续查看 API Keys、调用记录和账单信息。
        </p>
      </div>

      <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-8 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">{{ step === 'credentials' ? '账户登录' : '两步验证' }}</p>
            <h2 class="mt-1 text-2xl font-semibold text-slate-950">
              {{ step === 'credentials' ? '输入账户信息' : '输入 6 位动态码' }}
            </h2>
          </div>
          <NuxtLink v-if="!isEnterprisePortal" to="/auth/register" class="text-sm font-medium text-teal-700 hover:text-teal-800">
            没有账号？注册
          </NuxtLink>
        </div>

        <form v-if="step === 'credentials'" class="grid gap-5" @submit.prevent="submitCredentials">
          <label v-if="isEnterprisePortal" class="grid gap-2 text-sm font-medium text-slate-700">
            企业名
            <input
              v-model="form.company_name"
              type="text"
              required
              autocomplete="organization"
              class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500"
              placeholder="请输入企业标识"
            >
          </label>

          <label class="grid gap-2 text-sm font-medium text-slate-700">
            邮箱
            <input
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500"
              placeholder="name@example.com"
            >
          </label>

          <label class="grid gap-2 text-sm font-medium text-slate-700">
            密码
            <input
              v-model="form.password"
              type="password"
              required
              autocomplete="current-password"
              class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500"
              placeholder="请输入密码"
            >
          </label>

          <p v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="pending"
          >
            {{ pending ? '登录中...' : '登录' }}
          </button>
        </form>

        <form v-else class="grid gap-5" @submit.prevent="submit2FA">
          <label v-if="isEnterprisePortal" class="grid gap-2 text-sm font-medium text-slate-700">
            企业名
            <input
              v-model="form.company_name"
              type="text"
              readonly
              class="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
            >
          </label>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            账户 {{ maskedEmail }} 已启用两步验证，请输入动态码继续。
          </div>

          <label class="grid gap-2 text-sm font-medium text-slate-700">
            动态码
            <input
              v-model="form.totp_code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              required
              class="rounded-2xl border border-slate-300 px-4 py-3 tracking-[0.4em] outline-none transition focus:border-teal-500"
              placeholder="123456"
            >
          </label>

          <p v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ errorMessage }}
          </p>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              :disabled="pending"
              @click="step = 'credentials'; errorMessage = ''; form.totp_code = ''"
            >
              返回上一步
            </button>
            <button
              type="submit"
              class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="pending"
            >
              {{ pending ? '验证中...' : '完成登录' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
