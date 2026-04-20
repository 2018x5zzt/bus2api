export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/console')) {
    return
  }

  const authStore = useAuthStore()
  const accessToken = useCookie<string | null>('access_token')

  if (!authStore.initialized || (!authStore.isLoggedIn && accessToken.value)) {
    await authStore.fetchCurrentUser()
  }

  if (!authStore.isLoggedIn) {
    const next = to.fullPath.startsWith('/') && !to.fullPath.startsWith('//')
      ? to.fullPath
      : '/console'
    return navigateTo(`/auth/login?next=${encodeURIComponent(next)}`)
  }
})
