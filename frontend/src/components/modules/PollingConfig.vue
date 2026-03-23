<template>
  <div class="polling-config">
    <!-- AI轮询总开关 -->
    <div class="polling-switch">
      <div class="switch-header">
        <span class="switch-label">AI智能轮询</span>
        <el-switch
          v-model="pollingEnabled"
          @change="handlePollingToggle"
          :loading="switchLoading"
        />
      </div>
      <div class="switch-description">
        <span>{{ pollingEnabled ? '已启用智能轮询算法' : '使用固定轮询间隔' }}</span>
      </div>
    </div>

    <!-- 基础配置 -->
    <div class="basic-config" v-if="pollingEnabled">
      <el-divider content-position="left">
        <span class="section-title">基础配置</span>
      </el-divider>

      <el-form :model="basicConfig" size="small" label-position="top">
        <el-form-item label="基础轮询间隔">
          <div class="interval-input">
            <el-input-number
              v-model="basicConfig.baseInterval"
              :min="5"
              :max="300"
              :step="5"
              controls-position="right"
              style="width: 100%"
            />
            <span class="unit">秒</span>
          </div>
        </el-form-item>

        <el-form-item label="最小轮询间隔">
          <div class="interval-input">
            <el-input-number
              v-model="basicConfig.minInterval"
              :min="1"
              :max="60"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
            <span class="unit">秒</span>
          </div>
        </el-form-item>

        <el-form-item label="最大轮询间隔">
          <div class="interval-input">
            <el-input-number
              v-model="basicConfig.maxInterval"
              :min="60"
              :max="3600"
              :step="30"
              controls-position="right"
              style="width: 100%"
            />
            <span class="unit">秒</span>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 权重配置 -->
    <div class="weight-config" v-if="pollingEnabled">
      <el-divider content-position="left">
        <span class="section-title">算法权重</span>
      </el-divider>

      <div class="weight-items">
        <div class="weight-item">
          <div class="weight-header">
            <span class="weight-label">数值变化幅度</span>
            <span class="weight-value">{{ weightConfig.variability }}%</span>
          </div>
          <el-slider
            v-model="weightConfig.variability"
            :min="0"
            :max="100"
            :step="5"
            show-stops
          />
        </div>

        <div class="weight-item">
          <div class="weight-header">
            <span class="weight-label">设备优先级</span>
            <span class="weight-value">{{ weightConfig.priority }}%</span>
          </div>
          <el-slider
            v-model="weightConfig.priority"
            :min="0"
            :max="100"
            :step="5"
            show-stops
          />
        </div>

        <div class="weight-item">
          <div class="weight-header">
            <span class="weight-label">异常模式识别</span>
            <span class="weight-value">{{ weightConfig.anomaly }}%</span>
          </div>
          <el-slider
            v-model="weightConfig.anomaly"
            :min="0"
            :max="100"
            :step="5"
            show-stops
          />
        </div>

        <div class="weight-item">
          <div class="weight-header">
            <span class="weight-label">系统负载</span>
            <span class="weight-value">{{ weightConfig.systemLoad }}%</span>
          </div>
          <el-slider
            v-model="weightConfig.systemLoad"
            :min="0"
            :max="100"
            :step="5"
            show-stops
          />
        </div>
      </div>

      <div class="weight-total">
        <span>权重总和: {{ totalWeight }}%</span>
        <el-button
          v-if="totalWeight !== 100"
          size="small"
          type="primary"
          plain
          @click="normalizeWeights"
        >
          自动平衡
        </el-button>
      </div>
    </div>

    <!-- 实时状态 -->
    <div class="polling-status">
      <el-divider content-position="left">
        <span class="section-title">实时状态</span>
      </el-divider>

      <div class="status-grid">
        <div class="status-item">
          <div class="status-label">当前状态</div>
          <el-tag :type="pollingStatus.active ? 'success' : 'danger'" size="small">
            {{ pollingStatus.active ? '运行中' : '已停止' }}
          </el-tag>
        </div>

        <div class="status-item">
          <div class="status-label">活跃任务</div>
          <div class="status-value">{{ pollingStatus.activeTasks }}</div>
        </div>

        <div class="status-item">
          <div class="status-label">队列长度</div>
          <div class="status-value">{{ pollingStatus.queueLength }}</div>
        </div>

        <div class="status-item">
          <div class="status-label">平均间隔</div>
          <div class="status-value">{{ pollingStatus.avgInterval }}s</div>
        </div>
      </div>
    </div>

    <!-- 设备优先级配置 -->
    <div class="device-priority" v-if="pollingEnabled">
      <el-divider content-position="left">
        <span class="section-title">设备优先级</span>
      </el-divider>

      <div class="priority-list">
        <div
          v-for="device in devicePriorities"
          :key="device.id"
          class="priority-item"
        >
          <div class="device-info">
            <span class="device-name">{{ device.name }}</span>
            <el-tag :type="getPriorityColor(device.priority)" size="small">
              {{ getPriorityText(device.priority) }}
            </el-tag>
          </div>
          <el-select
            v-model="device.priority"
            size="small"
            style="width: 80px"
            @change="updateDevicePriority(device.id, device.priority)"
          >
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="critical" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="config-actions">
      <el-button
        size="small"
        @click="resetToDefaults"
        :disabled="!pollingEnabled"
      >
        重置默认
      </el-button>
      <el-button
        size="small"
        type="primary"
        @click="saveConfig"
        :loading="saving"
        :disabled="!pollingEnabled || totalWeight !== 100"
      >
        保存配置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePollingStore } from '../../stores/polling'
import { useSensorStore } from '../../stores/sensor'

interface DevicePriority {
  id: string
  name: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

const pollingStore = usePollingStore()
const sensorStore = useSensorStore()

// 轮询开关状态
const pollingEnabled = computed({
  get: () => pollingStore.config.enabled,
  set: (value: boolean) => {
    pollingStore.config.enabled = value
  }
})
const switchLoading = ref(false)

// 基础配置
const basicConfig = reactive({
  get baseInterval() {
    return pollingStore.config.baseInterval
  },
  set baseInterval(value: number) {
    pollingStore.config.baseInterval = value
  },
  get minInterval() {
    return pollingStore.config.minInterval
  },
  set minInterval(value: number) {
    pollingStore.config.minInterval = value
  },
  get maxInterval() {
    return pollingStore.config.maxInterval
  },
  set maxInterval(value: number) {
    pollingStore.config.maxInterval = value
  }
})

// 权重配置
const weightConfig = reactive({
  get variability() {
    return Math.round((pollingStore.config.weights?.variability ?? 0) * 100)
  },
  set variability(value: number) {
    ensureWeights()
    pollingStore.config.weights!.variability = value / 100
  },
  get priority() {
    return Math.round((pollingStore.config.weights?.priority ?? 0) * 100)
  },
  set priority(value: number) {
    ensureWeights()
    pollingStore.config.weights!.priority = value / 100
  },
  get anomaly() {
    return Math.round((pollingStore.config.weights?.anomaly ?? 0) * 100)
  },
  set anomaly(value: number) {
    ensureWeights()
    pollingStore.config.weights!.anomaly = value / 100
  },
  get systemLoad() {
    return Math.round((pollingStore.config.weights?.systemLoad ?? 0) * 100)
  },
  set systemLoad(value: number) {
    ensureWeights()
    pollingStore.config.weights!.systemLoad = value / 100
  }
})

// 轮询状态
const pollingStatus = computed(() => ({
  active: pollingStore.pollingStatus.isRunning,
  activeTasks: pollingStore.pollingStatus.activeTasks,
  queueLength: pollingStore.pollingStatus.queueLength,
  avgInterval: pollingStore.pollingStatus.averageInterval
}))

// 设备优先级
const devicePriorities = computed<DevicePriority[]>(() => {
  return sensorStore.sensors.map(sensor => ({
    id: sensor.id,
    name: sensor.name,
    priority: sensor.priority
  }))
})

// 保存状态
const saving = ref(false)

const ensureWeights = () => {
  if (!pollingStore.config.weights) {
    pollingStore.config.weights = {
      variability: 0.3,
      priority: 0.25,
      anomaly: 0.25,
      systemLoad: 0.2
    }
  }
}

// 计算权重总和
const totalWeight = computed(() => {
  return weightConfig.variability + weightConfig.priority +
         weightConfig.anomaly + weightConfig.systemLoad
})

// 监听权重变化，自动调整
watch(weightConfig, () => {
  if (totalWeight.value > 100) {
    // 保持现有交互，仅提示未自动回写模拟值
  }
}, { deep: true })

// 切换轮询开关
const handlePollingToggle = async (value: boolean) => {
  switchLoading.value = true

  try {
    if (value) {
      await pollingStore.startPollingService()
    } else {
      await pollingStore.stopPollingService()
    }

    await pollingStore.updatePollingConfig({ enabled: value })
    ElMessage.success(value ? 'AI轮询已启用' : 'AI轮询已停用')
  } catch (error) {
    pollingEnabled.value = !value
    ElMessage.error('操作失败，请重试')
  } finally {
    switchLoading.value = false
  }
}

// 权重自动平衡
const normalizeWeights = () => {
  const total = totalWeight.value
  if (total === 0) return

  const factor = 100 / total
  weightConfig.variability = Math.round(weightConfig.variability * factor)
  weightConfig.priority = Math.round(weightConfig.priority * factor)
  weightConfig.anomaly = Math.round(weightConfig.anomaly * factor)
  weightConfig.systemLoad = Math.round(weightConfig.systemLoad * factor)

  const newTotal = totalWeight.value
  if (newTotal !== 100) {
    weightConfig.variability += (100 - newTotal)
  }

  ElMessage.success('权重已自动平衡')
}

// 更新设备优先级
const updateDevicePriority = (
  deviceId: string,
  priority: DevicePriority['priority']
) => {
  sensorStore.updateSensor(deviceId, { priority })
  ElMessage.success('设备优先级已更新')
}

// 获取优先级颜色
const getPriorityColor = (priority: string) => {
  const colorMap: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'primary',
    critical: 'danger'
  }
  return colorMap[priority] || 'info'
}

// 获取优先级文本
const getPriorityText = (priority: string) => {
  const textMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  }
  return textMap[priority] || priority
}

// 重置为默认值
const resetToDefaults = async () => {
  try {
    await ElMessageBox.confirm('确定要重置为默认配置吗？', '确认重置', {
      type: 'warning'
    })

    await pollingStore.updatePollingConfig({
      enabled: true,
      baseInterval: 30,
      minInterval: 5,
      maxInterval: 300,
      weights: {
        variability: 0.3,
        priority: 0.25,
        anomaly: 0.25,
        systemLoad: 0.2
      }
    })

    ElMessage.success('已重置为默认配置')
  } catch {
    // 用户取消
  }
}

// 保存配置
const saveConfig = async () => {
  if (totalWeight.value !== 100) {
    ElMessage.warning('权重总和必须为100%')
    return
  }

  saving.value = true

  try {
    await pollingStore.updatePollingConfig({
      enabled: pollingEnabled.value,
      baseInterval: basicConfig.baseInterval,
      minInterval: basicConfig.minInterval,
      maxInterval: basicConfig.maxInterval,
      weights: {
        variability: weightConfig.variability / 100,
        priority: weightConfig.priority / 100,
        anomaly: weightConfig.anomaly / 100,
        systemLoad: weightConfig.systemLoad / 100
      }
    })

    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error('配置保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.polling-config {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.polling-switch {
  padding: 12px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
}

.switch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.switch-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.switch-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.section-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.basic-config :deep(.el-form-item) {
  margin-bottom: 12px;
}

.basic-config :deep(.el-form-item__label) {
  font-size: 12px;
  padding-bottom: 4px;
}

.interval-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  min-width: 20px;
}

.weight-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.weight-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.weight-label {
  font-size: 12px;
  color: var(--el-text-color-primary);
}

.weight-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.weight-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  margin-top: 8px;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.status-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.status-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.priority-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.priority-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 12px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .polling-config {
    padding: 4px;
    gap: 12px;
  }

  .status-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .priority-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .device-info {
    width: 100%;
  }

  .config-actions {
    flex-direction: column;
  }

  .config-actions .el-button {
    width: 100%;
  }
}
</style>