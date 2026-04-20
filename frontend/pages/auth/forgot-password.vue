<script setup lang="ts">
definePageMeta({ middleware: ['guest-only'] })

const { $api } = useApi()
const email = ref('')
const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submit() {
  pending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await $api<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
    successMessage.value = res.message || '如果邮箱存在，将收到重置邮件。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '提交失败，请稍后重试。'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-16 lg:px-8">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.24em] text-teal-700">Password Reset</p>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">找回密码</h1>
      <p class="mt-4 text-sm leading-6 text-slate-600">输入注册邮箱后，系统会按后端配置发送重置邮件。这里保持防枚举语义，不暴露账户是否存在。</p>

      <form class="mt-8 grid gap-5" @submit.prevent="submit">
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          邮箱
          <input v-model="email" type="email" required class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500" placeholder="name@example.com">
        </label>

        <p v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</p>
        <p v-if="successMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage }}</p>

        <button type="submit" class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" :disabled="pending">
          {{ pending ? '提交中...' : '发送重置请求' }}
        </button>
      </form>
    </div>
  </section>
</template>
