<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const consoleBrand = computed(() =>
  authStore.user?.enterprise_display_name
  || authStore.user?.enterprise_name
  || '企业控制台',
)
const consoleBadge = computed(() => {
  const source = consoleBrand.value.trim()
  return source ? source.slice(0, 2).toUpperCase() : 'LG'
})
const navigation = [
  { label: '总览', to: '/console' },
  { label: 'API Keys', to: '/console/keys' },
  { label: '调用记录', to: '/console/usage' },
  { label: '账单订阅', to: '/console/billing' },
  { label: '资料设置', to: '/console/profile' },
  { label: '安全中心', to: '/console/security' },
]

const loggingOut = ref(false)

async function logout() {
  if (loggingOut.value) {
    return
  }

  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  }
  finally {
    authStore.clearUser()
    loggingOut.value = false
    await navigateTo('/auth/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
      <aside class="w-full rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-200 lg:sticky lg:top-6 lg:w-72 lg:self-start">
        <NuxtLink to="/console" class="mb-6 flex items-center gap-3 text-lg font-semibold tracking-tight text-white">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500 text-sm font-bold text-slate-950">{{ consoleBadge }}</span>
          <div>
            <p>{{ consoleBrand }}</p>
            <p class="text-xs font-normal text-slate-400">企业控制台</p>
          </div>
        </NuxtLink>

        <div class="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">当前账户</p>
          <p class="mt-2 text-sm font-medium text-white">{{ authStore.user?.email || authStore.user?.username || '未登录用户' }}</p>
        </div>

        <nav class="grid gap-2">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="rounded-2xl px-4 py-3 text-sm font-medium transition"
            :class="route.path === item.to ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <button
          class="mt-6 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loggingOut"
          @click="logout"
        >
          {{ loggingOut ? '退出中...' : '退出登录' }}
        </button>
      </aside>

      <main class="min-w-0 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
