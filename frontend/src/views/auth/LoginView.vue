<!-- LoginView: Email/password login with optional 2FA -->
<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-logo">{{ appStore.siteName }}</h1>
        <p class="login-subtitle">{{ t('login.title') }}</p>
      </div>

      <!-- Error alert -->
      <div v-if="errorMsg" class="login-error">
        {{ errorMsg }}
      </div>

      <!-- 2FA step -->
      <form v-if="needs2FA" @submit.prevent="handle2FA" class="login-form">
        <p class="two-factor-hint">{{ t('login.twoFactor') }}</p>
        <div class="form-group">
          <label class="label">{{ t('login.twoFactorCode') }}</label>
          <input
            v-model="totpCode"
            type="text"
            class="input"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            autofocus
            required
          />
        </div>
        <button type="submit" class="btn-primary login-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? t('login.loading') : t('login.twoFactorSubmit') }}
        </button>
      </form>

      <!-- Login step -->
      <form v-else @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="label">{{ t('login.email') }}</label>
          <input
            v-model="email"
            type="email"
            class="input"
            autocomplete="username"
            autofocus
            required
          />
        </div>
        <div class="form-group">
          <label class="label">{{ t('login.password') }}</label>
          <input
            v-model="password"
            type="password"
            class="input"
            autocomplete="current-password"
            required
          />
        </div>
        <button type="submit" class="btn-primary login-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? t('login.loading') : t('login.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { safeRedirect } from '@/lib/safe-redirect'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

const email = ref('')
const password = ref('')
const totpCode = ref('')
const tempToken = ref('')
const loading = ref(false)
const errorMsg = ref('')
const needs2FA = ref(false)

async function handleLogin(): Promise<void> {
  loading.value = true
  errorMsg.value = ''

  try {
    const result = await authStore.login({ email: email.value, password: password.value })

    if (result.requires2FA) {
      needs2FA.value = true
      tempToken.value = result.tempToken ?? ''
      return
    }

    const redirect = safeRedirect(route.query.redirect)
    router.push(redirect)
  } catch {
    errorMsg.value = t('login.error')
  } finally {
    loading.value = false
  }
}

async function handle2FA(): Promise<void> {
  loading.value = true
  errorMsg.value = ''

  try {
    await authStore.complete2FA(tempToken.value, totpCode.value)
    const redirect = safeRedirect(route.query.redirect)
    router.push(redirect)
  } catch {
    errorMsg.value = t('login.error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 40px 32px;
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.04em;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 15px;
  color: var(--color-text-secondary);
}

.login-error {
  background: #fef2f2;
  color: #991b1b;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  margin-bottom: 20px;
  border: 1px solid #fecaca;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.two-factor-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}

.login-btn {
  width: 100%;
  justify-content: center;
  padding: 10px 16px;
  font-size: 15px;
  margin-top: 4px;
}
</style>
