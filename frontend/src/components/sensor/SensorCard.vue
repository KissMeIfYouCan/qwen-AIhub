<template>
  <el-card
    class="sensor-card"
    :class="[
      `status-${sensor.status}`,
      `priority-${sensor.priority}`,
      { 'list-mode': listMode, 'polling-active': isPollingActive }
    ]"
    @click="handleCardClick"
    shadow="hover"
  >
    <!-- 卡片头部 -->
    <template #header>
      <div class="card-header">
        <div class="sensor-info">
          <div class="sensor-name">{{ sensor.name }}</div>
          <div class="sensor-location">{{ sensor.location }}</div>
        </div>
        <div class="sensor-status">
          <el-tag :type="getStatusType(sensor.status)" size="small">
            {{ getStatusText(sensor.status) }}
          </el-tag>
          <el-tag :type="getPriorityType(sensor.priority)" size="small">
            {{ getPriorityText(sensor.priority) }}
          </el-tag>
        </div>
      </div>
    </template>

    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 主要数值显示 -->
      <div class="value-section">
        <div class="current-value">
          <span class="value">{{ formatValue(sensor.value) }}</span>
          <span class="unit">{{ sensor.unit }}</span>
        </div>
        <div class="value-trend" v-if="trendData.length > 0">
          <el-icon :class="getTrendIcon()">
            <component :is="getTrendIcon()" />
          </el-icon>
          <span class="trend-text">{{ getTrendText() }}</span>
        </div>
      </div>

      <!-- 迷你趋势图 -->
      <div class="chart-section" v-if="!listMode">
        <SensorTrendChart
          :data="trendData"
          :height="60"
          :show-axis="false"
          :color="getChartColor()"
        />
      </div>

      <!-- 详细信息 -->
      <div class="details-section">
        <div class="detail-row">
          <span class="label">设备类型:</span>
          <span class="value">{{ getTypeText(sensor.type) }}</span>
        </div>
        <div class="detail-row" v-if="sensor.thresholds">
          <span class="label">告警阈值:</span>
          <span class="value">{{ sensor.thresholds.warning }}/{{ sensor.thresholds.error }}</span>
        </div>
        <div class="detail-row">
          <span class="label">最后更新:</span>
          <span class="value">{{ formatTime(sensor.timestamp) }}</span>
        </div>
      </div>

      <!-- 轮询信息 -->
      <div class="polling-section" v-if="pollingTask">
        <el-divider />
        <div class="polling-info">
          <div class="polling-status">
            <el-icon :class="getPollingStatusClass()">
              <component :is="getPollingStatusIcon()" />
            </el-icon>
            <span>{{ getPollingStatusText() }}</span>
          </div>
          <div class="polling-details">
            <div class="detail-item">
              <span class="label">轮询间隔:</span>
              <span class="value">{{ pollingTask.interval }}s</span>
            </div>
            <div class="detail-item">
              <span class="label">下次轮询:</span>
              <span class="value">{{ formatNextPoll() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer v-if="!listMode">
      <div class="card-actions">
        <el-button
          size="small"
          @click.stop="handleForcePoll"
          :loading="isForcePolling"
          :disabled="!isPollingActive"
        >
          <el-icon><Refresh /></el-icon>
          立即轮询
        </el-button>

        <el-button
          size="small"
          :type="isPollingActive ? 'warning' : 'success'"
          @click.stop="handleTogglePolling"
          :loading="isTogglingPolling"
        >
          <el-icon>
            <component :is="isPollingActive ? 'VideoPause' : 'VideoPlay'" />
          </el-icon>
          {{ isPollingActive ? '暂停' : '恢复' }}
        </el-button>

        <el-button
          size="small"
          type="info"
          @click.stop="handleViewDetails"
        >
          <el-icon><View /></el-icon>
          详情
        </el-button>
      </div>
    </template>

    <!-- 列表模式的操作按钮 -->
    <div v-if="listMode" class="list-actions">
      <el-button-group size="small">
        <el-button
          @click.stop="handleForcePoll"
          :loading="isForcePolling"
          :disabled="!isPollingActive"
        >
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button
          :type="isPollingActive ? 'warning' : 'success'"
          @click.stop="handleTogglePolling"
          :loading="isTogglingPolling"
        >
          <el-icon>
            <component :is="isPollingActive ? 'VideoPause' : 'VideoPlay'" />
          </el-icon>
        </el-button>
        <el-button
          type="info"
          @click.stop="handleViewDetails"
        >
          <el-icon><View /></el-icon>
        </el-button>
      </el-button-group>
    </div>

    <!-- 状态指示器 -->
    <div class="status-indicator" :class="sensor.status"></div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Refresh,
  View
} from '@element-plus/icons-vue'
import SensorTrendChart from './SensorTrendChart.vue'
import type { SensorData, PollingTask } from '../../types'
import { useSensorStore } from '../../stores/sensor'

// Props
interface Props {
  sensor: SensorData
  pollingTask?: PollingTask | null
  listMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pollingTask: null,
  listMode: false
})

// Emits
const emit = defineEmits<{
  sensorClick: [sensor: SensorData]
  forcePoll: [sensorId: string]
  togglePolling: [sensorId: string, enabled: boolean]
}>()

const sensorStore = useSensorStore()

// 响应式数据
const isForcePolling = ref(false)
const isTogglingPolling = ref(false)

const trendData = computed<Array<{ time: string, value: number }>>(() => {
  const history = sensorStore.getSensorHistory(props.sensor.id)
  const mappedHistory = history.reduce<Array<{ time: string, value: number }>>((points, item) => {
    const numericValue = Number(item.value)
    if (Number.isFinite(numericValue)) {
      points.push({
        time: new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        value: Math.round(numericValue * 10) / 10
      })
    }
    return points
  }, [])

  if (mappedHistory.length > 0) {
    return mappedHistory
  }

  const currentValue = Number(props.sensor.value)
  return [{
    time: new Date(props.sensor.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    value: Number.isFinite(currentValue) ? Math.round(currentValue * 10) / 10 : 0
  }]
})

// 计算属性
const isPollingActive = computed(() => {
  return props.pollingTask?.status !== 'paused' && props.pollingTask?.status !== 'failed'
})

// 方法
const handleCardClick = () => {
  emit('sensorClick', props.sensor)
}

const handleForcePoll = async () => {
  isForcePolling.value = true
  try {
    emit('forcePoll', props.sensor.id)
    await new Promise(resolve => setTimeout(resolve, 1500))
  } finally {
    isForcePolling.value = false
  }
}

const handleTogglePolling = async () => {
  isTogglingPolling.value = true
  try {
    emit('togglePolling', props.sensor.id, !isPollingActive.value)
    await new Promise(resolve => setTimeout(resolve, 1000))
  } finally {
    isTogglingPolling.value = false
  }
}

const handleViewDetails = () => {
  console.log('查看传感器详情:', props.sensor.id)
}

const formatValue = (value: number | string): string => {
  if (typeof value === 'number') {
    return value.toFixed(1)
  }
  return value.toString()
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const formatNextPoll = (): string => {
  if (!props.pollingTask) return '-'

  const nextTime = new Date(props.pollingTask.nextPollTime)
  const now = new Date()
  const diff = nextTime.getTime() - now.getTime()

  if (diff <= 0) {
    return '即将轮询'
  } else if (diff < 60000) {
    return `${Math.ceil(diff / 1000)}秒后`
  } else {
    return nextTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
}

const getStatusType = (status: string): string => {
  const typeMap: Record<string, string> = {
    normal: 'success',
    warning: 'warning',
    error: 'danger',
    offline: 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    normal: '正常',
    warning: '告警',
    error: '异常',
    offline: '离线'
  }
  return textMap[status] || status
}

const getPriorityType = (priority: string): string => {
  const typeMap: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'primary',
    critical: 'danger'
  }
  return typeMap[priority] || 'info'
}

const getPriorityText = (priority: string): string => {
  const textMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  }
  return textMap[priority] || priority
}

const getTypeText = (type: string): string => {
  const textMap: Record<string, string> = {
    temperature: '温度传感器',
    humidity: '湿度传感器',
    pressure: '压力传感器',
    flow: '流量传感器',
    level: '液位传感器',
    vibration: '振动传感器',
    current: '电流传感器',
    voltage: '电压传感器'
  }
  return textMap[type] || type
}

const getTrendIcon = (): string => {
  if (trendData.value.length < 2) return 'Minus'

  const recent = trendData.value.slice(-3)
  const trend = recent[recent.length - 1].value - recent[0].value

  if (trend > 0.1) return 'ArrowUp'
  if (trend < -0.1) return 'ArrowDown'
  return 'Minus'
}

const getTrendText = (): string => {
  if (trendData.value.length < 2) return '稳定'

  const recent = trendData.value.slice(-3)
  const trend = recent[recent.length - 1].value - recent[0].value

  if (trend > 0.1) return '上升'
  if (trend < -0.1) return '下降'
  return '稳定'
}

const getChartColor = (): string => {
  switch (props.sensor.status) {
    case 'normal':
      return '#67C23A'
    case 'warning':
      return '#E6A23C'
    case 'error':
      return '#F56C6C'
    case 'offline':
      return '#909399'
    default:
      return '#409EFF'
  }
}

const getPollingStatusClass = (): string => {
  if (!props.pollingTask) return 'status-unknown'

  switch (props.pollingTask.status) {
    case 'running':
      return 'status-running'
    case 'completed':
      return 'status-completed'
    case 'error':
    case 'failed':
      return 'status-error'
    case 'paused':
      return 'status-paused'
    default:
      return 'status-pending'
  }
}

const getPollingStatusIcon = (): string => {
  if (!props.pollingTask) return 'CircleClose'

  switch (props.pollingTask.status) {
    case 'running':
      return 'Loading'
    case 'completed':
      return 'CircleCheck'
    case 'error':
    case 'failed':
      return 'Warning'
    case 'paused':
      return 'VideoPause'
    default:
      return 'CircleCheck'
  }
}

const getPollingStatusText = (): string => {
  if (!props.pollingTask) return '未配置轮询'

  switch (props.pollingTask.status) {
    case 'running':
      return '轮询中'
    case 'completed':
      return '轮询正常'
    case 'error':
      return '轮询错误'
    case 'failed':
      return '轮询失败'
    case 'paused':
      return '已暂停'
    default:
      return '等待中'
  }
}
</script>

<style scoped>
.sensor-card {
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
}

.sensor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.sensor-card.list-mode {
  cursor: pointer;
}

.sensor-card.list-mode :deep(.el-card__body) {
  padding: 16px;
}

.sensor-card.polling-active {
  border-left: 4px solid var(--el-color-primary);
}

/* 状态边框颜色 */
.sensor-card.status-normal {
  border-top: 3px solid var(--el-color-success);
}

.sensor-card.status-warning {
  border-top: 3px solid var(--el-color-warning);
}

.sensor-card.status-error {
  border-top: 3px solid var(--el-color-danger);
}

.sensor-card.status-offline {
  border-top: 3px solid var(--el-color-info);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.sensor-info {
  flex: 1;
  min-width: 0;
}

.sensor-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.sensor-location {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sensor-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.value-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.current-value .value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.current-value .unit {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.value-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.chart-section {
  height: 60px;
  margin: -8px 0;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.detail-row .label {
  color: var(--el-text-color-secondary);
}

.detail-row .value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.polling-section {
  margin-top: 8px;
}

.polling-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.polling-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}

.polling-details {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-item .label {
  color: var(--el-text-color-secondary);
}

.detail-item .value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.card-actions .el-button {
  flex: 1;
}

.list-actions {
  position: absolute;
  top: 16px;
  right: 16px;
}

.status-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.normal {
  background: var(--el-color-success);
}

.status-indicator.warning {
  background: var(--el-color-warning);
}

.status-indicator.error {
  background: var(--el-color-danger);
}

.status-indicator.offline {
  background: var(--el-color-info);
}

/* 轮询状态图标颜色 */
.status-running {
  color: var(--el-color-primary);
  animation: spin 1s linear infinite;
}

.status-completed {
  color: var(--el-color-success);
}

.status-error {
  color: var(--el-color-danger);
}

.status-paused {
  color: var(--el-color-warning);
}

.status-pending {
  color: var(--el-color-info);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 列表模式样式 */
.list-mode {
  margin-bottom: 0;
}

.list-mode .card-content {
  flex-direction: row;
  align-items: center;
  gap: 24px;
}

.list-mode .value-section {
  min-width: 120px;
}

.list-mode .details-section {
  flex: 1;
  flex-direction: row;
  gap: 24px;
}

.list-mode .polling-section {
  min-width: 200px;
  margin-top: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sensor-name {
    font-size: 14px;
  }

  .current-value .value {
    font-size: 20px;
  }

  .card-actions {
    flex-direction: column;
    gap: 6px;
  }

  .list-mode .card-content {
    flex-direction: column;
    gap: 12px;
  }

  .list-mode .details-section {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 576px) {
  .card-header {
    flex-direction: column;
    gap: 8px;
  }

  .sensor-status {
    flex-direction: row;
    align-items: center;
    align-self: stretch;
    justify-content: space-between;
  }

  .value-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .polling-details {
    flex-direction: column;
    gap: 4px;
  }
}
</style>