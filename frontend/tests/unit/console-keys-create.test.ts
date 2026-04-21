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
  quota_used: number
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
})
