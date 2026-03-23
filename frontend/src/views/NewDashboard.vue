<template>
  <div class="new-dashboard page-shell">
    <section class="dashboard-hero app-panel">
      <div class="hero-copy">
        <span class="section-kicker">{{ pageTitle }}</span>
        <h1>{{ pageDescription }}</h1>
        <p>保留既有监控能力与 store 数据接线，将趋势、监测、系统状态与 AI 协作统一到轻量工作台节奏中。</p>
      </div>

      <div class="hero-actions">
        <div class="hero-status-group">
          <span class="status-pill primary">{{ sensorStore.loading ? '数据加载中' : '实时数据已连接' }}</span>
          <span class="status-pill">{{ sensorStore.totalSensors }} 个传感器</span>
          <span class="status-pill">最后更新 {{ lastUpdateLabel }}</span>
        </div>
      </div>
    </section>

    <div class="dashboard-workbench">
      <div class="dashboard-main-column">
        <section class="workbench-section">
          <TopDataPanel />
        </section>

        <section class="workbench-section app-panel realtime-section">
          <div class="section-heading compact">
            <div>
              <span class="section-kicker">Realtime feed</span>
              <h2>真实传感器数据</h2>
            </div>
            <span class="status-pill primary">{{ realtimeSensorSummary }}</span>
          </div>

          <div class="summary-list realtime-list">
            <div v-for="sensor in realtimeSensors" :key="sensor.id" class="summary-item realtime-item">
              <div>
                <span>{{ sensor.name }}</span>
                <p>{{ sensor.location }} · ID: {{ sensor.id }}</p>
              </div>
              <strong>{{ sensor.value }} {{ sensor.unit }}</strong>
            </div>
            <div v-if="!realtimeSensors.length" class="summary-item realtime-empty">
              <span>暂无真实传感器数据</span>
              <strong>等待同步</strong>
            </div>
          </div>
        </section>

        <section class="workbench-section app-panel trend-section">
          <TrendDataPanel />
        </section>

        <section class="workbench-section app-panel sensor-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">Live sensors</span>
              <h2>传感器监控</h2>
            </div>
            <p>继续复用现有 SensorGrid，优先保留核心监测视图与交互入口。</p>
          </div>
          <OptimizedSensorGrid />
        </section>

        <section class="workbench-section app-panel monitor-section">
          <SystemMonitor />
        </section>
      </div>

      <aside class="dashboard-side-column">
        <section class="workbench-section app-panel side-summary">
          <div class="section-heading compact">
            <div>
              <span class="section-kicker">Snapshot</span>
              <h2>运行摘要</h2>
            </div>
          </div>

          <div class="summary-list">
            <div class="summary-item">
              <span>在线设备</span>
              <strong>{{ sensorStore.onlineSensors.length }}</strong>
            </div>
            <div class="summary-item">
              <span>告警设备</span>
              <strong>{{ sensorStore.warningSensors.length }}</strong>
            </div>
            <div class="summary-item">
              <span>异常设备</span>
              <strong>{{ sensorStore.errorSensors.length }}</strong>
            </div>
            <div class="summary-item">
              <span>关键优先级</span>
              <strong>{{ sensorStore.criticalSensors.length }}</strong>
            </div>
          </div>
        </section>

        <section class="workbench-section app-panel health-section">
          <SystemHealthPanel />
        </section>

        <section class="workbench-section app-panel modules-section">
          <SidebarModules />
        </section>

        <section class="workbench-section app-panel ai-section">
          <BottomAIInput />
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TopDataPanel from '../components/layout/TopDataPanel.vue'
import OptimizedSensorGrid from '../components/sensor/OptimizedSensorGrid.vue'
import SystemHealthPanel from '../components/monitoring/SystemHealthPanel.vue'
import { useSensorStore } from '../stores/sensor'
import { usePollingStore } from '../stores/polling'
import { useSystemStore } from '../stores/system'

const TrendDataPanel = defineAsyncComponent(() => import('../components/layout/TrendDataPanel.vue'))
const SystemMonitor = defineAsyncComponent(() => import('../components/monitoring/SystemMonitor.vue'))
const BottomAIInput = defineAsyncComponent(() => import('../components/layout/BottomAIInput.vue'))
const SidebarModules = defineAsyncComponent(() => import('../components/layout/SidebarModules.vue'))

const route = useRoute()
const sensorStore = useSensorStore()
const pollingStore = usePollingStore()
const systemStore = useSystemStore()

const pageTitle = computed(() => String(route.meta.title ?? 'AI智能监控平台'))
const pageDescription = computed(() => String(route.meta.description ?? '新版传感器监控控制台'))
const realtimeSensors = computed(() => sensorStore.sensors.filter(sensor => sensor.deviceId && !sensor.deviceId.startsWith('device_')))
const realtimeSensorSummary = computed(() => {
  if (!realtimeSensors.value.length) {
    return '等待真实设备同步'
  }
  return `${realtimeSensors.value.length} 路真实传感器在线`
})

const lastUpdateLabel = computed(() => {
  if (!sensorStore.lastUpdateTime) {
    return '未同步'
  }
  return new Date(sensorStore.lastUpdateTime).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

onMounted(async () => {
  if (!sensorStore.sensors.length && !sensorStore.loading) {
    await sensorStore.fetchSensors()
  }

  if (!systemStore.isMonitoring) {
    systemStore.startMonitoring()
  }

  if (!pollingStore.isServiceRunning) {
    pollingStore.startPollingService()
  }
})
</script>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
}

.hero-copy {
  max-width: 760px;
}

.hero-copy h1 {
  margin: 6px 0 10px;
  font-size: 30px;
  line-height: 1.2;
  color: var(--app-text);
}

.hero-copy p,
.section-heading p {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.hero-actions,
.hero-status-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: var(--app-surface-muted);
  color: var(--app-text-soft);
  font-size: 13px;
}

.status-pill.primary {
  background: rgba(87, 122, 255, 0.08);
  color: var(--app-accent);
  border-color: rgba(87, 122, 255, 0.16);
}

.dashboard-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.92fr);
  gap: 16px;
  align-items: start;
}

.dashboard-main-column,
.dashboard-side-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workbench-section {
  min-width: 0;
}

.trend-section,
.realtime-section,
.sensor-section,
.monitor-section,
.health-section,
.modules-section,
.ai-section {
  padding: 20px;
}

.realtime-list {
  margin-top: 16px;
}

.realtime-item {
  align-items: flex-start;
}

.realtime-item p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 12px;
}

.realtime-empty {
  color: var(--app-text-muted);
}

.sensor-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}

.section-heading.compact {
  align-items: center;
}

.section-heading h2 {
  margin: 4px 0 0;
  font-size: 20px;
  color: var(--app-text);
}

.side-summary {
  padding: 20px;
}

.summary-list {
  display: grid;
  gap: 10px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--app-radius-md);
  background: var(--app-surface-muted);
  border: 1px solid var(--app-border-subtle);
  color: var(--app-text-soft);
}

.summary-item strong {
  color: var(--app-text);
  font-size: 18px;
}

@media (max-width: 1100px) {
  .dashboard-workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-hero,
  .trend-section,
  .sensor-section,
  .monitor-section,
  .health-section,
  .modules-section,
  .ai-section,
  .side-summary {
    padding: 16px;
  }

  .dashboard-hero,
  .section-heading {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-copy h1 {
    font-size: 24px;
  }
}
</style>
