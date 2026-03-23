<template>
  <div class="sensor-grid" :style="{ height: dynamicGridHeight }">
    <!-- 网格头部 -->
    <div class="grid-header">
      <div class="header-info">
        <h3>传感器监控</h3>
        <div class="sensor-count">
          <span>总计: {{ totalSensors }}</span>
          <span>在线: {{ onlineSensors }}</span>
          <span>告警: {{ alarmSensors }}</span>
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
        >
          <el-option label="全部" value="" />
          <el-option label="温度" value="temperature" />
          <el-option label="湿度" value="humidity" />
          <el-option label="压力" value="pressure" />
          <el-option label="流量" value="flow" />
          <el-option label="液位" value="level" />
        </el-select>

        <el-select
          v-model="filterStatus"
          placeholder="设备状态"
          clearable
          size="small"
          style="width: 120px"
        >
          <el-option label="全部" value="" />
          <el-option label="正常" value="normal" />
          <el-option label="告警" value="warning" />
          <el-option label="异常" value="error" />
          <el-option label="离线" value="offline" />
        </el-select>

        <!-- 刷新按钮 -->
        <el-button
          size="small"
          @click="refreshData"
          :loading="refreshing"
        >
          <el-icon><Refresh /></el-icon>
        </el-button>

        <!-- 设置按钮 -->
        <el-button
          size="small"
          @click="showSettings = true"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 传感器网格 -->
    <div class="grid-container" :class="{ 'list-view': viewMode === 'list' }">
      <div
        v-if="viewMode === 'grid'"
        class="sensor-grid-layout"
        :style="gridStyle"
      >
        <SensorCard
          v-for="sensor in filteredSensors"
          :key="sensor.id"
          :sensor="sensor"
          :polling-task="getPollingTask(sensor.id)"
          @sensor-click="handleSensorClick"
          @force-poll="handleForcePoll"
          @toggle-polling="handleTogglePolling"
        />
      </div>

      <div v-else class="sensor-list-layout">
        <SensorCard
          v-for="sensor in filteredSensors"
          :key="sensor.id"
          :sensor="sensor"
          :polling-task="getPollingTask(sensor.id)"
          :list-mode="true"
          @sensor-click="handleSensorClick"
          @force-poll="handleForcePoll"
          @toggle-polling="handleTogglePolling"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredSensors.length === 0" class="empty-container">
      <el-empty description="暂无传感器数据">
        <el-button type="primary" @click="refreshData">刷新数据</el-button>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div v-if="totalSensors > pageSize" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 48, 96]"
        :total="totalSensors"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="网格设置"
      width="400px"
    >
      <el-form label-width="100px">
        <el-form-item label="列数">
          <el-slider
            v-model="gridColumns"
            :min="2"
            :max="6"
            :step="1"
            show-stops
            show-input
          />
        </el-form-item>
        <el-form-item label="卡片间距">
          <el-slider
            v-model="gridGap"
            :min="8"
            :max="32"
            :step="4"
            show-stops
            show-input
          />
        </el-form-item>
        <el-form-item label="自动刷新">
          <el-switch v-model="autoRefresh" />
        </el-form-item>
        <el-form-item v-if="autoRefresh" label="刷新间隔">
          <el-select v-model="refreshInterval">
            <el-option label="5秒" :value="5000" />
            <el-option label="10秒" :value="10000" />
            <el-option label="30秒" :value="30000" />
            <el-option label="1分钟" :value="60000" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Refresh, Setting } from '@element-plus/icons-vue'
import SensorCard from './SensorCard.vue'
import type { SensorData, PollingTask } from '../../types'
import { useSensorStore } from '../../stores/sensor'
import { usePollingStore } from '../../stores/polling'

// 存储
const sensorStore = useSensorStore()
const pollingStore = usePollingStore()

// 响应式数据
const viewMode = ref<'grid' | 'list'>('grid')
const filterType = ref('')
const filterStatus = ref('')
const loading = ref(false)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(24)

// 网格设置
const gridColumns = ref(4)
const gridGap = ref(16)
const autoRefresh = ref(true)
const refreshInterval = ref(30000)
const showSettings = ref(false)

// 自动刷新定时器
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 计算属性
const totalSensors = computed(() => sensorStore.sensors.length)

const onlineSensors = computed(() =>
  sensorStore.sensors.filter(s => s.status !== 'offline').length
)

const alarmSensors = computed(() =>
  sensorStore.sensors.filter(s => s.status === 'warning' || s.status === 'error').length
)

const filteredSensors = computed(() => {
  let sensors = sensorStore.sensors

  // 按类型筛选
  if (filterType.value) {
    sensors = sensors.filter(s => s.type === filterType.value)
  }

  // 按状态筛选
  if (filterStatus.value) {
    sensors = sensors.filter(s => s.status === filterStatus.value)
  }

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sensors.slice(start, end)
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
  gap: `${gridGap.value}px`
}))

// 计算网格所需的行数和高度
const gridRows = computed(() => {
  if (viewMode.value === 'list') return filteredSensors.value.length
  return Math.ceil(filteredSensors.value.length / gridColumns.value)
})

// 动态计算传感器网格容器高度
const dynamicGridHeight = computed(() => {
  if (loading.value || filteredSensors.value.length === 0) {
    return '200px' // 加载或空状态时使用固定最小高度
  }

  const sensorCardHeight = 180 // 传感器卡片高度（减小）
  const headerHeight = 70 // 网格头部高度（减小）
  const paginationHeight = totalSensors.value > pageSize.value ? 50 : 0 // 分页高度（减小）
  const gap = gridGap.value
  const padding = 32 // 上下内边距

  if (viewMode.value === 'list') {
    // 列表模式：每个传感器占一行，但限制最大高度
    const rows = Math.min(filteredSensors.value.length, 3) // 最多显示3行
    const totalHeight = headerHeight + (rows * (sensorCardHeight * 0.8 + gap)) + paginationHeight + padding
    return `${Math.min(totalHeight, 350)}px` // 最大350px
  } else {
    // 网格模式：根据行数计算
    const rows = Math.min(gridRows.value, 2) // 最多显示2行
    const totalHeight = headerHeight + (rows * (sensorCardHeight + gap)) + paginationHeight + padding
    return `${Math.min(totalHeight, 400)}px` // 最大400px
  }
})

// 方法
const refreshData = async () => {
  if (refreshing.value) return

  refreshing.value = true
  try {
    await sensorStore.fetchSensors()
    await pollingStore.fetchTasks()
  } finally {
    refreshing.value = false
  }
}

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

const handleSensorClick = (sensor: SensorData) => {
  // 处理传感器点击事件
  console.log('传感器点击:', sensor)
  // 可以打开详情对话框或跳转到详情页面
}

const handleForcePoll = async (sensorId: string) => {
  try {
    await pollingStore.forcePollSensor(sensorId)
  } catch (error) {
    console.error('强制轮询失败:', error)
  }
}

const handleTogglePolling = async (sensorId: string, enabled: boolean) => {
  try {
    if (enabled) {
      await pollingStore.resumeSensor(sensorId)
    } else {
      await pollingStore.pauseSensor(sensorId)
    }
  } catch (error) {
    console.error('切换轮询状态失败:', error)
  }
}

const getPollingTask = (sensorId: string): PollingTask | null => {
  return pollingStore.getTask(sensorId)
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const saveSettings = () => {
  // 保存设置到本地存储
  const settings = {
    gridColumns: gridColumns.value,
    gridGap: gridGap.value,
    autoRefresh: autoRefresh.value,
    refreshInterval: refreshInterval.value
  }

  localStorage.setItem('sensorGridSettings', JSON.stringify(settings))
  showSettings.value = false

  // 重新设置自动刷新
  setupAutoRefresh()
}

const loadSettings = () => {
  const saved = localStorage.getItem('sensorGridSettings')
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      gridColumns.value = settings.gridColumns || 4
      gridGap.value = settings.gridGap || 16
      autoRefresh.value = settings.autoRefresh !== false
      refreshInterval.value = settings.refreshInterval || 30000
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
}

const setupAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }

  if (autoRefresh.value) {
    refreshTimer = setInterval(() => {
      void refreshData()
    }, refreshInterval.value)
  }
}

// 监听筛选条件变化，重置分页
watch([filterType, filterStatus], () => {
  currentPage.value = 1
})

watch(
  () => sensorStore.sensors,
  () => {
    syncSensorsToPolling()
  },
  { deep: true }
)

watch([autoRefresh, refreshInterval], () => {
  setupAutoRefresh()
})

// 生命周期
onMounted(async () => {
  loadSettings()
  loading.value = true

  try {
    await Promise.all([
      sensorStore.fetchSensors(),
      pollingStore.fetchTasks()
    ])

    if (!pollingStore.isServiceRunning) {
      await pollingStore.startPollingService()
    }

    syncSensorsToPolling()
    await pollingStore.fetchTasks()
  } finally {
    loading.value = false
  }

  setupAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.sensor-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  max-height: 400px;
  overflow: hidden;
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

.grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.sensor-grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.sensor-list-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-container,
.empty-container {
  padding: 40px;
  text-align: center;
}

.pagination-container {
  padding: 16px;
  display: flex;
  justify-content: center;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .sensor-grid-layout {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .header-controls {
    flex-wrap: wrap;
    gap: 8px;
  }
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
  }

  .sensor-grid-layout {
    grid-template-columns: 1fr;
  }

  .grid-container {
    padding: 0 8px;
  }
}

@media (max-width: 576px) {
  .sensor-grid {
    gap: 12px;
  }

  .grid-header {
    padding: 12px;
  }

  .header-info h3 {
    font-size: 16px;
  }

  .sensor-count {
    font-size: 12px;
  }

  .header-controls .el-select,
  .header-controls .el-radio-group {
    width: 100%;
  }

  .pagination-container {
    padding: 12px;
  }

  .pagination-container :deep(.el-pagination) {
    justify-content: center;
  }

  .pagination-container :deep(.el-pagination .el-pager) {
    flex-wrap: wrap;
  }
}

/* 滚动条样式 */
.grid-container::-webkit-scrollbar {
  width: 6px;
}

.grid-container::-webkit-scrollbar-track {
  background: var(--el-fill-color-extra-light);
  border-radius: 3px;
}

.grid-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.grid-container::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}

/* 列表视图特殊样式 */
.list-view .sensor-list-layout {
  max-width: 800px;
  margin: 0 auto;
}
</style>