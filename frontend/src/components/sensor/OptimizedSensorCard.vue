<template>
  <div
    class="optimized-sensor-card"
    :class="[
      `status-${sensor.status}`,
      { 'list-mode': listMode, 'polling-active': isPollingActive }
    ]"
    @click="handleCardClick"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="sensor-info">
        <h4 class="sensor-name">{{ sensor.name }}</h4>
        <el-tag
          :type="statusTagType"
          size="small"
          class="status-tag"
        >
          {{ statusText }}
        </el-tag>
      </div>

      <div class="card-actions">
        <!-- 轮询控制 -->
        <el-tooltip :content="pollingTooltip">
          <el-button
            size="small"
            circle
            :type="isPollingActive ? 'success' : 'info'"
            :aria-label="pollingTooltip"
            @click.stop="togglePolling"
            :loading="pollingLoading"
          >
            <el-icon>
              <VideoPlay v-if="!isPollingActive" />
              <VideoPause v-else />
            </el-icon>
          </el-button>
        </el-tooltip>

        <!-- 强制轮询 -->
        <el-tooltip content="立即轮询">
          <el-button
            size="small"
            circle
            type="primary"
            aria-label="立即轮询"
            @click.stop="forcePoll"
            :loading="forcePolling"
            :disabled="!isPollingActive"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 实时数值显示 -->
    <div class="sensor-value-section">
      <div class="current-value">
        <span class="value">{{ formatValue(sensorNumericValue) }}</span>
        <span class="unit">{{ sensor.unit }}</span>
      </div>

      <div class="value-trend" :class="trendClass">
        <el-icon>
          <ArrowUp v-if="trend === 'up'" />
          <ArrowDown v-if="trend === 'down'" />
          <Minus v-if="trend === 'stable'" />
        </el-icon>
        <span class="trend-text">{{ trendText }}</span>
      </div>
    </div>

    <!-- 迷你趋势图 -->
    <div class="trend-chart-container" v-if="!listMode">
      <div class="chart-header">
        <span class="chart-title">24小时趋势</span>
        <span class="data-points">{{ historyData.length }}个数据点</span>
      </div>
      <div class="mini-chart" ref="chartRef">
        <canvas
          ref="canvasRef"
          @mousemove="handleChartHover"
          @mouseleave="hideTooltip"
        ></canvas>

        <!-- 图表悬浮提示 -->
        <div
          v-if="showChartTooltip"
          class="chart-tooltip"
          :style="tooltipStyle"
        >
          <div class="tooltip-time">{{ tooltipData.time }}</div>
          <div class="tooltip-value">{{ tooltipData.value }}{{ sensor.unit }}</div>
        </div>
      </div>
    </div>

    <!-- 设备信息 -->
    <div class="device-info">
      <div class="info-row">
        <el-tag size="small" type="info" class="device-type">
          {{ deviceTypeText }}
        </el-tag>
        <span class="location">{{ sensor.location }}</span>
      </div>

      <div class="info-row" v-if="listMode">
        <span class="last-update">
          <el-icon><Clock /></el-icon>
          {{ formatRelativeTime(sensor.timestamp) }}
        </span>
        <span class="next-poll" v-if="pollingTask">
          下次: {{ formatRelativeTime(pollingTask.nextPollTime) }}
        </span>
      </div>
    </div>

    <!-- 轮询时间信息 (网格模式) -->
    <div class="polling-info" v-if="!listMode && pollingTask">
      <div class="polling-row">
        <span class="label">上次更新:</span>
        <span class="time">{{ formatTime(sensor.timestamp) }}</span>
      </div>
      <div class="polling-row">
        <span class="label">下次轮询:</span>
        <span class="time">{{ formatTime(pollingTask.nextPollTime) }}</span>
      </div>
      <div class="polling-row">
        <span class="label">轮询间隔:</span>
        <span class="interval">{{ pollingTask.interval }}秒</span>
      </div>
    </div>

    <!-- 告警信息 -->
    <div v-if="hasAlarm" class="alarm-section">
      <el-alert
        :title="alarmMessage"
        :type="alarmType"
        size="small"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 性能指标 (开发模式) -->
    <div v-if="showPerformanceInfo" class="performance-info">
      <div class="perf-item">
        <span class="label">缓存:</span>
        <span class="value">{{ cacheHits }}/{{ cacheTotal }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  VideoPlay,
  VideoPause,
  Refresh,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock
} from '@element-plus/icons-vue'
import type { SensorData, PollingTask } from '../../types'
import { useSensorStore } from '../../stores/sensor'
import {
  usePerformanceMonitor,
  useThrottle
} from '../../utils/performance'

interface HistoryPoint {
  time: number
  value: number
}

interface ChartDimensions {
  width: number
  height: number
}

// Props
interface Props {
  sensor: SensorData
  pollingTask?: PollingTask | null
  listMode?: boolean
  showPerformanceInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  listMode: false,
  showPerformanceInfo: false
})

// Emits
const emit = defineEmits<{
  sensorClick: [sensor: SensorData]
  forcePoll: [sensorId: string]
  togglePolling: [sensorId: string, enabled: boolean]
}>()

// Stores
const sensorStore = useSensorStore()

// 性能监控
const { startMeasure, endMeasure } = usePerformanceMonitor()

// 响应式数据
const chartRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const pollingLoading = ref(false)
const forcePolling = ref(false)
const showChartTooltip = ref(false)
const tooltipData = ref({ time: '', value: '' })
const tooltipStyle = ref<Record<string, string>>({})
const chartDimensions = ref<ChartDimensions>({ width: 200, height: 60 })

// 图表配置
const chartHeight = 60
const chartPadding = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8
}

const getCanvasScale = (): number => {
  if (typeof window === 'undefined') return 1
  return Math.max(window.devicePixelRatio || 1, 2)
}

const updateChartDimensions = () => {
  if (!chartRef.value) {
    return
  }

  const { width, height } = chartRef.value.getBoundingClientRect()
  chartDimensions.value = {
    width: Math.max(Math.round(width), 1),
    height: Math.max(Math.round(height) || chartHeight, chartHeight)
  }
}

const setupCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): ChartDimensions => {
  updateChartDimensions()

  const { width, height } = chartDimensions.value
  const scale = getCanvasScale()
  const scaledWidth = Math.round(width * scale)
  const scaledHeight = Math.round(height * scale)

  if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
    canvas.width = scaledWidth
    canvas.height = scaledHeight
  }

  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  return { width, height }
}

const sensorNumericValue = computed(() => {
  const numericValue = Number(props.sensor.value)
  return Number.isFinite(numericValue) ? numericValue : 0
})

const isPollingActive = computed(() => {
  return props.pollingTask?.status === 'running' || props.pollingTask?.status === 'scheduled'
})

// 计算属性
const statusTagType = computed(() => {
  const typeMap: Record<string, string> = {
    normal: 'success',
    warning: 'warning',
    error: 'danger',
    offline: 'info'
  }
  return typeMap[props.sensor.status] || 'info'
})

const statusText = computed(() => {
  const textMap: Record<string, string> = {
    normal: '正常',
    warning: '告警',
    error: '故障',
    offline: '离线'
  }
  return textMap[props.sensor.status] || '未知'
})

const deviceTypeText = computed(() => {
  const typeMap: Record<string, string> = {
    light: '光照',
    temperature: '温度',
    humidity: '湿度',
    pressure: '压力',
    flow: '流量',
    level: '液位',
    vibration: '振动',
    current: '电流',
    voltage: '电压'
  }
  return typeMap[props.sensor.type] || props.sensor.type
})

const pollingTooltip = computed(() => {
  return isPollingActive.value ? '暂停轮询' : '启动轮询'
})

const hasAlarm = computed(() => {
  return props.sensor.status === 'warning' || props.sensor.status === 'error'
})

const alarmMessage = computed(() => {
  if (props.sensor.status === 'error') {
    return '设备故障，请立即检查'
  } else if (props.sensor.status === 'warning') {
    return '数值异常，请关注'
  }
  return ''
})

const alarmType = computed(() => {
  return props.sensor.status === 'error' ? 'error' : 'warning'
})

const historyData = computed<HistoryPoint[]>(() => {
  const history = sensorStore.getSensorHistory(props.sensor.id)
  const mappedHistory = history.reduce<HistoryPoint[]>((points, item) => {
    const numericValue = Number(item.value)
    if (Number.isFinite(numericValue)) {
      points.push({
        time: item.timestamp,
        value: numericValue
      })
    }
    return points
  }, [])

  if (mappedHistory.length > 0) {
    return mappedHistory
  }

  return [{
    time: props.sensor.timestamp,
    value: sensorNumericValue.value
  }]
})

// 趋势计算
const trend = computed<'up' | 'down' | 'stable'>(() => {
  if (historyData.value.length < 2) return 'stable'

  const recent = historyData.value.slice(-3)
  const avg = recent.reduce((sum: number, item: HistoryPoint) => sum + item.value, 0) / recent.length
  const current = sensorNumericValue.value
  const threshold = avg * 0.05

  if (current > avg + threshold) return 'up'
  if (current < avg - threshold) return 'down'
  return 'stable'
})

const trendClass = computed(() => `trend-${trend.value}`)

const trendText = computed(() => {
  const textMap = {
    up: '上升',
    down: '下降',
    stable: '稳定'
  } as const
  return textMap[trend.value]
})

// 性能指标
const cacheHits = ref(0)
const cacheTotal = ref(0)

// 方法
const formatValue = (value: number): string => {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toFixed(1)
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = Math.abs(now - timestamp)
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`

  const days = Math.floor(hours / 24)
  return `${days}天前`
}

const handleCardClick = () => {
  startMeasure('card-click')
  emit('sensorClick', props.sensor)
  endMeasure('card-click')
}

const togglePolling = async () => {
  pollingLoading.value = true
  startMeasure('toggle-polling')

  try {
    emit('togglePolling', props.sensor.id, !isPollingActive.value)
    await new Promise(resolve => setTimeout(resolve, 300))
  } finally {
    pollingLoading.value = false
    endMeasure('toggle-polling')
  }
}

const forcePoll = async () => {
  forcePolling.value = true
  startMeasure('force-poll')

  try {
    emit('forcePoll', props.sensor.id)
    await new Promise(resolve => setTimeout(resolve, 500))
  } finally {
    forcePolling.value = false
    endMeasure('force-poll')
  }
}

const getChartPoint = (
  value: number,
  index: number,
  total: number,
  width: number,
  height: number,
  minValue: number,
  valueRange: number
) => {
  const drawableWidth = Math.max(width - chartPadding.left - chartPadding.right, 1)
  const drawableHeight = Math.max(height - chartPadding.top - chartPadding.bottom, 1)
  const x = total === 1
    ? chartPadding.left + drawableWidth / 2
    : chartPadding.left + (index / (total - 1)) * drawableWidth
  const y = chartPadding.top + drawableHeight - ((value - minValue) / valueRange) * drawableHeight

  return { x, y }
}

// 图表绘制
const drawChart = () => {
  if (!canvasRef.value || !chartRef.value || historyData.value.length === 0 || props.listMode) return

  startMeasure('chart-render')

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    endMeasure('chart-render')
    return
  }

  const { width: chartWidth, height: chartHeightValue } = setupCanvas(canvas, ctx)

  // 清空画布
  ctx.clearRect(0, 0, chartWidth, chartHeightValue)

  // 计算数据范围
  const values = historyData.value.map(d => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1
  const totalPoints = historyData.value.length

  // 绘制网格线
  ctx.strokeStyle = '#f0f0f0'
  ctx.lineWidth = 0.5

  for (let i = 0; i <= 3; i++) {
    const y = chartPadding.top + ((chartHeightValue - chartPadding.top - chartPadding.bottom) / 3) * i
    ctx.beginPath()
    ctx.moveTo(chartPadding.left, y)
    ctx.lineTo(chartWidth - chartPadding.right, y)
    ctx.stroke()
  }

  // 绘制趋势线
  ctx.strokeStyle = getLineColor()
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()

  historyData.value.forEach((point, index) => {
    const { x, y } = getChartPoint(point.value, index, totalPoints, chartWidth, chartHeightValue, minValue, valueRange)

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })

  ctx.stroke()

  // 绘制数据点
  ctx.fillStyle = getLineColor()
  historyData.value.forEach((point, index) => {
    const { x, y } = getChartPoint(point.value, index, totalPoints, chartWidth, chartHeightValue, minValue, valueRange)

    ctx.beginPath()
    ctx.arc(x, y, 2, 0, 2 * Math.PI)
    ctx.fill()
  })

  endMeasure('chart-render')
}

const getLineColor = (): string => {
  const colorMap = {
    'up': '#67c23a',
    'down': '#f56c6c',
    'stable': '#409eff'
  }
  return colorMap[trend.value]
}

// 图表悬浮事件
const throttledChartHover = useThrottle((event: MouseEvent) => {
  if (!chartRef.value || historyData.value.length === 0) return

  const rect = chartRef.value.getBoundingClientRect()
  const chartWidth = rect.width || chartDimensions.value.width
  const x = event.clientX - rect.left
  const dataIndex = Math.round((x / chartWidth) * (historyData.value.length - 1))

  if (dataIndex >= 0 && dataIndex < historyData.value.length) {
    const point = historyData.value[dataIndex]
    tooltipData.value = {
      time: formatTime(point.time),
      value: formatValue(point.value)
    }

    tooltipStyle.value = {
      left: `${Math.min(Math.max(x, 12), chartWidth - 12)}px`,
      top: '-30px'
    }

    showChartTooltip.value = true
  }
}, 50)

const handleChartHover = (event: MouseEvent) => {
  throttledChartHover(event)
}

const hideTooltip = () => {
  showChartTooltip.value = false
}

const redrawChart = () => {
  nextTick(() => {
    drawChart()
  })
}

let resizeObserver: ResizeObserver | null = null

watch(historyData, redrawChart, { deep: true })
watch(() => props.listMode, redrawChart)
watch(() => props.sensor.id, redrawChart)

// 生命周期
onMounted(() => {
  startMeasure('card-mount')

  if (typeof ResizeObserver !== 'undefined' && chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      redrawChart()
    })
    resizeObserver.observe(chartRef.value)
  }

  window.addEventListener('resize', redrawChart)

  redrawChart()

  endMeasure('card-mount')
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', redrawChart)
})
</script>

<style scoped>
.optimized-sensor-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  contain: layout style paint;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.optimized-sensor-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 状态样式 */
.status-online {
  border-left: 4px solid var(--el-color-success);
}

.status-warning {
  border-left: 4px solid var(--el-color-warning);
}

.status-error {
  border-left: 4px solid var(--el-color-danger);
}

.status-offline {
  border-left: 4px solid var(--el-color-info);
  opacity: 0.7;
}

/* 轮询状态 */
.polling-active::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: var(--el-color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0;
  gap: 12px;
}

.sensor-info {
  flex: 1;
}

.sensor-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.status-tag {
  font-size: 12px;
}

.card-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-left: 8px;
  flex-shrink: 0;
  min-width: 72px;
  min-height: 36px;
  align-self: flex-start;
}

.card-actions :deep(.el-button) {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.card-actions :deep(.el-button .el-icon),
.card-actions :deep(.el-button [class*=el-icon]) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  line-height: 1;
}

.card-actions :deep(.el-button .el-icon svg),
.card-actions :deep(.el-button [class*=el-icon] svg) {
  width: 1em;
  height: 1em;
  fill: currentColor;
}

.card-actions :deep(.el-button.is-loading) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 数值显示 */
.sensor-value-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
}

.current-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.current-value .value {
  font-size: 24px;
  font-weight: 700;
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
  padding: 2px 6px;
  border-radius: 4px;
}

.trend-up {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.trend-down {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.trend-stable {
  color: var(--el-color-info);
  background: var(--el-color-info-light-9);
}

/* 趋势图 */
.trend-chart-container {
  margin-bottom: 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 12px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.data-points {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.mini-chart {
  position: relative;
  height: 60px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
  overflow: hidden;
}

.mini-chart canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.chart-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}

.tooltip-time {
  font-weight: 500;
}

.tooltip-value {
  color: var(--el-color-primary-light-3);
}

/* 设备信息 */
.device-info {
  margin-bottom: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.device-type {
  font-size: 11px;
}

.location {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.last-update,
.next-poll {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 轮询信息 */
.polling-info {
  background: var(--el-fill-color-extra-light);
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.polling-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin-bottom: 2px;
}

.polling-row:last-child {
  margin-bottom: 0;
}

.polling-row .label {
  color: var(--el-text-color-secondary);
}

.polling-row .time,
.polling-row .interval {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

/* 告警信息 */
.alarm-section {
  margin-bottom: 12px;
}

/* 性能信息 */
.performance-info {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 8px;
}

.perf-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.perf-item .label {
  color: var(--el-text-color-secondary);
}

.perf-item .value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

/* 列表模式 */
.list-mode {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 0;
}

.list-mode .card-header {
  flex: 0 0 200px;
  margin-bottom: 0;
  margin-right: 16px;
}

.list-mode .sensor-value-section {
  flex: 0 0 120px;
  margin-bottom: 0;
  margin-right: 16px;
}

.list-mode .device-info {
  flex: 1;
  margin-bottom: 0;
}

.list-mode .trend-chart-container {
  display: none;
}

.list-mode .polling-info {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .optimized-sensor-card {
    padding: 12px;
  }

  .card-header {
    align-items: flex-start;
    gap: 12px;
  }

  .sensor-name {
    font-size: 14px;
  }

  .current-value .value {
    font-size: 20px;
  }

  .card-actions {
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    min-width: 74px;
  }

  .card-actions :deep(.el-button) {
    width: 34px;
    height: 34px;
    min-width: 34px;
    min-height: 34px;
  }

  .list-mode {
    flex-direction: column;
    align-items: stretch;
  }

  .list-mode .card-header,
  .list-mode .sensor-value-section,
  .list-mode .device-info {
    flex: none;
    margin-right: 0;
    margin-bottom: 8px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .mini-chart {
    background: rgba(255, 255, 255, 0.05);
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .optimized-sensor-card {
    border-width: 2px;
  }

  .optimized-sensor-card:hover {
    border-width: 3px;
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .optimized-sensor-card {
    transition: none;
  }

  .optimized-sensor-card:hover {
    transform: none;
  }

  .polling-active::after {
    animation: none;
  }
}
</style>