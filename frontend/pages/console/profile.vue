<script setup lang="ts">
import type { User, UserWithRunMode } from '~/types/api-helpers'

definePageMeta({ layout: 'console' })

const authStore = useAuthStore()
const { $api } = useApi()
const pending = ref(true)
const savingProfile = ref(false)
const savingPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const profile = ref<User | null>(null)

const profileForm = reactive({ username: '' })
const passwordForm = reactive({ old_password: '', new_password: '' })

async function loadProfile() {
  pending.value = true
  errorMessage.value = ''

  try {
    const data = await $api<User>('/api/v1/user/profile')
    profile.value = data
    profileForm.username = data.username || ''
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '资料加载失败。'
  }
  finally {
    pending.value = false
  }
}

async function saveProfile() {
  savingProfile.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const data = await $api<User>('/api/v1/user', {
      method: 'PUT',
      body: { username: profileForm.username },
    })
    profile.value = data
    if (authStore.user) {
      authStore.setUser({ ...authStore.user, ...data } as UserWithRunMode)
    }
    successMessage.value = '资料已更新。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '资料更新失败。'
  }
  finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  if (!passwordForm.old_password || !passwordForm.new_password) {
    return
  }

  savingPassword.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $api<{ message: string }>('/api/v1/user/password', {
      method: 'PUT',
      body: passwordForm,
    })
    passwordForm.old_password = ''
    passwordForm.new_password = ''
    successMessage.value = '密码已修改。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '密码修改失败。'
  }
  finally {
    savingPassword.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-medium text-teal-700">Profile</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">账户资料</h1>
      <p class="mt-3 text-sm leading-6 text-slate-600">这里先保留最实用的资料编辑和密码修改。</p>
    </div>

    <div v-if="errorMessage" class="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
      {{ successMessage }}
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">基础信息</h2>
        <div class="mt-5 grid gap-4">
          <label class="grid gap-2 text-sm font-medium text-slate-700">
            邮箱
            <input :value="profile?.email || ''" type="email" disabled class="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500">
          </label>
          <label class="grid gap-2 text-sm font-medium text-slate-700">
            用户名
            <input v-model="profileForm.username" type="text" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
          </label>
          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">角色</p>
              <p class="mt-2 font-medium text-slate-950">{{ profile?.role || '--' }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">余额</p>
              <p class="mt-2 font-medium text-slate-950">{{ profile?.balance ?? '--' }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">并发</p>
              <p class="mt-2 font-medium text-slate-950">{{ profile?.concurrency ?? '--' }}</p>
            </div>
          </div>
          <button class="w-fit rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" :disabled="savingProfile || pending" @click="saveProfile">
            {{ savingProfile ? '保存中...' : '保存资料' }}
          </button>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-950">修改密码</h2>
        <div class="mt-5 grid gap-4">
          <label class="grid gap-2 text-sm font-medium text-slate-700">
            当前密码
            <input v-model="passwordForm.old_password" type="password" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
          </label>
          <label class="grid gap-2 text-sm font-medium text-slate-700">
            新密码
            <input v-model="passwordForm.new_password" type="password" minlength="6" class="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500">
          </label>
          <button class="w-fit rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60" :disabled="savingPassword || pending" @click="changePassword">
            {{ savingPassword ? '提交中...' : '更新密码' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
