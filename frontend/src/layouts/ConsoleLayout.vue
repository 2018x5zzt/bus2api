<!-- ConsoleLayout: Dark sidebar + white content area + mobile drawer -->
<template>
  <div class="console-layout">
    <!-- Mobile overlay -->
    <div
      v-if="mobileDrawerOpen"
      class="mobile-overlay"
      @click="mobileDrawerOpen = false"
    />

    <!-- Mobile topbar -->
    <header class="mobile-topbar">
      <button class="btn-ghost mobile-menu-btn" @click="mobileDrawerOpen = true">
        <MenuIcon :size="20" />
      </button>
      <span class="mobile-logo">{{ appStore.siteName }}</span>
    </header>

    <!-- Sidebar -->
    <aside
      class="sidebar"
      :class="{
        collapsed: appStore.sidebarCollapsed,
        'mobile-open': mobileDrawerOpen,
      }"
    >
      <div class="sidebar-header">
        <div class="logo" v-show="!appStore.sidebarCollapsed">
          <span class="logo-text">{{ appStore.siteName }}</span>
        </div>
        <button class="btn-ghost sidebar-toggle" @click="handleToggle">
          <MenuIcon :size="18" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <!-- User navigation -->
        <RouterLink
          v-for="item in userNavItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="closeMobileDrawer"
        >
          <component :is="item.icon" :size="20" />
          <span v-show="!appStore.sidebarCollapsed || mobileDrawerOpen" class="nav-label">{{
            item.label
          }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info" v-show="!appStore.sidebarCollapsed || mobileDrawerOpen">
          <div class="user-avatar">{{ avatarLetter }}</div>
          <div class="user-details">
            <div class="user-name">{{ authStore.username }}</div>
            <div class="user-balance">${{ balanceDisplay }}</div>
          </div>
        </div>
        <button class="nav-item logout-btn" @click="handleLogout">
          <LogOutIcon :size="20" />
          <span v-show="!appStore.sidebarCollapsed || mobileDrawerOpen" class="nav-label">{{
            t('nav.logout')
          }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content" :class="{ expanded: appStore.sidebarCollapsed }">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard as DashboardIcon,
  Key as KeyIcon,
  BarChart3 as UsageIcon,
  Activity as StatusIcon,
  LogOut as LogOutIcon,
  Menu as MenuIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const mobileDrawerOpen = ref(false)

const userNavItems = computed(() => [
  { path: '/dashboard', label: t('nav.dashboard'), icon: DashboardIcon },
  { path: '/keys', label: t('nav.keys'), icon: KeyIcon },
  { path: '/usage', label: t('nav.usage'), icon: UsageIcon },
  { path: '/status', label: t('nav.status'), icon: StatusIcon },
])

const avatarLetter = computed(() =>
  (authStore.username || 'U').charAt(0).toUpperCase(),
)

const balanceDisplay = computed(() => authStore.balance.toFixed(2))

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function handleToggle(): void {
  appStore.toggleSidebar()
}

function closeMobileDrawer(): void {
  mobileDrawerOpen.value = false
}

async function syncCurrentUser(): Promise<void> {
  if (!authStore.isAuthenticated) {
    return
  }

  await authStore.refreshProfile()
}

function handleWindowFocus(): void {
  void syncCurrentUser()
}

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  void syncCurrentUser()
  window.addEventListener('focus', handleWindowFocus)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', handleWindowFocus)
})
</script>

<style scoped>
.console-layout {
  display: flex;
  min-height: 100vh;
}

/* ==================== Mobile Topbar ==================== */
.mobile-topbar {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--color-sidebar-bg);
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  z-index: 50;
}

.mobile-menu-btn {
  color: white;
  padding: 6px;
}

.mobile-logo {
  font-size: 16px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
}

/* ==================== Mobile Overlay ==================== */
.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 45;
}

/* ==================== Sidebar ==================== */
.sidebar {
  width: var(--sidebar-width);
  background: var(--color-sidebar-bg);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  transition: width 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  height: 64px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
}

.sidebar-toggle {
  color: var(--color-sidebar-text);
  padding: 6px;
  border-radius: 6px;
}
.sidebar-toggle:hover {
  background: var(--color-sidebar-active-bg);
  color: white;
}

/* ==================== Navigation ==================== */
.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--color-sidebar-text);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
}

.nav-item:hover {
  background: var(--color-sidebar-active-bg);
  color: var(--color-sidebar-active);
}

.nav-item.active {
  background: var(--color-sidebar-active-bg);
  color: var(--color-sidebar-active);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

/* ==================== Footer ==================== */
.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 4px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-details {
  overflow: hidden;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-balance {
  font-size: 12px;
  color: var(--color-sidebar-text);
}

.logout-btn {
  color: var(--color-sidebar-text);
}

/* ==================== Main Content ==================== */
.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: 32px;
  min-height: 100vh;
  transition: margin-left 0.2s ease;
}

.main-content.expanded {
  margin-left: var(--sidebar-collapsed-width);
}

/* ==================== Responsive: Mobile ==================== */
@media (max-width: 768px) {
  .mobile-topbar {
    display: flex;
  }

  .mobile-overlay {
    display: block;
  }

  .sidebar {
    width: 260px;
    transform: translateX(-100%);
    z-index: 50;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  /* On mobile, always show labels when drawer is open */
  .sidebar.collapsed {
    width: 260px;
  }

  .main-content,
  .main-content.expanded {
    margin-left: 0;
    padding: 16px;
    padding-top: 72px; /* space for mobile topbar */
  }
}
</style>
