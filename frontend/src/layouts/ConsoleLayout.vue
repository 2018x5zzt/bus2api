<!-- ConsoleLayout: Dark sidebar + white content area -->
<template>
  <div class="console-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo" v-show="!appStore.sidebarCollapsed">
          <span class="logo-text">Bus2API</span>
        </div>
        <button class="btn-ghost sidebar-toggle" @click="appStore.toggleSidebar">
          <MenuIcon v-if="!appStore.sidebarCollapsed" :size="18" />
          <MenuIcon v-else :size="18" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <component :is="item.icon" :size="20" />
          <span v-show="!appStore.sidebarCollapsed" class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info" v-show="!appStore.sidebarCollapsed">
          <div class="user-avatar">{{ avatarLetter }}</div>
          <div class="user-details">
            <div class="user-name">{{ authStore.username }}</div>
            <div class="user-balance">${{ balanceDisplay }}</div>
          </div>
        </div>
        <button class="nav-item logout-btn" @click="handleLogout">
          <LogOutIcon :size="20" />
          <span v-show="!appStore.sidebarCollapsed" class="nav-label">{{ t('nav.logout') }}</span>
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
import { computed } from 'vue'
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

const navItems = computed(() => [
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

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.console-layout {
  display: flex;
  min-height: 100vh;
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
  transition: width 0.2s ease;
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

/* ==================== Responsive ==================== */
@media (max-width: 768px) {
  .sidebar {
    width: var(--sidebar-collapsed-width);
  }
  .main-content {
    margin-left: var(--sidebar-collapsed-width);
  }
  .nav-label,
  .user-info,
  .logo {
    display: none;
  }
}
</style>
