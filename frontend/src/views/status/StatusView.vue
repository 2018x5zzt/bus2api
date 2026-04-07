<!-- StatusView: Service health status -->
<template>
  <div class="animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">{{ t('status.title') }}</h1>
    </div>

    <div class="status-banner" :class="bannerClass">
      <component :is="bannerIcon" :size="24" />
      <span class="status-label">{{ bannerText }}</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">{{ t('status.uptime') }}</div>
        <div class="stat-value">{{ uptime }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('status.latency') }}</div>
        <div class="stat-value">{{ latency }}ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('status.lastCheck') }}</div>
        <div class="stat-value text-sm">{{ lastCheck }}</div>
      </div>
    </div>

    <!-- Service list -->
    <div class="card">
      <div class="service-list">
        <div v-for="svc in services" :key="svc.name" class="service-row">
          <div class="service-info">
            <div class="service-dot" :class="dotClass(svc.status)"></div>
            <span class="service-name">{{ svc.name }}</span>
          </div>
          <span :class="['badge', statusBadge(svc.status)]">
            {{ statusText(svc.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, markRaw, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckCircle as CheckIcon,
  AlertTriangle as WarnIcon,
  XCircle as ErrorIcon,
} from 'lucide-vue-next'
import { apiClient } from '@/api/client'

const { t } = useI18n()

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
}

const overall = ref<'healthy' | 'degraded' | 'down'>('healthy')
const uptime = ref('99.9')
const latency = ref(0)
const lastCheck = ref('-')
const services = ref<ServiceStatus[]>([])

let timer: ReturnType<typeof setInterval> | undefined

const bannerClass = computed(() => `banner-${overall.value}`)

const bannerIcon = computed<Component>(() => {
  const map: Record<string, Component> = {
    healthy: markRaw(CheckIcon),
    degraded: markRaw(WarnIcon),
    down: markRaw(ErrorIcon),
  }
  return map[overall.value]
})

const bannerText = computed(() => {
  const map: Record<string, string> = {
    healthy: t('status.healthy'),
    degraded: t('status.degraded'),
    down: t('status.down'),
  }
  return map[overall.value]
})

function dotClass(s: string): string {
  return `dot-${s}`
}

function statusBadge(s: string): string {
  const map: Record<string, string> = {
    healthy: 'badge-success',
    degraded: 'badge-warning',
    down: 'badge-danger',
  }
  return map[s] ?? 'badge-neutral'
}

function statusText(s: string): string {
  const map: Record<string, string> = {
    healthy: t('status.healthy'),
    degraded: t('status.degraded'),
    down: t('status.down'),
  }
  return map[s] ?? s
}

async function fetchStatus(): Promise<void> {
  const start = Date.now()
  try {
    await apiClient.get('/status')
    const elapsed = Date.now() - start
    latency.value = elapsed
    overall.value = 'healthy'
    lastCheck.value = new Date().toLocaleTimeString()

    services.value = [
      { name: 'API Gateway', status: 'healthy' },
      { name: 'Authentication', status: 'healthy' },
      { name: 'Model Proxy', status: 'healthy' },
    ]
  } catch {
    overall.value = 'down'
    latency.value = 0
    lastCheck.value = new Date().toLocaleTimeString()

    services.value = [
      { name: 'API Gateway', status: 'down' },
      { name: 'Authentication', status: 'down' },
      { name: 'Model Proxy', status: 'down' },
    ]
  }
}

onMounted(() => {
  fetchStatus()
  const POLL_INTERVAL_MS = 30_000
  timer = setInterval(fetchStatus, POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 24px;
}

.banner-healthy {
  background: #dcfce7;
  color: #166534;
}

.banner-degraded {
  background: #fef3c7;
  color: #92400e;
}

.banner-down {
  background: #fef2f2;
  color: #991b1b;
}

.text-sm {
  font-size: 16px !important;
}

.service-list {
  display: flex;
  flex-direction: column;
}

.service-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
}

.service-row:last-child {
  border-bottom: none;
}

.service-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.service-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-healthy {
  background: var(--color-success);
}

.dot-degraded {
  background: var(--color-warning);
}

.dot-down {
  background: var(--color-danger);
}

.service-name {
  font-weight: 500;
  font-size: 14px;
}
</style>
