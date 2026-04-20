export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()
  const accessToken = useCookie<string | null>('access_token')

  if (!authStore.initialized && accessToken.value) {
    await authStore.fetchCurrentUser()
  }

  if (authStore.isLoggedIn) {
    return navigateTo('/console')
  }
})
