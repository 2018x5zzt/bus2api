<!-- KeysView: API Key management CRUD -->
<template>
  <div class="animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">{{ t('keys.title') }}</h1>
      <button class="btn-primary" @click="showCreate = true">
        <PlusIcon :size="16" />
        {{ t('keys.create') }}
      </button>
    </div>

    <!-- Keys Table -->
    <div class="card" style="padding: 0">
      <div class="table-container" v-if="keys.length > 0">
        <table>
          <thead>
            <tr>
              <th>{{ t('keys.name') }}</th>
              <th>{{ t('keys.key') }}</th>
              <th>{{ t('keys.status') }}</th>
              <th>{{ t('keys.quota') }}</th>
              <th>{{ t('keys.used') }}</th>
              <th>{{ t('keys.created') }}</th>
              <th>{{ t('keys.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in keys" :key="key.id">
              <td class="key-name">{{ key.name || '-' }}</td>
              <td>
                <div class="key-cell">
                  <code class="key-text">{{ maskKey(key.key) }}</code>
                  <button class="btn-ghost btn-sm" @click="copyKey(key.key)">
                    <CopyIcon :size="14" />
                  </button>
                </div>
              </td>
              <td>
                <span :class="['badge', key.status === 'active' ? 'badge-success' : 'badge-neutral']">
                  {{ key.status === 'active' ? t('keys.active') : t('keys.inactive') }}
                </span>
              </td>
              <td>{{ key.quota > 0 ? `$${key.quota.toFixed(2)}` : '∞' }}</td>
              <td>${{ key.used_quota?.toFixed(4) ?? '0.00' }}</td>
              <td class="text-muted">{{ formatDate(key.created_at) }}</td>
              <td>
                <div class="action-btns">
                  <button
                    class="btn-ghost btn-sm"
                    @click="toggleStatus(key)"
                  >
                    {{ key.status === 'active' ? '⏸' : '▶' }}
                  </button>
                  <button
                    class="btn-ghost btn-sm text-danger"
                    @click="confirmDelete(key)"
                  >
                    <TrashIcon :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <KeyIcon :size="40" class="empty-state-icon" />
        <p>{{ t('keys.noKeys') }}</p>
      </div>
    </div>

    <!-- Create Dialog -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal animate-fade-in">
        <div class="modal-header">{{ t('keys.createDialog.title') }}</div>
        <form @submit.prevent="handleCreate" class="create-form">
          <div class="form-group">
            <label class="label">{{ t('keys.createDialog.name') }}</label>
            <input
              v-model="newKey.name"
              type="text"
              class="input"
              :placeholder="t('keys.createDialog.namePlaceholder')"
              required
            />
          </div>
          <div class="form-group">
            <label class="label">{{ t('keys.createDialog.quota') }}</label>
            <input
              v-model.number="newKey.quota"
              type="number"
              class="input"
              :placeholder="t('keys.createDialog.quotaPlaceholder')"
              min="0"
              step="0.01"
            />
          </div>
          <div class="form-group">
            <label class="label">{{ t('keys.createDialog.expiry') }}</label>
            <input
              v-model.number="newKey.expires_in_days"
              type="number"
              class="input"
              :placeholder="t('keys.createDialog.expiryPlaceholder')"
              min="0"
            />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showCreate = false">
              {{ t('keys.createDialog.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="creating">
              <span v-if="creating" class="spinner"></span>
              {{ t('keys.createDialog.submit') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Plus as PlusIcon,
  Copy as CopyIcon,
  Trash2 as TrashIcon,
  Key as KeyIcon,
} from 'lucide-vue-next'
import { keysAPI } from '@/api/keys'
import type { ApiKey } from '@/types'

const { t } = useI18n()

const keys = ref<ApiKey[]>([])
const showCreate = ref(false)
const creating = ref(false)

const newKey = reactive({
  name: '',
  quota: 0,
  expires_in_days: 0,
})

function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 12) return key
  return key.slice(0, 8) + '...' + key.slice(-4)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

async function copyKey(key: string): Promise<void> {
  await navigator.clipboard.writeText(key)
}

async function fetchKeys(): Promise<void> {
  try {
    const resp = await keysAPI.list()
    keys.value = resp.data ?? []
  } catch {
    // API error
  }
}

async function handleCreate(): Promise<void> {
  creating.value = true
  try {
    await keysAPI.create({
      name: newKey.name,
      quota: newKey.quota || undefined,
      expires_in_days: newKey.expires_in_days || undefined,
    })
    showCreate.value = false
    newKey.name = ''
    newKey.quota = 0
    newKey.expires_in_days = 0
    await fetchKeys()
  } catch {
    // Handle error
  } finally {
    creating.value = false
  }
}

async function toggleStatus(key: ApiKey): Promise<void> {
  try {
    const newStatus = key.status === 'active' ? 'inactive' : 'active'
    await keysAPI.toggleStatus(key.id, newStatus)
    await fetchKeys()
  } catch {
    // Handle error
  }
}

async function confirmDelete(key: ApiKey): Promise<void> {
  if (!window.confirm(t('keys.deleteConfirm'))) return
  try {
    await keysAPI.delete(key.id)
    await fetchKeys()
  } catch {
    // Handle error
  }
}

onMounted(fetchKeys)
</script>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.key-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.key-text {
  font-size: 12px;
  padding: 2px 6px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  font-family: var(--font-mono);
}

.key-name {
  font-weight: 500;
}

.text-muted {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.text-danger {
  color: var(--color-danger) !important;
}

.action-btns {
  display: flex;
  gap: 4px;
}
</style>
