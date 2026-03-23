<template>
  <div class="optimized-sensor-grid" ref="containerRef">
    <!-- 网格头部 -->
    <div class="grid-header">
      <div class="header-info">
        <h3>传感器监控 (优化版)</h3>
        <div class="sensor-count">
          <span>总计: {{ totalSensors }}</span>
          <span>在线: {{ onlineSensors }}</span>
          <span>告警: {{ alarmSensors }}</span>
          <span>渲染: {{ visibleRange.end - visibleRange.start }}/{{ totalSensors }}</span>
        </div>
      </div>

      <div class="header-controls">
        <!-- 视图切换 -->
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="grid">网格</el-radio-button>
          <el-radio-button label="list">列表</el-radio-button>
        </el-radio-group>

        <!-- 筛选器 -->
        <el-select
          v-model="filterType"
          placeholder="设备类型"
          clearable
          size="small"
          style="width: 120px"
          @change="debouncedFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="光照" value="light" />
          <el-option label="温度" value="temperature" />
          <el-option label="湿度" value="humidity" />
          <el-option label="压力" value="pressure" />
          <el-option label="流量" value="flow" />
          <el-option label="液位" value="level" />
        </el-select>
      </div>
    </div>

    <!-- 虚拟滚动容器 -->
    <div
      class="virtual-scroll-container"
      :style="{ height: `${containerHeight}px` }"
      @scroll="handleScroll"
      ref="scrollContainer"
    >
      <!-- 总高度占位 -->
      <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
        <!-- 可见项目 -->
        <div
          v-for="{ item: sensor, index, top } in visibleItems"
          :key="`${sensor.id}-${index}`"
          class="virtual-item"
          :class="{ 'is-selected': selectedSensorId === sensor.id }"
          :style="{
            position: 'absolute',
            top: `${top}px`,
            left: 0,
            right: 0,
            height: `${itemHeight}px`
          }"
        >
          <OptimizedSensorCard
            :sensor="sensor"
            :polling-task="getPollingTask(sensor.id)"
            :list-mode="viewMode === 'list'"
            @sensor-click="handleSensorClick"
            @force-poll="handleForcePoll"
            @toggle-polling="handleTogglePolling"
          />
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredSensors.length === 0" class="empty-container">
      <el-empty description="暂无传感器数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import OptimizedSensorCard from './OptimizedSensorCard.vue'
import type { SensorData, PollingTask } from '../../types'
import { useSensorStore } from '../../stores/sensor'
import { usePollingStore } from '../../stores/polling'
import {
  useVirtualScroll,
  useDebounce,
  useMemoryCache,
  usePerformanceMonitor
} from '../../utils/performance'

// Stores
const sensorStore = useSensorStore()
const pollingStore = usePollingStore()

// 性能优化 Hooks
const { startMeasure, endMeasure } = usePerformanceMonitor()
const { get: getCached, set: setCached } = useMemoryCache<PollingTask | SensorData[] | null>(200)

// 响应式数据
const containerRef = ref<HTMLElement>()
const scrollContainer = ref<HTMLElement>()
const viewMode = ref<'grid' | 'list'>('grid')
const filterType = ref('')
const loading = ref(false)

// 虚拟滚动配置
const containerHeight = ref(600)
const itemHeight = computed(() => viewMode.value === 'list' ? 232 : 492)
const virtualItemHeight = computed(() => itemHeight.value)
const virtualContainerHeight = computed(() => containerHeight.value)
const selectedSensorId = computed(() => sensorStore.selectedSensorId)

// 筛选后的传感器数据
const filteredSensors = computed(() => {
  startMeasure('filter')

  const cacheKey = `filtered-${filterType.value}-${sensorStore.lastUpdateTime}`
  const cached = getCached(cacheKey)
  if (Array.isArray(cached)) {
    endMeasure('filter')
    return cached
  }

  let sensors = sensorStore.sensors

  if (filterType.value) {
    sensors = sensors.filter(s => s.type === filterType.value)
  }

  setCached(cacheKey, sensors)
  endMeasure('filter')
  return sensors
})

// 虚拟滚动
const {
  visibleItems,
  totalHeight,
  handleScroll,
  visibleRange
} = useVirtualScroll<SensorData>(() => filteredSensors.value, {
  itemHeight: virtualItemHeight.value,
  containerHeight: virtualContainerHeight.value,
  overscan: 3
})

// 计算属性
const totalSensors = computed(() => filteredSensors.value.length)
const onlineSensors = computed(() =>
  filteredSensors.value.filter((s: SensorData) => s.status !== 'offline').length
)
const alarmSensors = computed(() =>
  filteredSensors.value.filter((s: SensorData) => s.status === 'warning' || s.status === 'error').length
)

// 防抖函数
const debouncedFilter = useDebounce(() => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}, 300)

// 方法
const handleSensorClick = (sensor: SensorData) => {
  startMeasure('sensor-click')
  sensorStore.selectSensor(sensor.id)
  endMeasure('sensor-click')
}

const handleForcePoll = async (sensorId: string) => {
  startMeasure('force-poll')
  try {
    await pollingStore.forcePollSensor(sensorId)
    await pollingStore.fetchTasks()
  } catch (error) {
    console.error('强制轮询失败:', error)
  } finally {
    endMeasure('force-poll')
  }
}

const handleTogglePolling = async (sensorId: string, enabled: boolean) => {
  startMeasure('toggle-polling')
  try {
    if (enabled) {
      await pollingStore.resumeSensor(sensorId)
    } else {
      await pollingStore.pauseSensor(sensorId)
    }
    await pollingStore.fetchTasks()
  } catch (error) {
    console.error('切换轮询状态失败:', error)
  } finally {
    endMeasure('toggle-polling')
  }
}

const getPollingTask = (sensorId: string): PollingTask | null => {
  const cacheKey = `polling-task-${sensorId}-${sensorStore.lastUpdateTime}-${pollingStore.pollingStatus.activeTasks}-${pollingStore.pollingStatus.pausedTasks}`
  const cached = getCached(cacheKey)
  if (cached && !Array.isArray(cached)) return cached

  const task = pollingStore.getTask(sensorId)
  setCached(cacheKey, task)
  return task
}

const updateContainerHeight = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerHeight.value = Math.max(400, window.innerHeight - rect.top - 100)
  }
}

watch(viewMode, () => {
  nextTick(() => {
    updateContainerHeight()
  })
})

watch(filterType, () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
})

watch(
  () => sensorStore.lastUpdateTime,
  () => {
    syncSensorsToPolling()
    void pollingStore.fetchTasks()
  }
)

onMounted(async () => {
  startMeasure('mount')
  loading.value = true

  try {
    updateContainerHeight()
    await Promise.all([
      sensorStore.fetchSensors(),
      pollingStore.fetchTasks()
    ])

    if (!pollingStore.isServiceRunning) {
      await pollingStore.startPollingService()
    }

    syncSensorsToPolling()
    window.addEventListener('resize', updateContainerHeight)
  } finally {
    loading.value = false
    endMeasure('mount')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

const syncSensorsToPolling = () => {
  if (!pollingStore.isServiceRunning) {
    return
  }

  const existingTaskIds = new Set(pollingStore.getAllTasks().map(task => task.sensorId))
  const currentSensorIds = new Set(sensorStore.sensors.map(sensor => sensor.id))

  sensorStore.sensors.forEach(sensor => {
    if (existingTaskIds.has(sensor.id)) {
      return
    }
    pollingStore.addSensorToPolling(sensor)
  })

  existingTaskIds.forEach(sensorId => {
    if (currentSensorIds.has(sensorId)) {
      return
    }
    pollingStore.removeSensorFromPolling(sensorId)
  })
}
</script>

<style scoped>
.optimized-sensor-grid {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.header-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.sensor-count {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.header-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.virtual-scroll-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;
}

.virtual-item {
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  contain: layout style paint;
  will-change: transform;
  box-sizing: border-box;
}

.virtual-item.is-selected {
  background: var(--el-fill-color-light);
}

.virtual-item:last-child {
  border-bottom: none;
}

.loading-container,
.empty-container {
  padding: 40px;
  text-align: center;
}

.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 4px;
  transition: background 0.2s;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}

.optimized-sensor-grid * {
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .grid-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-info {
    text-align: center;
  }

  .sensor-count {
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
