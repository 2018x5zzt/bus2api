import type { UserWithRunMode } from '~/types/api-helpers'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserWithRunMode | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  async function fetchCurrentUser(force = false): Promise<void> {
    if (loading.value) {
      return
    }

    if (initialized.value && !force) {
      return
    }

    loading.value = true
    try {
      const { $api } = useApi()
      const data = await $api<UserWithRunMode>('/api/v1/auth/me')
      user.value = data
    }
    catch {
      user.value = null
    }
    finally {
      initialized.value = true
      loading.value = false
    }
  }

  function setUser(nextUser: UserWithRunMode): void {
    user.value = nextUser
    initialized.value = true
  }

  function clearUser(): void {
    user.value = null
    initialized.value = true
  }

  return {
    user,
    initialized,
    loading,
    isLoggedIn,
    fetchCurrentUser,
    setUser,
    clearUser,
  }
})
