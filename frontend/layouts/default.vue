<script setup lang="ts">
import { isEnterpriseGatewayMode, resolveGatewayMode } from '~/utils/gateway-mode'

const authStore = useAuthStore()
const accessToken = useCookie<string | null>('access_token')
const config = useRuntimeConfig()
const isEnterprisePortal = computed(() => isEnterpriseGatewayMode(resolveGatewayMode(config)))
const brandName = computed(() => config.public.siteName || '老狗 API')
const navigation = computed(() => isEnterprisePortal.value
  ? [
      { label: '首页', to: '/' },
      { label: '接入文档', to: '/docs' },
      { label: '价格说明', to: '/pricing' },
    ]
  : [
      { label: '首页', to: '/' },
      { label: '模型能力', to: '/models' },
      { label: '接入文档', to: '/docs' },
      { label: '价格说明', to: '/pricing' },
    ])

onMounted(async () => {
  if (accessToken.value && !authStore.initialized) {
    await authStore.fetchCurrentUser()
  }
})
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.16),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef6f6_48%,_#ffffff_100%)] text-slate-900">
    <header class="border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 lg:px-8">
        <NuxtLink to="/" class="flex items-center gap-3 text-lg font-semibold tracking-tight text-slate-950">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-sm font-bold text-white">LG</span>
          <span>{{ brandName }}</span>
        </NuxtLink>

        <nav class="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="transition hover:text-slate-950"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/auth/login"
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            {{ authStore.isLoggedIn ? '切到控制台' : (isEnterprisePortal ? '企业登录' : '登录') }}
          </NuxtLink>
          <NuxtLink
            :to="authStore.isLoggedIn ? '/console' : (isEnterprisePortal ? '/docs' : '/auth/register')"
            class="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {{ authStore.isLoggedIn ? '打开控制台' : (isEnterprisePortal ? '查看文档' : '立即开始') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="border-t border-slate-200 bg-white/80">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>{{ brandName }} 提供企业级模型接入、密钥管理与账单查询能力。</p>
        <div class="flex gap-4">
          <NuxtLink to="/docs" class="hover:text-slate-900">快速接入</NuxtLink>
          <NuxtLink to="/auth/login" class="hover:text-slate-900">控制台</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
