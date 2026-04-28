import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'

const mockApi = vi.fn()

mockNuxtImport('useApi', () => () => ({
  $api: mockApi,
}))

interface MockKey {
  id: number
  name: string
  key: string
  status: 'active' | 'inactive'
  quota: number
  quota_used: number
  rate_limit_5h?: number
  rate_limit_1d?: number
  rate_limit_7d?: number
  usage_5h?: number
  usage_1d?: number
  usage_7d?: number
  last_used_at: string | null
  group?: {
    id: number
    name: string
  }
}

function getCreateCalls() {
  return mockApi.mock.calls.filter(([path, options]) =>
    path === '/api/v1/keys' && options?.method === 'POST',
  )
}

describe('console keys create form', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    let keys: MockKey[] = []
    const groups = [
      { id: 9, name: 'ACME Group' },
    ]

    mockApi.mockImplementation(async (path: string, options?: Record<string, any>) => {
      if (path === '/api/v1/keys' && (!options || !options.method || options.method === 'GET')) {
        return {
          items: keys,
          page: 1,
          pages: 1,
          total: keys.length,
        }
      }

      if (path === '/api/v1/groups/available') {
        return groups
      }

      if (path === '/api/v1/usage/dashboard/api-keys-usage') {
        return { stats: {} }
      }

      if (path === '/api/v1/keys' && options?.method === 'POST') {
        const created: MockKey = {
          id: keys.length + 1,
          name: options.body.name,
          key: 'sk-test-created',
          status: 'active',
          quota: 0,
          quota_used: 0,
          last_used_at: null,
          group: groups[0],
        }
        keys = [created]
        return created
      }

      throw new Error(`Unexpected API call: ${path}`)
    })
  })

  it('shows a validation error when the key name is missing instead of failing silently', async () => {
    const KeysPage = (await import('~/pages/console/keys/index.vue')).default
    const wrapper = await mountSuspended(KeysPage)
    await flushPromises()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('请输入 API Key 名称。')
    expect(getCreateCalls()).toHaveLength(0)
  })

  it('submits the create form with a trimmed key name', async () => {
    const KeysPage = (await import('~/pages/console/keys/index.vue')).default
    const wrapper = await mountSuspended(KeysPage)
    await flushPromises()

    await wrapper.get('input[placeholder="例如：production-app"]').setValue('  production-app  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const [createCall] = getCreateCalls()

    expect(createCall).toBeTruthy()
    expect(createCall?.[1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        name: 'production-app',
      }),
    }))
  })

  it('renders quota and rate-limit usage for each API key', async () => {
    const renderedKeys: MockKey[] = [
      {
        id: 1,
        name: 'limited-key',
        key: 'sk-test-limited',
        status: 'active',
        quota: 100,
        quota_used: 25,
        rate_limit_5h: 10,
        rate_limit_1d: 20,
        rate_limit_7d: 40,
        usage_5h: 2.5,
        usage_1d: 5,
        usage_7d: 12.5,
        last_used_at: null,
      },
      {
        id: 2,
        name: 'unlimited-key',
        key: 'sk-test-unlimited',
        status: 'active',
        quota: 0,
        quota_used: 3,
        last_used_at: null,
      },
      {
        id: 3,
        name: 'partial-limit-key',
        key: 'sk-test-partial',
        status: 'active',
        quota: 50,
        quota_used: 50,
        rate_limit_5h: 0,
        rate_limit_1d: 100,
        rate_limit_7d: undefined,
        usage_5h: 4,
        usage_1d: 8,
        usage_7d: 16,
        last_used_at: null,
      },
    ]

    mockApi.mockImplementation(async (path: string) => {
      if (path === '/api/v1/keys') {
        return {
          items: renderedKeys,
          page: 1,
          pages: 1,
          total: renderedKeys.length,
        }
      }

      if (path === '/api/v1/groups/available') {
        return []
      }

      if (path === '/api/v1/usage/dashboard/api-keys-usage') {
        return { stats: {} }
      }

      throw new Error(`Unexpected API call: ${path}`)
    })

    const KeysPage = (await import('~/pages/console/keys/index.vue')).default
    const wrapper = await mountSuspended(KeysPage)
    await flushPromises()

    expect(wrapper.text()).toContain('额度')
    expect(wrapper.text()).toContain('限速')
    expect(wrapper.text()).toContain('US$25.00 / US$100.00')
    expect(wrapper.text()).toContain('剩余 US$75.00')
    expect(wrapper.text()).toContain('25%')
    expect(wrapper.text()).toContain('不限')
    expect(wrapper.text()).toContain('5h: US$2.50 / US$10.00')
    expect(wrapper.text()).toContain('1d: US$5.00 / US$20.00')
    expect(wrapper.text()).toContain('7d: US$12.50 / US$40.00')
    expect(wrapper.text()).toContain('5h: US$4.00 / 不限')
    expect(wrapper.text()).toContain('1d: US$8.00 / US$100.00')
    expect(wrapper.text()).toContain('7d: US$16.00 / 不限')
  })
})
