<script setup lang="ts">
definePageMeta({ middleware: ['guest-only'] })

const route = useRoute()
const { $api } = useApi()

const form = reactive({
  email: typeof route.query.email === 'string' ? route.query.email : '',
  token: typeof route.query.token === 'string' ? route.query.token : '',
  new_password: '',
})

const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submit() {
  pending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await $api<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: form,
    })
    successMessage.value = res.message || '密码已重置，请重新登录。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '重置失败，请检查链接和验证码。'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-16 lg:px-8">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.24em] text-teal-700">Reset Password</p>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">重置密码</h1>
      <p class="mt-4 text-sm leading-6 text-slate-600">如果你是从邮件跳转过来，邮箱和 token 会自动带入；也可以手动填写。</p>

      <form class="mt-8 grid gap-5" @submit.prevent="submit">
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          邮箱
          <input v-model="form.email" type="email" required class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          Token
          <input v-model="form.token" type="text" required class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-700">
          新密码
          <input v-model="form.new_password" type="password" minlength="6" required class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
        </label>

        <p v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</p>
        <p v-if="successMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage }}</p>

        <button type="submit" class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" :disabled="pending">
          {{ pending ? '提交中...' : '确认重置' }}
        </button>
      </form>
    </div>
  </section>
</template>
