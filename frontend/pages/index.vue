<script setup lang="ts">
const authStore = useAuthStore()
const accessToken = useCookie<string | null>('access_token')
const quickStart = [
  'OpenAI 兼容接口，统一接入多家模型能力。',
  '按应用、团队或场景拆分 API Key，权限与成本更清晰。',
  '调用记录、用量统计与账单视图集中管理，方便持续追踪。',
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
          OpenAI 兼容接口 · 多模型统一接入
        </p>
        <h1 class="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 lg:text-6xl">
          为开发者提供稳定、清晰、可追踪的 AI API 接入体验。
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Bus2API 通过统一域名与鉴权方式接入多家模型能力，并提供 API Key 管理、调用记录、用量统计与账单视图，帮助团队更快上线并持续掌控成本。
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
        <p class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Why Bus2API</p>
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
        <p class="text-sm font-medium text-teal-700">统一接入</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">兼容主流调用方式</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">通过统一接口与鉴权方式访问多家模型能力，减少业务侧重复适配成本。</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">账单透明</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">用量与消费持续可追踪</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">调用次数、Token 和实际消费在控制台统一记录，便于团队核对与优化成本。</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">团队可管理</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">API Key 管理更清晰</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">按应用、团队或场景拆分 Key，配合调用记录和账单视图，让协作与对账更高效。</p>
      </article>
    </div>
  </section>
</template>
