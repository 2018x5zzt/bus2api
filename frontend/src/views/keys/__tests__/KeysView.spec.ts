import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/keys', () => ({
  keysAPI: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleStatus: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/api/groups', () => ({
  groupsAPI: {
    getVisibleGroups: vi.fn(),
  },
}))

vi.mock('@/api/usage', () => ({
  usageAPI: {
    getDashboardApiKeysUsage: vi.fn(),
  },
}))

import { groupsAPI } from '@/api/groups'
import { keysAPI } from '@/api/keys'
import { usageAPI } from '@/api/usage'
import { i18n } from '@/i18n'
import KeysView from '../KeysView.vue'

const mockedListKeys = vi.mocked(keysAPI.list)
const mockedCreateKey = vi.mocked(keysAPI.create)
const mockedUpdateKey = vi.mocked(keysAPI.update)
const mockedGetVisibleGroups = vi.mocked(groupsAPI.getVisibleGroups)
const mockedGetKeyUsage = vi.mocked(usageAPI.getDashboardApiKeysUsage)

function buildKey(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user_id: 42,
    key: 'sk-enterprise-demo-1234',
    name: 'demo-key',
    group_id: 2,
    status: 'active',
    ip_whitelist: ['1.2.3.4'],
    ip_blacklist: [],
    last_used_at: '2026-04-11T14:08:00Z',
    quota: 50,
    used_quota: 12.3456,
    expires_at: '2026-05-01T00:00:00Z',
    created_at: '2026-04-10T12:00:00Z',
    updated_at: '2026-04-11T12:00:00Z',
    group: {
      id: 2,
      name: 'enterprise-private',
      description: null,
      platform: 'openai',
      rate_multiplier: 1,
      is_exclusive: false,
      status: 'active',
      subscription_type: 'standard',
      daily_limit_usd: null,
      weekly_limit_usd: null,
      monthly_limit_usd: null,
      image_price_1k: null,
      image_price_2k: null,
      image_price_4k: null,
      claude_code_only: false,
      fallback_group_id: null,
      fallback_group_id_on_invalid_request: null,
      require_oauth_only: false,
      require_privacy_set: false,
      created_at: '2026-04-10T12:00:00Z',
      updated_at: '2026-04-10T12:00:00Z',
    },
    rate_limit_5h: 10,
    rate_limit_1d: 20,
    rate_limit_7d: 30,
    usage_5h: 1.5,
    usage_1d: 2.5,
    usage_7d: 3.5,
    window_5h_start: null,
    window_1d_start: null,
    window_7d_start: null,
    reset_5h_at: '2026-04-11T15:00:00Z',
    reset_1d_at: '2026-04-12T00:00:00Z',
    reset_7d_at: '2026-04-18T00:00:00Z',
    ...overrides,
  }
}

function mountKeysView() {
  return mount(KeysView, {
    global: {
      plugins: [i18n],
    },
  })
}

describe('KeysView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetVisibleGroups.mockResolvedValue([
      {
        id: 2,
        name: 'enterprise-private',
        platform: 'openai',
      },
    ] as never)
    mockedListKeys.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    } as never)
    mockedGetKeyUsage.mockResolvedValue({
      stats: {},
    })
    mockedCreateKey.mockResolvedValue(buildKey() as never)
    mockedUpdateKey.mockResolvedValue(buildKey() as never)
  })

  it('loads visible groups and renders a dropdown instead of a numeric group_id input', async () => {
    const wrapper = mountKeysView()
    await flushPromises()

    expect(mockedGetVisibleGroups).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('全部分组')
    expect(wrapper.text()).toContain('enterprise-private')
    expect(wrapper.find('input[placeholder="分组"]').exists()).toBe(false)

    await wrapper.get('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('不绑定分组')
    expect(wrapper.find('input[placeholder="选择分组（可选）"]').exists()).toBe(false)
  })

  it('shows a no-visible-groups hint while still allowing an unbound key create flow', async () => {
    mockedGetVisibleGroups.mockResolvedValue([] as never)

    const wrapper = mountKeysView()
    await flushPromises()
    await wrapper.get('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockedGetVisibleGroups).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('当前没有可分配号池；如需绑定号池，请联系管理员。')
    expect(wrapper.text()).toContain('不绑定分组')
    expect(wrapper.get('[data-testid="submit-create-key"]').attributes('disabled')).toBeUndefined()
  })

  it('opens edit without a group selector and submits an update payload without group_id', async () => {
    mockedListKeys.mockResolvedValue({
      data: [buildKey()],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    } as never)

    const wrapper = mountKeysView()
    await flushPromises()

    await wrapper.get('[data-testid="edit-key-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-group-select"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('已绑定分组')

    await wrapper.get('[data-testid="edit-name"]').setValue('renamed-key')
    await wrapper.get('[data-testid="save-edit-key"]').trigger('click')
    await flushPromises()

    expect(mockedUpdateKey).toHaveBeenCalledTimes(1)
    const payload = mockedUpdateKey.mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload.name).toBe('renamed-key')
    expect(payload.group_id).toBeUndefined()
  })

  it('offers reset actions for quota and rate-limit usage', async () => {
    mockedListKeys.mockResolvedValue({
      data: [buildKey()],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    } as never)

    const wrapper = mountKeysView()
    await flushPromises()

    await wrapper.get('[data-testid="reset-quota-1"]').trigger('click')
    await wrapper.get('[data-testid="reset-rate-limit-1"]').trigger('click')
    await flushPromises()

    expect(mockedUpdateKey).toHaveBeenNthCalledWith(1, 1, { reset_quota: true })
    expect(mockedUpdateKey).toHaveBeenNthCalledWith(2, 1, { reset_rate_limit_usage: true })
  })

  it('creates a key with custom_key and group_id', async () => {
    const wrapper = mountKeysView()
    await flushPromises()

    await wrapper.get('button.btn-primary').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="create-name"]').setValue('custom-enterprise-key')
    await wrapper.get('[data-testid="create-custom-key"]').setValue('custom_key_1234567890')
    await wrapper.get('[data-testid="create-group-select"]').setValue('2')
    await wrapper.get('[data-testid="submit-create-key"]').trigger('click')
    await flushPromises()

    expect(mockedCreateKey).toHaveBeenCalledTimes(1)
    expect(mockedCreateKey).toHaveBeenCalledWith(expect.objectContaining({
      name: 'custom-enterprise-key',
      custom_key: 'custom_key_1234567890',
      group_id: 2,
    }))
  })
})
