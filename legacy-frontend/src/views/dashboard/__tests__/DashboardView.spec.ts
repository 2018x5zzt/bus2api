import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    template: '<div class="chart-stub" />',
  },
}))

vi.mock('@/api/usage', () => ({
  usageAPI: {
    getDashboardStats: vi.fn(),
    getDashboardTrend: vi.fn(),
    getDashboardModels: vi.fn(),
    query: vi.fn(),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    balance: 20,
  }),
}))

import { usageAPI } from '@/api/usage'
import { i18n } from '@/i18n'
import DashboardView from '../DashboardView.vue'

const mockedGetDashboardStats = vi.mocked(usageAPI.getDashboardStats)
const mockedGetDashboardTrend = vi.mocked(usageAPI.getDashboardTrend)
const mockedGetDashboardModels = vi.mocked(usageAPI.getDashboardModels)
const mockedQueryUsage = vi.mocked(usageAPI.query)

function mountDashboardView() {
  return mount(DashboardView, {
    global: {
      plugins: [i18n],
    },
  })
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockedGetDashboardStats.mockResolvedValue({
      total_users: 0,
      today_new_users: 0,
      active_users: 0,
      hourly_active_users: 0,
      stats_updated_at: '2026-04-11T12:00:00Z',
      stats_stale: false,
      total_api_keys: 4,
      active_api_keys: 3,
      total_accounts: 0,
      normal_accounts: 0,
      error_accounts: 0,
      ratelimit_accounts: 0,
      overload_accounts: 0,
      total_requests: 1200,
      total_input_tokens: 40000,
      total_output_tokens: 25000,
      total_cache_creation_tokens: 0,
      total_cache_read_tokens: 0,
      total_tokens: 65000,
      total_cost: 12.34,
      total_actual_cost: 12.34,
      today_requests: 88,
      today_input_tokens: 3000,
      today_output_tokens: 1800,
      today_cache_creation_tokens: 0,
      today_cache_read_tokens: 0,
      today_tokens: 4800,
      today_cost: 1.23,
      today_actual_cost: 1.23,
      average_duration_ms: 245,
      uptime: 99.9,
      rpm: 14,
      tpm: 1600,
    })
    mockedGetDashboardTrend.mockResolvedValue({
      trend: [
        {
          date: '2026-04-10',
          requests: 20,
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_tokens: 1500,
          cost: 0.3,
          actual_cost: 0.3,
        },
      ],
      start_date: '2026-04-05',
      end_date: '2026-04-11',
      granularity: 'day',
    })
    mockedGetDashboardModels.mockResolvedValue({
      models: [
        {
          model: 'gpt-5.4',
          requests: 50,
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_tokens: 1500,
          cost: 1,
          actual_cost: 1,
        },
      ],
      start_date: '2026-04-05',
      end_date: '2026-04-11',
    })
    mockedQueryUsage.mockResolvedValue({
      data: [
        {
          id: 1,
          user_id: 42,
          api_key_id: 11,
          account_id: 99,
          request_id: 'req-1',
          model: 'gpt-5.4',
          group_id: 2,
          subscription_id: null,
          input_tokens: 1500,
          output_tokens: 700,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          cache_creation_5m_tokens: 0,
          cache_creation_1h_tokens: 0,
          input_cost: 0.2,
          output_cost: 0.1,
          cache_creation_cost: 0,
          cache_read_cost: 0,
          total_cost: 0.3,
          actual_cost: 0.3,
          rate_multiplier: 1,
          billing_type: 0,
          stream: false,
          duration_ms: 220,
          first_token_ms: 80,
          image_count: 0,
          image_size: null,
          user_agent: null,
          cache_ttl_overridden: false,
          created_at: '2026-04-11T12:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 5,
      total_pages: 1,
    })
  })

  it('renders token and performance summary cards from dashboard stats', async () => {
    const wrapper = mountDashboardView()
    await flushPromises()

    expect(wrapper.text()).toContain('账户余额')
    expect(wrapper.text()).toContain('$20.00')
    expect(wrapper.text()).toContain('今日 Tokens')
    expect(wrapper.text()).toContain('4.8K')
    expect(wrapper.text()).toContain('RPM')
    expect(wrapper.text()).toContain('14')
    expect(wrapper.text()).toContain('平均响应时间')
    expect(wrapper.text()).toContain('245 ms')
  })

  it('requests trend data with the selected range and granularity', async () => {
    const wrapper = mountDashboardView()
    await flushPromises()

    mockedGetDashboardTrend.mockClear()
    mockedGetDashboardModels.mockClear()

    await wrapper.get('[data-testid="range-30d"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="granularity-hour"]').trigger('click')
    await flushPromises()

    const trendCall = mockedGetDashboardTrend.mock.calls.at(-1)?.[0] as Record<string, string>
    expect(trendCall.start_date).toEqual(expect.any(String))
    expect(trendCall.end_date).toEqual(expect.any(String))
    expect(trendCall.granularity).toBe('hour')

    const modelCall = mockedGetDashboardModels.mock.calls.at(-1)?.[0] as Record<string, string>
    expect(modelCall.start_date).toEqual(expect.any(String))
    expect(modelCall.end_date).toEqual(expect.any(String))
  })

  it('renders recent usage records', async () => {
    const wrapper = mountDashboardView()
    await flushPromises()

    expect(mockedQueryUsage).toHaveBeenCalledWith({ page: 1, page_size: 5 })
    expect(wrapper.text()).toContain('最近请求')
    expect(wrapper.text()).toContain('gpt-5.4')
    expect(wrapper.text()).toContain('$0.3000')
  })
})
