<template>
  <div class="top-data-panel">
    <div class="panel-heading">
      <div>
        <span class="section-kicker">Overview</span>
        <h3>运行总览</h3>
      </div>
      <div class="panel-meta">
        <span class="meta-pill">{{ summaryItems[0].value }} 设备</span>
        <span class="meta-pill soft">{{ onlineRate }} 在线率</span>
      </div>
    </div>

    <div class="summary-grid">
      <article v-for="item in summaryItems" :key="item.label" class="summary-card">
        <div class="summary-top">
          <span class="summary-label">{{ item.label }}</span>
          <span class="summary-badge" :class="item.tone">{{ item.badge }}</span>
        </div>
        <strong>{{ item.value }}</strong>
        <p>{{ item.description }}</p>
      </article>
    </div>

    <div class="secondary-grid">
      <article class="secondary-card">
        <div class="secondary-title">状态分布</div>
        <div class="status-list">
          <div v-for="item in statusItems" :key="item.label" class="status-row">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>

      <article class="secondary-card">
        <div class="secondary-title">轮询与系统</div>
        <div class="status-list">
          <div class="status-row">
            <span>轮询状态</span>
            <strong>{{ pollingStore.isServiceRunning ? '运行中' : '已暂停' }}</strong>
          </div>
          <div class="status-row">
            <span>活跃任务</span>
            <strong>{{ pollingStore.activeTasks.length }}</strong>
          </div>
          <div class="status-row">
            <span>CPU</span>
            <strong>{{ cpuLabel }}</strong>
          </div>
          <div class="status-row">
            <span>内存</span>
            <strong>{{ memoryLabel }}</strong>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSensorStore } from '../../stores/sensor'
import { usePollingStore } from '../../stores/polling'
import { useSystemStore } from '../../stores/system'

const sensorStore = useSensorStore()
const pollingStore = usePollingStore()
const systemStore = useSystemStore()

const onlineRate = computed(() => {
  if (!sensorStore.totalSensors) {
    return '0%'
  }
  return `${Math.round((sensorStore.onlineSensors.length / sensorStore.totalSensors) * 100)}%`
})

const cpuLabel = computed(() => `${(systemStore.currentMetrics?.cpu ?? 0).toFixed(1)}%`)
const memoryLabel = computed(() => `${(systemStore.currentMetrics?.memory ?? 0).toFixed(1)}%`)

const summaryItems = computed(() => [
  {
    label: '传感器总数',
    value: sensorStore.totalSensors,
    badge: '实时',
    tone: 'primary',
    description: '来自 sensor store 的当前设备总量。'
  },
  {
    label: '在线设备',
    value: sensorStore.onlineSensors.length,
    badge: onlineRate.value,
    tone: 'success',
    description: '在线与非离线设备占比。'
  },
  {
    label: '告警设备',
    value: sensorStore.warningSensors.length,
    badge: '需关注',
    tone: 'warning',
    description: '当前处于 warning 状态的设备数量。'
  },
  {
    label: '异常设备',
    value: sensorStore.errorSensors.length,
    badge: '处理中',
    tone: 'danger',
    description: '当前处于 error 状态的设备数量。'
  }
])

const statusItems = computed(() => [
  { label: '正常', value: sensorStore.sensorStatistics.normal },
  { label: '告警', value: sensorStore.sensorStatistics.warning },
  { label: '异常', value: sensorStore.sensorStatistics.error },
  { label: '离线', value: sensorStore.sensorStatistics.offline },
  { label: '关键优先级', value: sensorStore.sensorStatistics.critical }
])
</script>

<style scoped>
.top-data-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel-heading h3 {
  margin: 4px 0 0;
  font-size: 20px;
  color: var(--app-text);
}

.panel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text-soft);
  font-size: 13px;
}

.meta-pill.soft {
  background: var(--app-surface-muted);
}

.summary-grid,
.secondary-grid {
  display: grid;
  gap: 12px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.secondary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card,
.secondary-card {
  border: 1px solid var(--app-border-subtle);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-muted);
  padding: 16px;
}

.summary-top,
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.summary-label,
.secondary-title,
.status-row span,
.summary-card p {
  color: var(--app-text-muted);
}

.summary-card strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 28px;
  line-height: 1;
  color: var(--app-text);
}

.summary-card p {
  font-size: 13px;
  line-height: 1.6;
}

.summary-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
}

.summary-badge.primary {
  background: var(--app-accent-soft);
  color: var(--app-accent);
}

.summary-badge.success {
  background: rgba(47, 158, 114, 0.12);
  color: var(--app-success);
}

.summary-badge.warning {
  background: rgba(213, 143, 42, 0.12);
  color: var(--app-warning);
}

.summary-badge.danger {
  background: rgba(214, 87, 69, 0.12);
  color: var(--app-danger);
}

.secondary-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.secondary-title {
  font-size: 13px;
}

.status-list {
  display: grid;
  gap: 10px;
}

.status-row strong {
  color: var(--app-text);
}

@media (max-width: 1100px) {
  .summary-grid,
  .secondary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .panel-heading {
    flex-direction: column;
  }

  .summary-grid,
  .secondary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
