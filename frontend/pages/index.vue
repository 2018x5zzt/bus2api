<script setup lang="ts">
const authStore = useAuthStore()
const accessToken = useCookie<string | null>('access_token')
const quickStart = [
  '统一 API Key 管理，避免多人共用官方账号。',
  '按用户实际调用量统计成本，控制台直接可查。',
  '前端现阶段优先保证登录、Keys、Usage 和账单闭环。',
]

onMounted(async () => {
  if (accessToken.value && !authStore.initialized) {
    await authStore.fetchCurrentUser()
  }
})
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
    <div class="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div>
        <p class="mb-4 inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">
          现在的目标不是重做炫酷官网，而是把用户能用的前台先上线
        </p>
        <h1 class="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 lg:text-6xl">
          让 Bus2API 在最短时间内具备可登录、可管理、可查账的前端。
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          当前版本聚焦于最关键的用户路径：登录、API Keys、调用记录、账单与账户安全。先把核心动作做对，再继续补营销层和体验层。
        </p>
        <div class="mt-8 flex flex-wrap gap-4">
          <NuxtLink
            :to="authStore.isLoggedIn ? '/console' : '/auth/login'"
            class="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {{ authStore.isLoggedIn ? '进入控制台' : '登录使用' }}
          </NuxtLink>
          <NuxtLink
            to="/docs"
            class="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            查看接入文档
          </NuxtLink>
        </div>
      </div>

      <div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Launch Checklist</p>
        <div class="mt-6 grid gap-4">
          <div
            v-for="item in quickStart"
            :key="item"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700"
          >
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="mt-16 grid gap-4 md:grid-cols-3">
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">登录闭环</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">邮箱密码 + 2FA</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">前端代理登录、刷新和退出，不要求后端额外增加中间层。</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">核心控制台</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">Overview / Keys / Usage</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">优先解决用户最频繁的日常操作，不在第一版里塞过多边缘功能。</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">可持续演进</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">新 Nuxt 前端继续承载</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">上线先求稳，再逐步补全公告、模型广场、完整文档和更精细的营销页。</p>
      </article>
    </div>
  </section>
</template>
