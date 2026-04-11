import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/auth', () => ({
  authAPI: {
    login: vi.fn(),
    login2FA: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    getPublicSettings: vi.fn(),
  },
  isTotp2FARequired: vi.fn(() => false),
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')

  return {
    ...actual,
    useRoute: () => ({ path: '/dashboard' }),
    useRouter: () => ({ push: vi.fn() }),
  }
})

import { authAPI } from '@/api/auth'
import { i18n } from '@/i18n'
import ConsoleLayout from '../ConsoleLayout.vue'
import { useAuthStore } from '@/stores/auth'

const mockedGetCurrentUser = vi.mocked(authAPI.getCurrentUser)
let wrappers: VueWrapper[] = []

function makeUser(balance: number) {
  return {
    id: 587,
    username: 'bustest',
    email: 'bustest@gmail.com',
    role: 'user' as const,
    balance,
    concurrency: 5,
    status: 'active' as const,
    allowed_groups: null,
    enterprise_name: 'bustest',
    enterprise_display_name: 'bus企业',
    created_at: '2026-04-10T22:26:17.581702+08:00',
    updated_at: '2026-04-11T14:07:34.144740+08:00',
  }
}

function mountConsoleLayout() {
  const wrapper = mount(ConsoleLayout, {
    global: {
      plugins: [i18n],
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
        RouterView: {
          template: '<div />',
        },
      },
    },
  })

  wrappers.push(wrapper)
  return wrapper
}

describe('ConsoleLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    const pinia = createPinia()
    setActivePinia(pinia)

    const authStore = useAuthStore()
    authStore.user = makeUser(0)
    authStore.isAuthenticated = true
  })

  afterEach(() => {
    for (const wrapper of wrappers) {
      wrapper.unmount()
    }

    wrappers = []
  })

  it('refreshes the current user on mount so the balance is not stale', async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(makeUser(20) as never)

    const wrapper = mountConsoleLayout()
    await flushPromises()

    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.user-balance').text()).toContain('$20.00')
  })

  it('refreshes the current user again when the window regains focus', async () => {
    mockedGetCurrentUser
      .mockResolvedValueOnce(makeUser(5) as never)
      .mockResolvedValueOnce(makeUser(20) as never)

    const wrapper = mountConsoleLayout()
    await flushPromises()
    expect(wrapper.get('.user-balance').text()).toContain('$5.00')

    window.dispatchEvent(new Event('focus'))
    await flushPromises()

    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.user-balance').text()).toContain('$20.00')
  })
})
