/**
 * Vue Router configuration for Bus2API enterprise frontend
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/lib/safe-redirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  // ==================== Public Routes ====================
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false, title: '登录' },
  },

  // ==================== Console Routes (User) ====================
  {
    path: '/',
    component: () => import('@/layouts/ConsoleLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '控制台' },
      },
      {
        path: 'keys',
        name: 'Keys',
        component: () => import('@/views/keys/KeysView.vue'),
        meta: { title: 'API Keys' },
      },
      {
        path: 'usage',
        name: 'Usage',
        component: () => import('@/views/usage/UsageView.vue'),
        meta: { title: '用量查询' },
      },
      {
        path: 'status',
        name: 'Status',
        component: () => import('@/views/status/StatusView.vue'),
        meta: { title: '号池健康' },
      },
    ],
  },

  // ==================== 404 ====================
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

/** Navigation guard: auth + role check + safe redirect */
let authInitialized = false

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (!authInitialized) {
    authStore.checkAuth()
    authInitialized = true
  }

  // Set page title from branding store when available
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - Bus2API` : 'Bus2API'

  const requiresAuth = to.meta.requiresAuth !== false

  if (!requiresAuth) {
    if (authStore.isAuthenticated && to.path === '/login') {
      next('/dashboard')
      return
    }
    next()
    return
  }

  if (!authStore.isAuthenticated) {
    // Use safeRedirect to validate the target path before storing it
    const redirectTarget = safeRedirect(to.fullPath)
    next({ path: '/login', query: { redirect: redirectTarget } })
    return
  }

  // Role-based guard: block non-admin users from admin-only routes
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/dashboard')
    return
  }

  next()
})

export default router
