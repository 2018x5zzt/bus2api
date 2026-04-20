<script setup lang="ts">
const authStore = useAuthStore()
const accessToken = useCookie<string | null>('access_token')
const quickStart = [
  {
    title: '企业登录',
    description: '使用企业名、邮箱和密码进入控制台，已启用两步验证的账户会继续完成 TOTP 校验。',
  },
  {
    title: 'API Key 管理',
    description: '登录后可直接创建、启停和删除 API Key，并按企业分组查看可用资源。',
  },
  {
    title: '调用与账单',
    description: '调用记录、账单订阅和安全设置集中在控制台，便于核账、排错和权限管理。',
  },
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
          OpenAI 兼容接口 · 企业访问入口
        </p>
        <h1 class="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 lg:text-6xl">
          登录后统一管理 API Key、调用记录、账单与安全设置。
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          老狗 API 面向已开通的企业账户提供统一接入与控制台能力。该入口不开放普通用户注册，如需开通或调整企业账户，请联系企业管理员或支持人员。
        </p>
        <div class="mt-8 flex flex-wrap gap-4">
          <NuxtLink
            :to="authStore.isLoggedIn ? '/console' : '/auth/login'"
            class="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {{ authStore.isLoggedIn ? '进入控制台' : '企业登录' }}
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
        <p class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">企业控制台入口</p>
        <div class="mt-6 grid gap-4">
          <div
            v-for="item in quickStart"
            :key="item.title"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700"
          >
            <p class="font-medium text-slate-950">{{ item.title }}</p>
            <p class="mt-2">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-16 grid gap-4 md:grid-cols-3">
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">登录链路</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">企业名校验与两步验证</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">企业账户使用企业名、邮箱和密码登录，已启用 TOTP 的账户会在下一步完成动态码校验。</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">账单透明</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">调用与费用统一核对</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">调用次数、Token 和实际消费在控制台统一记录，便于企业管理员按时间、Key 和模型核账。</p>
      </article>
      <article class="rounded-3xl border border-slate-200 bg-white p-6">
        <p class="text-sm font-medium text-teal-700">安全控制</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-950">会话与密钥集中管理</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">支持统一查看 Key 状态、安全设置和会话撤销动作，方便企业管理员集中处理账户安全。</p>
      </article>
    </div>
  </section>
</template>
