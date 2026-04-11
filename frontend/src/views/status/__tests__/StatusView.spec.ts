import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/groups', () => ({
  groupsAPI: {
    getPoolStatus: vi.fn(),
  },
}))

import { groupsAPI } from '@/api/groups'
import { i18n } from '@/i18n'
import StatusView from '../StatusView.vue'

const mockedGetPoolStatus = vi.mocked(groupsAPI.getPoolStatus)

function mountStatusView() {
  return mount(StatusView, {
    global: {
      plugins: [i18n],
    },
  })
}

describe('StatusView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders health-only cards without raw account totals', async () => {
    mockedGetPoolStatus.mockResolvedValue({
      visible_group_count: 1,
      overall_health_percent: 25,
      updated_at: '2026-04-10T11:22:33Z',
      groups: [
        {
          group_id: 2,
          group_name: 'enterprise-private',
          platform: 'openai',
          health_percent: 25,
          health_state: 'degraded',
          trend: [
            {
              bucket_time: '2026-04-10T10:22:33Z',
              health_percent: 40,
              health_state: 'degraded',
            },
            {
              bucket_time: '2026-04-10T11:22:33Z',
              health_percent: 25,
              health_state: 'degraded',
            },
          ],
          updated_at: '2026-04-10T11:22:33Z',
        },
      ],
    } as never)

    const wrapper = mountStatusView()
    await flushPromises()

    expect(wrapper.text()).toContain('enterprise-private')
    expect(wrapper.text()).toContain('25%')
    expect(wrapper.text()).toContain('总体健康度')
    expect(wrapper.text()).not.toContain('可调度账号')
    expect(wrapper.text()).not.toContain('受限账号')
    expect(wrapper.text()).not.toContain('账号总数')
  })

  it('renders the empty state when no visible groups are returned', async () => {
    mockedGetPoolStatus.mockResolvedValue({
      visible_group_count: 0,
      overall_health_percent: null,
      updated_at: '',
      groups: [],
    } as never)

    const wrapper = mountStatusView()
    await flushPromises()

    expect(wrapper.text()).toContain('暂无可用号池')
    expect(wrapper.text()).toContain('请联系管理员为当前账号分配号池。')
  })

  it('renders the no-trend message when backend history is empty', async () => {
    mockedGetPoolStatus.mockResolvedValue({
      visible_group_count: 1,
      overall_health_percent: 100,
      updated_at: '2026-04-10T11:22:33Z',
      groups: [
        {
          group_id: 7,
          group_name: 'solo-group',
          platform: 'openai',
          health_percent: 100,
          health_state: 'healthy',
          trend: [],
          updated_at: '2026-04-10T11:22:33Z',
        },
      ],
    } as never)

    const wrapper = mountStatusView()
    await flushPromises()

    expect(wrapper.text()).toContain('暂无趋势数据')
  })
})
