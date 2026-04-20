<script setup lang="ts">
/**
 * UsersView — 用户管理页面
 * CRUD + 搜索 + 角色/状态筛选 + 分页 + 重置密码 + 调整余额
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search as SearchIcon } from 'lucide-vue-next'
import { adminUsersAPI } from '@/api/admin'
import type { AdminUser, UpdateUserRequest } from '@/types'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

const { t } = useI18n()

// ==================== 列表状态 ====================
const users = ref<AdminUser[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref<string | null>(null)

// ==================== 筛选 ====================
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

// ==================== 模态框 ====================
type ModalType = 'edit' | 'resetPassword' | 'adjustBalance' | null
const modalType = ref<ModalType>(null)
const selectedUser = ref<AdminUser | null>(null)
const submitting = ref(false)

// 编辑表单
const editForm = ref<UpdateUserRequest>({})
// 重置密码
const newPassword = ref('')
// 调整余额
const balanceAmount = ref(0)
const balanceReason = ref('')

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
async function fetchUsers(): Promise<void> {
  abortController?.abort()
  abortController = new AbortController()
  loading.value = true
  error.value = null
  try {
    const res = await adminUsersAPI.list(
      {
        page: page.value,
        page_size: PAGE_SIZE,
        search: search.value || undefined,
        role: roleFilter.value || undefined,
        status: statusFilter.value || undefined,
      },
      { signal: abortController.signal },
    )
    users.value = res.data
    total.value = res.total
  } catch (e) {
    if ((e as Error).name === 'CanceledError') return
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function onSearchInput(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchUsers()
  }, DEBOUNCE_MS)
}

function onFilterChange(): void {
  page.value = 1
  fetchUsers()
}

function goToPage(p: number): void {
  page.value = p
  fetchUsers()
}

// ==================== 模态框控制 ====================
function openEdit(user: AdminUser): void {
  selectedUser.value = user
  editForm.value = {
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    concurrency: user.concurrency,
    notes: user.notes,
  }
  modalType.value = 'edit'
}

function openResetPassword(user: AdminUser): void {
  selectedUser.value = user
  newPassword.value = ''
  modalType.value = 'resetPassword'
}

function openAdjustBalance(user: AdminUser): void {
  selectedUser.value = user
  balanceAmount.value = 0
  balanceReason.value = ''
  modalType.value = 'adjustBalance'
}

function closeModal(): void {
  modalType.value = null
  selectedUser.value = null
  submitting.value = false
}

// ==================== 操作 ====================
async function submitEdit(): Promise<void> {
  if (!selectedUser.value) return
  submitting.value = true
  try {
    await adminUsersAPI.update(selectedUser.value.id, editForm.value)
    closeModal()
    fetchUsers()
  } catch (e) {
    alert((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function submitResetPassword(): Promise<void> {
  if (!selectedUser.value || !newPassword.value) return
  submitting.value = true
  try {
    await adminUsersAPI.resetPassword(selectedUser.value.id, newPassword.value)
    closeModal()
  } catch (e) {
    alert((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function submitAdjustBalance(): Promise<void> {
  if (!selectedUser.value || balanceAmount.value === 0) return
  submitting.value = true
  try {
    await adminUsersAPI.adjustBalance(
      selectedUser.value.id,
      balanceAmount.value,
      balanceReason.value || undefined,
    )
    closeModal()
    fetchUsers()
  } catch (e) {
    alert((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function deleteUser(user: AdminUser): Promise<void> {
  if (!window.confirm(t('adminUsers.deleteConfirm'))) return
  try {
    await adminUsersAPI.delete(user.id)
    fetchUsers()
  } catch (e) {
    alert((e as Error).message)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

// ==================== 生命周期 ====================
onMounted(fetchUsers)
onUnmounted(() => {
  abortController?.abort()
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="animate-fade-in">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">{{ t('adminUsers.title') }}</h1>
    </div>

    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <div class="search-box">
        <SearchIcon :size="16" class="search-icon" />
        <input
          v-model="search"
          class="input search-input"
          :placeholder="t('adminUsers.searchPlaceholder')"
          @input="onSearchInput"
        />
      </div>
      <select v-model="roleFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminUsers.role') }}</option>
        <option value="admin">{{ t('adminUsers.admin') }}</option>
        <option value="user">{{ t('adminUsers.user') }}</option>
      </select>
      <select v-model="statusFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminUsers.status') }}</option>
        <option value="active">{{ t('adminUsers.active') }}</option>
        <option value="disabled">{{ t('adminUsers.disabled') }}</option>
      </select>
    </div>

    <!-- 加载态 -->
    <div v-if="loading && users.length === 0" class="loading-center">
      <div class="spinner" />
    </div>

    <!-- 错误态 -->
    <div v-else-if="error && users.length === 0" class="empty-state">
      <p>{{ error }}</p>
      <button class="btn-primary" style="margin-top: 12px" @click="fetchUsers">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- 空态 -->
    <div v-else-if="users.length === 0" class="empty-state">
      <p>{{ t('common.noData') }}</p>
    </div>

    <!-- 数据表格 -->
    <template v-else>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('adminUsers.username') }}</th>
              <th>{{ t('adminUsers.email') }}</th>
              <th>{{ t('adminUsers.role') }}</th>
              <th>{{ t('adminUsers.balance') }}</th>
              <th>{{ t('adminUsers.status') }}</th>
              <th>{{ t('adminUsers.concurrency') }}</th>
              <th>{{ t('adminUsers.created') }}</th>
              <th>{{ t('adminUsers.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td class="font-medium">{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span :class="['badge', user.role === 'admin' ? 'badge-warning' : 'badge-neutral']">
                  {{ t(`adminUsers.${user.role}`) }}
                </span>
              </td>
              <td>${{ user.balance.toFixed(2) }}</td>
              <td>
                <span :class="['badge', user.status === 'active' ? 'badge-success' : 'badge-danger']">
                  {{ t(`adminUsers.${user.status}`) }}
                </span>
              </td>
              <td>{{ user.concurrency }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-ghost btn-sm" @click="openEdit(user)">
                    {{ t('adminUsers.edit') }}
                  </button>
                  <button class="btn-ghost btn-sm" @click="openResetPassword(user)">
                    {{ t('adminUsers.resetPassword') }}
                  </button>
                  <button class="btn-ghost btn-sm" @click="openAdjustBalance(user)">
                    {{ t('adminUsers.adjustBalance') }}
                  </button>
                  <button class="btn-danger btn-sm" @click="deleteUser(user)">
                    {{ t('adminUsers.delete') }}
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

    <!-- ==================== 编辑用户模态框 ==================== -->
    <div v-if="modalType === 'edit'" class="modal-overlay" @click.self="closeModal">
      <div class="modal" style="max-width: 520px">
        <div class="modal-header">{{ t('adminUsers.editTitle') }}</div>
        <form @submit.prevent="submitEdit">
          <div class="form-grid">
            <div class="form-field">
              <label class="label">{{ t('adminUsers.username') }}</label>
              <input v-model="editForm.username" class="input" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminUsers.email') }}</label>
              <input v-model="editForm.email" class="input" type="email" />
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminUsers.role') }}</label>
              <select v-model="editForm.role" class="input">
                <option value="admin">{{ t('adminUsers.admin') }}</option>
                <option value="user">{{ t('adminUsers.user') }}</option>
              </select>
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminUsers.status') }}</label>
              <select v-model="editForm.status" class="input">
                <option value="active">{{ t('adminUsers.active') }}</option>
                <option value="disabled">{{ t('adminUsers.disabled') }}</option>
              </select>
            </div>
            <div class="form-field">
              <label class="label">{{ t('adminUsers.concurrency') }}</label>
              <input v-model.number="editForm.concurrency" class="input" type="number" min="1" />
            </div>
            <div class="form-field full-width">
              <label class="label">{{ t('adminUsers.notes') }}</label>
              <textarea v-model="editForm.notes" class="input" rows="3" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== 重置密码模态框 ==================== -->
    <div v-if="modalType === 'resetPassword'" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">{{ t('adminUsers.resetPasswordTitle') }}</div>
        <form @submit.prevent="submitResetPassword">
          <div class="form-field">
            <label class="label">{{ t('adminUsers.newPassword') }}</label>
            <input v-model="newPassword" class="input" type="password" required minlength="6" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="submitting || !newPassword">
              {{ t('common.confirm') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== 调整余额模态框 ==================== -->
    <div v-if="modalType === 'adjustBalance'" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">{{ t('adminUsers.adjustBalanceTitle') }}</div>
        <form @submit.prevent="submitAdjustBalance">
          <div class="form-field">
            <label class="label">{{ t('adminUsers.amount') }}</label>
            <input v-model.number="balanceAmount" class="input" type="number" step="0.01" required />
            <p class="field-hint">{{ t('adminUsers.amountHint') }}</p>
          </div>
          <div class="form-field">
            <label class="label">{{ t('adminUsers.reason') }}</label>
            <input v-model="balanceReason" class="input" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="submitting || balanceAmount === 0">
              {{ t('common.confirm') }}
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

.search-box {
  position: relative;
  flex: 1;
  max-width: 360px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  padding-left: 36px;
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

.field-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

textarea.input {
  resize: vertical;
}
</style>
