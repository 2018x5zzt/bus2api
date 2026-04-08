<script setup lang="ts">
/**
 * ChannelsView — 渠道管理页面
 * CRUD + 状态筛选 + 分页 + 模型定价动态表单 + 模型映射 JSON 编辑
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminChannelsAPI } from '@/api/admin'
import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelModelPricing,
  BillingMode,
} from '@/types'

const PAGE_SIZE = 20

const { t } = useI18n()

// ==================== 列表状态 ====================
const channels = ref<Channel[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref<string | null>(null)

// ==================== 筛选 ====================
const statusFilter = ref('')
let abortController: AbortController | null = null

// ==================== 模态框 ====================
const modalOpen = ref(false)
const isEditing = ref(false)
const selectedChannel = ref<Channel | null>(null)
const submitting = ref(false)

// ==================== 表单 ====================
interface ChannelForm {
  name: string
  description: string
  status: string
  billing_model_source: string
  restrict_models: boolean
  group_ids_text: string
  model_pricing: ChannelModelPricingForm[]
  model_mapping_json: string
}

interface ChannelModelPricingForm {
  platform: string
  models_text: string
  billing_mode: BillingMode
  input_price: number | null
  output_price: number | null
  cache_write_price: number | null
  cache_read_price: number | null
  image_output_price: number | null
  per_request_price: number | null
}

const BILLING_MODES: BillingMode[] = ['token', 'per_request', 'image']

function createEmptyPricing(): ChannelModelPricingForm {
  return {
    platform: 'anthropic',
    models_text: '',
    billing_mode: 'token',
    input_price: null,
    output_price: null,
    cache_write_price: null,
    cache_read_price: null,
    image_output_price: null,
    per_request_price: null,
  }
}

function createDefaultForm(): ChannelForm {
  return {
    name: '',
    description: '',
    status: 'active',
    billing_model_source: 'requested',
    restrict_models: false,
    group_ids_text: '',
    model_pricing: [],
    model_mapping_json: '{}',
  }
}

const form = ref<ChannelForm>(createDefaultForm())

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
async function fetchChannels(): Promise<void> {
  abortController?.abort()
  abortController = new AbortController()
  loading.value = true
  error.value = null
  try {
    const res = await adminChannelsAPI.list(
      {
        page: page.value,
        page_size: PAGE_SIZE,
        status: statusFilter.value || undefined,
      },
      { signal: abortController.signal },
    )
    channels.value = res.data
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
  fetchChannels()
}

function goToPage(p: number): void {
  page.value = p
  fetchChannels()
}

// ==================== 表单转换 ====================
function pricingToForm(pricing: ChannelModelPricing): ChannelModelPricingForm {
  return {
    platform: pricing.platform,
    models_text: pricing.models.join(', '),
    billing_mode: pricing.billing_mode,
    input_price: pricing.input_price,
    output_price: pricing.output_price,
    cache_write_price: pricing.cache_write_price,
    cache_read_price: pricing.cache_read_price,
    image_output_price: pricing.image_output_price,
    per_request_price: pricing.per_request_price,
  }
}

function formToPricing(pf: ChannelModelPricingForm): ChannelModelPricing {
  return {
    platform: pf.platform,
    models: pf.models_text.split(',').map((s) => s.trim()).filter(Boolean),
    billing_mode: pf.billing_mode,
    input_price: pf.input_price,
    output_price: pf.output_price,
    cache_write_price: pf.cache_write_price,
    cache_read_price: pf.cache_read_price,
    image_output_price: pf.image_output_price,
    per_request_price: pf.per_request_price,
    intervals: [],
  }
}

function parseGroupIds(text: string): number[] {
  return text
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
}

function parseModelMapping(json: string): Record<string, Record<string, string>> {
  try {
    const parsed = JSON.parse(json)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

// ==================== 模态框控制 ====================
function openCreate(): void {
  isEditing.value = false
  selectedChannel.value = null
  form.value = createDefaultForm()
  modalOpen.value = true
}

function openEdit(channel: Channel): void {
  isEditing.value = true
  selectedChannel.value = channel
  form.value = {
    name: channel.name,
    description: channel.description ?? '',
    status: channel.status,
    billing_model_source: channel.billing_model_source,
    restrict_models: channel.restrict_models,
    group_ids_text: (channel.group_ids ?? []).join(', '),
    model_pricing: (channel.model_pricing ?? []).map(pricingToForm),
    model_mapping_json: JSON.stringify(channel.model_mapping ?? {}, null, 2),
  }
  modalOpen.value = true
}

function closeModal(): void {
  modalOpen.value = false
  selectedChannel.value = null
  submitting.value = false
}

// ==================== 定价动态表单 ====================
function addPricing(): void {
  form.value.model_pricing.push(createEmptyPricing())
}

function removePricing(index: number): void {
  form.value.model_pricing.splice(index, 1)
}

// ==================== 操作 ====================
async function submitForm(): Promise<void> {
  submitting.value = true
  try {
    const groupIds = parseGroupIds(form.value.group_ids_text)
    const modelPricing = form.value.model_pricing.map(formToPricing)
    const modelMapping = parseModelMapping(form.value.model_mapping_json)

    if (isEditing.value && selectedChannel.value) {
      const payload: UpdateChannelRequest = {
        name: form.value.name,
        description: form.value.description || undefined,
        status: form.value.status,
        billing_model_source: form.value.billing_model_source,
        restrict_models: form.value.restrict_models,
        group_ids: groupIds,
        model_pricing: modelPricing,
        model_mapping: modelMapping,
      }
      await adminChannelsAPI.update(selectedChannel.value.id, payload)
    } else {
      const payload: CreateChannelRequest = {
        name: form.value.name,
        description: form.value.description || undefined,
        billing_model_source: form.value.billing_model_source,
        restrict_models: form.value.restrict_models,
        group_ids: groupIds,
        model_pricing: modelPricing,
        model_mapping: modelMapping,
      }
      await adminChannelsAPI.create(payload)
    }
    closeModal()
    fetchChannels()
  } catch (e) {
    alert((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function deleteChannel(channel: Channel): Promise<void> {
  if (!window.confirm(t('adminChannels.deleteConfirm'))) return
  try {
    await adminChannelsAPI.delete(channel.id)
    fetchChannels()
  } catch (e) {
    alert((e as Error).message)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

// ==================== 生命周期 ====================
onMounted(fetchChannels)
onUnmounted(() => {
  abortController?.abort()
})
</script>

<template>
  <div class="animate-fade-in">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">{{ t('adminChannels.title') }}</h1>
      <button class="btn-primary" @click="openCreate">
        {{ t('adminChannels.create') }}
      </button>
    </div>

    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <select v-model="statusFilter" class="input filter-select" @change="onFilterChange">
        <option value="">{{ t('common.all') }} {{ t('adminChannels.status') }}</option>
        <option value="active">{{ t('adminChannels.active') }}</option>
        <option value="inactive">{{ t('adminChannels.inactive') }}</option>
      </select>
    </div>

    <!-- 加载态 -->
    <div v-if="loading && channels.length === 0" class="loading-center">
      <div class="spinner" />
    </div>

    <!-- 错误态 -->
    <div v-else-if="error && channels.length === 0" class="empty-state">
      <p>{{ error }}</p>
      <button class="btn-primary" style="margin-top: 12px" @click="fetchChannels">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- 空态 -->
    <div v-else-if="channels.length === 0" class="empty-state">
      <p>{{ t('common.noData') }}</p>
    </div>

    <!-- 数据表格 -->
    <template v-else>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('adminChannels.name') }}</th>
              <th>{{ t('adminChannels.status') }}</th>
              <th>{{ t('adminChannels.billingModelSource') }}</th>
              <th>{{ t('adminChannels.restrictModels') }}</th>
              <th>{{ t('adminChannels.groupIds') }}</th>
              <th>{{ t('adminChannels.modelPricing') }}</th>
              <th>{{ t('adminChannels.created') }}</th>
              <th>{{ t('adminChannels.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="channel in channels" :key="channel.id">
              <td class="font-medium">{{ channel.name }}</td>
              <td>
                <span :class="['badge', channel.status === 'active' ? 'badge-success' : 'badge-danger']">
                  {{ t(`adminChannels.${channel.status}`) }}
                </span>
              </td>
              <td>
                <span :class="['badge', channel.billing_model_source === 'requested' ? 'badge-neutral' : 'badge-warning']">
                  {{ t(`adminChannels.${channel.billing_model_source}`) }}
                </span>
              </td>
              <td>
                <span :class="['badge', channel.restrict_models ? 'badge-warning' : 'badge-neutral']">
                  {{ channel.restrict_models ? t('common.enable') : t('common.disable') }}
                </span>
              </td>
              <td>{{ (channel.group_ids ?? []).length }}</td>
              <td>{{ (channel.model_pricing ?? []).length }}</td>
              <td>{{ formatDate(channel.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-ghost btn-sm" @click="openEdit(channel)">
                    {{ t('adminChannels.edit') }}
                  </button>
                  <button class="btn-danger btn-sm" @click="deleteChannel(channel)">
                    {{ t('adminChannels.delete') }}
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
      <div class="modal channel-modal">
        <div class="modal-header">
          {{ isEditing ? t('adminChannels.editTitle') : t('adminChannels.createTitle') }}
        </div>
        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <!-- 基础字段 -->
            <div class="form-grid">
              <div class="form-field">
                <label class="label">{{ t('adminChannels.name') }}</label>
                <input v-model="form.name" class="input" required />
              </div>
              <div v-if="isEditing" class="form-field">
                <label class="label">{{ t('adminChannels.status') }}</label>
                <select v-model="form.status" class="input">
                  <option value="active">{{ t('adminChannels.active') }}</option>
                  <option value="inactive">{{ t('adminChannels.inactive') }}</option>
                </select>
              </div>
              <div class="form-field">
                <label class="label">{{ t('adminChannels.billingModelSource') }}</label>
                <select v-model="form.billing_model_source" class="input">
                  <option value="requested">{{ t('adminChannels.requested') }}</option>
                  <option value="upstream">{{ t('adminChannels.upstream') }}</option>
                </select>
              </div>
              <div class="form-field checkbox-field">
                <label class="checkbox-label">
                  <input v-model="form.restrict_models" type="checkbox" />
                  {{ t('adminChannels.restrictModels') }}
                </label>
              </div>
              <div class="form-field full-width">
                <label class="label">{{ t('adminChannels.groupIds') }}</label>
                <input
                  v-model="form.group_ids_text"
                  class="input"
                  :placeholder="t('adminChannels.groupsPlaceholder')"
                />
              </div>
              <div class="form-field full-width">
                <label class="label">{{ t('adminChannels.description') }}</label>
                <textarea v-model="form.description" class="input" rows="2" />
              </div>
            </div>

            <!-- 模型定价 -->
            <div class="section-divider">
              <span class="section-label">{{ t('adminChannels.modelPricing') }}</span>
            </div>
            <div
              v-for="(pricing, idx) in form.model_pricing"
              :key="idx"
              class="pricing-card"
            >
              <div class="pricing-header">
                <span class="pricing-index">#{{ idx + 1 }}</span>
                <button type="button" class="btn-danger btn-sm" @click="removePricing(idx)">
                  {{ t('adminChannels.removePricing') }}
                </button>
              </div>
              <div class="form-grid">
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.platform') }}</label>
                  <input v-model="pricing.platform" class="input" />
                </div>
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.billingMode') }}</label>
                  <select v-model="pricing.billing_mode" class="input">
                    <option v-for="bm in BILLING_MODES" :key="bm" :value="bm">
                      {{ t(`adminChannels.${bm}`) }}
                    </option>
                  </select>
                </div>
                <div class="form-field full-width">
                  <label class="label">{{ t('adminChannels.models') }}</label>
                  <input
                    v-model="pricing.models_text"
                    class="input"
                    :placeholder="t('adminChannels.modelsPlaceholder')"
                  />
                </div>
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.inputPrice') }}</label>
                  <input v-model.number="pricing.input_price" class="input" type="number" step="0.000001" />
                </div>
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.outputPrice') }}</label>
                  <input v-model.number="pricing.output_price" class="input" type="number" step="0.000001" />
                </div>
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.cacheWritePrice') }}</label>
                  <input v-model.number="pricing.cache_write_price" class="input" type="number" step="0.000001" />
                </div>
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.cacheReadPrice') }}</label>
                  <input v-model.number="pricing.cache_read_price" class="input" type="number" step="0.000001" />
                </div>
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.imageOutputPrice') }}</label>
                  <input v-model.number="pricing.image_output_price" class="input" type="number" step="0.000001" />
                </div>
                <div class="form-field">
                  <label class="label">{{ t('adminChannels.perRequestPrice') }}</label>
                  <input v-model.number="pricing.per_request_price" class="input" type="number" step="0.000001" />
                </div>
              </div>
            </div>
            <button type="button" class="btn-secondary add-pricing-btn" @click="addPricing">
              {{ t('adminChannels.addPricing') }}
            </button>

            <!-- 模型映射 JSON -->
            <div class="section-divider">
              <span class="section-label">{{ t('adminChannels.modelMapping') }}</span>
            </div>
            <div class="form-field">
              <textarea
                v-model="form.model_mapping_json"
                class="input mono-textarea"
                rows="5"
                :placeholder="t('adminChannels.mappingJsonPlaceholder')"
              />
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

/* 模态框加宽 + 滚动 */
.channel-modal {
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-body {
  overflow-y: auto;
  max-height: calc(90vh - 140px);
  padding-right: 4px;
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

/* 分区线 */
.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 12px;
}

.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* 定价卡片 */
.pricing-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 12px;
}

.pricing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.pricing-index {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.add-pricing-btn {
  width: 100%;
  justify-content: center;
  margin-bottom: 4px;
}

.mono-textarea {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}
</style>
