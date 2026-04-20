<script setup lang="ts">
/**
 * GroupsView — 分组管理页面
 * CRUD + 平台/状态筛选 + 分页 + 创建/编辑共享模态框
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminGroupsAPI } from '@/api/admin'
import type {
  AdminGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupPlatform,
} from '@/types'

const PAGE_SIZE = 20

const { t } = useI18n()

// ==================== 列表状态 ====================
const groups = ref<AdminGroup[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref<string | null>(null)

// ==================== 筛选 ====================
const platformFilter = ref('')
const statusFilter = ref('')
let abortController: AbortController | null = null

// ==================== 模态框 ====================
const modalOpen = ref(false)
const isEditing = ref(false)
const selectedGroup = ref<AdminGroup | null>(null)
const submitting = ref(false)

// ==================== 表单 ====================
const formDefaults: CreateGroupRequest & { status?: 'active' | 'inactive' } = {
  name: '',
  description: null,
  platform: 'anthropic',
  rate_multiplier: 1,
  is_exclusive: false,
  subscription_type: 'standard',
  status: 'active',
  daily_limit_usd: null,
  weekly_limit_usd: null,
  monthly_limit_usd: null,
  claude_code_only: false,
}

const form = ref<CreateGroupRequest & { status?: 'active' | 'inactive' }>({ ...formDefaults })

// ==================== 平台配置 ====================
const PLATFORMS: GroupPlatform[] = ['anthropic', 'openai', 'gemini', 'antigravity']

const PLATFORM_BADGE: Record<GroupPlatform, string> = {
  anthropic: 'badge-warning',
  openai: 'badge-success',
  gemini: 'badge-neutral',
  antigravity: 'badge-danger',
}

// ==================== 分页计算 ====================
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const pageNumbers = computed(() => {
  const MAX_VISIBLE = 5
  const current = page.value
  const last = totalPages.value
  let start = Math.max(1, current - Math.floor(MAX_VISIBLE / 2))
  const end = Math.min(last, start + MAX_VISIBLE - 1)
  start = Math.max(1, end - MAX_VISIBLE + 1)
  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// ==================== 数据加载 ====================
async function fetchGroups(): Promise<void> {
  abortController?.abort()
  abortController = new AbortController()
  loading.value = true
  error.value = null
  try {
    const res = await adminGroupsAPI.list(
      {
        page: page.value,
        page_size: PAGE_SIZE,
        platform: platformFilter.value || undefined,
        status: statusFilter.value || undefined,
      },
      { signal: abortController.signal },
    )
    groups.value = res.data
    total.value = res.total
  } catch (e) {
    if ((e as Error).name === 'CanceledError') return
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function onFilterChange(): void {
  page.value = 1
  fetchGroups()
}

function goToPage(p: number): void {
  page.value = p
  fetchGroups()
}

// ==================== 模态框控制 ====================
function openCreate(): void {
  isEditing.value = false
  selectedGroup.value = null
  form.value = { ...formDefaults }
  modalOpen.value = true
}

function openEdit(group: AdminGroup): void {
  isEditing.value = true
  selectedGroup.value = group
  form.value = {
    name: group.name,
    description: group.description,
    platform: group.platform,
    rate_multiplier: group.rate_multiplier,
    is_exclusive: group.is_exclusive,
    subscription_type: group.subscription_type,
    status: group.status,
    daily_limit_usd: group.daily_limit_usd,
    weekly_limit_usd: group.weekly_limit_usd,
    monthly_limit_usd: group.monthly_limit_usd,
    claude_code_only: group.claude_code_only,
  }
  modalOpen.value = true
}

function closeModal(): void {
  modalOpen.value = false
  selectedGroup.value = null
  submitting.value = false
}

// ==================== 操作 ====================
async function submitForm(): Promise<void> {
  submitting.value = true
  try {
    if (isEditing.value && selectedGroup.value) {
      const payload: UpdateGroupRequest = { ...form.value }
      await adminGroupsAPI.update(selectedGroup.value.id, payload)
    } else {
      const { status: _status, ...createPayload } = form.value
      await adminGroupsAPI.create(createPayload as CreateGroupRequest)
    }
    closeModal()
    fetchGroups()
  } catch (e) {
    alert((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function deleteGroup(group: AdminGroup): Promise<void> {
  if (!window.confirm(t('adminGroups.deleteConfirm'))) return
  try {
    await adminGroupsAPI.delete(group.id)
    fetchGroups()
  } catch (e) {
    alert((e as Error).message)
  }
}

// ==================== 生命周期 ====================
onMounted(fetchGroups)
onUnmounted(() => {
  abortController?.abort()
})
</script>

<template>
  <div class="animate-fade-in">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">{{ t('adminGroups.title') }}</h1>
      <button class="btn-primary" @click="openCreate">
        {{ t('adminGroups.create') }}
      </button>
    </div>

    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <select v-model="platformFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminGroups.platform') }}</option>
        <option v-for="p in PLATFORMS" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="statusFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminGroups.status') }}</option>
        <option value="active">{{ t('adminGroups.active') }}</option>
        <option value="inactive">{{ t('adminGroups.inactive') }}</option>
      </select>
    </div>

    <!-- 加载态 -->
    <div v-if="loading && groups.length === 0" class="loading-center">
      <div class="spinner" />
    </div>

    <!-- 错误态 -->
    <div v-else-if="error && groups.length === 0" class="empty-state">
      <p>{{ error }}</p>
      <button class="btn-primary" style="margin-top: 12px" @click="fetchGroups">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- 空态 -->
    <div v-else-if="groups.length === 0" class="empty-state">
      <p>{{ t('common.noData') }}</p>
    </div>

    <!-- 数据表格 -->
    <template v-else>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('adminGroups.name') }}</th>
              <th>{{ t('adminGroups.platform') }}</th>
              <th>{{ t('adminGroups.rateMultiplier') }}</th>
              <th>{{ t('adminGroups.subscriptionType') }}</th>
              <th>{{ t('adminGroups.status') }}</th>
              <th>{{ t('adminGroups.accountCount') }}</th>
              <th>{{ t('adminGroups.activeAccountCount') }}</th>
              <th>{{ t('adminGroups.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in groups" :key="group.id">
              <td class="font-medium">{{ group.name }}</td>
              <td>
                <span :class="['badge', PLATFORM_BADGE[group.platform]]">
                  {{ group.platform }}
                </span>
              </td>
              <td>{{ group.rate_multiplier }}x</td>
              <td>
                <span :class="['badge', group.subscription_type === 'subscription' ? 'badge-warning' : 'badge-neutral']">
                  {{ t(`adminGroups.${group.subscription_type}`) }}
                </span>
              </td>
              <td>
                <span :class="['badge', group.status === 'active' ? 'badge-success' : 'badge-danger']">
                  {{ t(`adminGroups.${group.status}`) }}
                </span>
              </td>
              <td>{{ group.account_count ?? 0 }}</td>
              <td>{{ group.active_account_count ?? 0 }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-ghost btn-sm" @click="openEdit(group)">
                    {{ t('adminGroups.edit') }}
                  </button>
                  <button class="btn-danger btn-sm" @click="deleteGroup(group)">
                    {{ t('adminGroups.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 底部信息 + 分页 -->
      <div class="table-footer">
        <span class="total-info">
          {{ t('common.total') }} {{ total }} {{ t('common.items') }}
        </span>
        <div class="pagination">
          <button :disabled="page <= 1" @click="goToPage(page - 1)">{{ t('common.prev') }}</button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            :class="{ active: p === page }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button :disabled="page >= totalPages" @click="goToPage(page + 1)">
            {{ t('common.next') }}
          </button>
        </div>
      </div>
    </template>

    <!-- ==================== 创建/编辑模态框 ==================== -->
    <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal" style="max-width: 580px">
        <div class="modal-header">
          {{ isEditing ? t('adminGroups.editTitle') : t('adminGroups.createTitle') }}
        </div>
        <form @submit.prevent="submitForm">
          <div class="form-grid">
            <!-- 名称 -->
            <div class="form-field">
              <label class="label">{{ t('adminGroups.name') }}</label>
              <input v-model="form.name" class="input" required />
            </div>
            <!-- 平台 -->
            <div class="form-field">
              <label class="label">{{ t('adminGroups.platform') }}</label>
              <select v-model="form.platform" class="input">
                <option v-for="p in PLATFORMS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <!-- 倍率 -->
            <div class="form-field">
              <label class="label">{{ t('adminGroups.rateMultiplier') }}</label>
              <input v-model.number="form.rate_multiplier" class="input" type="number" step="0.01" min="0" />
            </div>
            <!-- 类型 -->
            <div class="form-field">
              <label class="label">{{ t('adminGroups.subscriptionType') }}</label>
              <select v-model="form.subscription_type" class="input">
                <option value="standard">{{ t('adminGroups.standard') }}</option>
                <option value="subscription">{{ t('adminGroups.subscription') }}</option>
              </select>
            </div>
            <!-- 状态 (仅编辑) -->
            <div v-if="isEditing" class="form-field">
              <label class="label">{{ t('adminGroups.status') }}</label>
              <select v-model="form.status" class="input">
                <option value="active">{{ t('adminGroups.active') }}</option>
                <option value="inactive">{{ t('adminGroups.inactive') }}</option>
              </select>
            </div>
            <!-- 独占模式 -->
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.is_exclusive" type="checkbox" />
                {{ t('adminGroups.isExclusive') }}
              </label>
            </div>
            <!-- 仅 Claude Code -->
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input v-model="form.claude_code_only" type="checkbox" />
                {{ t('adminGroups.claudeCodeOnly') }}
              </label>
            </div>
            <!-- 日限额 -->
            <div class="form-field">
              <label class="label">{{ t('adminGroups.dailyLimit') }}</label>
              <input v-model.number="form.daily_limit_usd" class="input" type="number" step="0.01" />
            </div>
            <!-- 周限额 -->
            <div class="form-field">
              <label class="label">{{ t('adminGroups.weeklyLimit') }}</label>
              <input v-model.number="form.weekly_limit_usd" class="input" type="number" step="0.01" />
            </div>
            <!-- 月限额 -->
            <div class="form-field">
              <label class="label">{{ t('adminGroups.monthlyLimit') }}</label>
              <input v-model.number="form.monthly_limit_usd" class="input" type="number" step="0.01" />
            </div>
            <!-- 描述 -->
            <div class="form-field full-width">
              <label class="label">{{ t('adminGroups.description') }}</label>
              <textarea v-model="form.description" class="input" rows="3" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="submitting || !form.name">
              {{ t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-select {
  width: auto;
  min-width: 140px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 64px 0;
}

.font-medium {
  font-weight: 500;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.total-info {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.checkbox-field {
  justify-content: flex-end;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

textarea.input {
  resize: vertical;
}
</style>
