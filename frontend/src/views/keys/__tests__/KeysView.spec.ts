import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/keys', () => ({
  keysAPI: {
    list: vi.fn(),
    create: vi.fn(),
    toggleStatus: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/api/groups', () => ({
  groupsAPI: {
    getVisibleGroups: vi.fn(),
  },
}))

import { groupsAPI } from '@/api/groups'
import { keysAPI } from '@/api/keys'
import { i18n } from '@/i18n'
import KeysView from '../KeysView.vue'

const mockedListKeys = vi.mocked(keysAPI.list)
const mockedGetVisibleGroups = vi.mocked(groupsAPI.getVisibleGroups)

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
    mockedListKeys.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    } as never)
  })

  it('loads visible groups and renders a dropdown instead of a numeric group_id input', async () => {
    mockedGetVisibleGroups.mockResolvedValue([
      {
        id: 2,
        name: 'enterprise-private',
        platform: 'openai',
      },
    ] as never)

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
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})
