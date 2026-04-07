/**
 * App store - global app state and settings
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/api/auth'
import type { PublicSettings } from '@/types'

export const useAppStore = defineStore('app', () => {
  const publicSettings = ref<PublicSettings | null>(null)
  const sidebarCollapsed = ref(false)
  const loading = ref(false)

  const siteName = computed(() => publicSettings.value?.site_name || 'Bus2API')

  /** Fetch public settings from backend */
  async function fetchPublicSettings(): Promise<void> {
    try {
      publicSettings.value = await authAPI.getPublicSettings()
    } catch {
      // Use defaults if fetch fails
      publicSettings.value = {}
    }
  }

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setLoading(state: boolean): void {
    loading.value = state
  }

  return {
    publicSettings,
    sidebarCollapsed,
    loading,
    siteName,
    fetchPublicSettings,
    toggleSidebar,
    setLoading,
  }
})
