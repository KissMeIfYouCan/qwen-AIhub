<template>
  <div class="polling-config-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>轮询配置</h2>
      <div class="header-actions">
        <el-button type="primary" @click="saveConfig">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
        <el-button @click="resetConfig">
          <el-icon><RefreshRight /></el-icon>
          重置
        </el-button>
      </div>
    </div>

    <!-- AI轮询总开关 -->
    <el-card class="config-section">
      <template #header>
        <div class="section-header">
          <span>AI智能轮询</span>
          <el-switch
            v-model="config.aiPollingEnabled"
            size="large"
            active-text="启用"
            inactive-text="禁用"
            @change="handleAIPollingToggle"
          />
        </div>
      </template>
      <el-alert
        v-if="config.aiPollingEnabled"
        title="AI智能轮询已启用"
        type="success"
        description="系统将根据传感器数据变化、设备优先级、历史异常模式等因素智能调整轮询间隔"
        show-icon
        :closable="false"
      />
      <el-alert
        v-else
        title="使用固定轮询间隔"
        type="info"
        description="系统将按照设定的固定间隔进行数据轮询"
        show-icon
        :closable="false"
      />
    </el-card>

    <!-- 基础轮询配置 -->
    <el-card class="config-section">
      <template #header>
        <span>基础轮询配置</span>
      </template>
      <el-form :model="config" label-width="150px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="默认轮询间隔">
              <el-input-number
                v-model="config.defaultInterval"
                :min="5"
                :max="300"
                :step="5"
                controls-position="right"
                style="width: 100%"
              />
              <span class="unit-text">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最小轮询间隔">
              <el-input-number
                v-model="config.minInterval"
                :min="1"
                :max="60"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
              <span class="unit-text">秒</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最大轮询间隔">
              <el-input-number
                v-model="config.maxInterval"
                :min="60"
                :max="3600"
                :step="30"
                controls-position="right"
                style="width: 100%"
              />
              <span class="unit-text">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="并发轮询数量">
              <el-input-number
                v-model="config.maxConcurrent"
                :min="1"
                :max="20"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
              <span class="unit-text">个</span>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- AI算法权重配置 -->
    <el-card v-if="config.aiPollingEnabled" class="config-section">
      <template #header>
        <span>AI算法权重配置</span>
      </template>
      <el-form :model="config.weights" label-width="150px">
        <el-form-item label="数值变化幅度">
          <el-slider
            v-model="config.weights.variability"
            :min="0"
            :max="100"
            :step="5"
            show-input
            input-size="small"
          />
          <span class="weight-desc">权重: {{ config.weights.variability }}%</span>
        </el-form-item>
        <el-form-item label="设备优先级">
          <el-slider
            v-model="config.weights.priority"
            :min="0"
            :max="100"
            :step="5"
            show-input
            input-size="small"
          />
          <span class="weight-desc">权重: {{ config.weights.priority }}%</span>
        </el-form-item>
        <el-form-item label="异常模式识别">
          <el-slider
            v-model="config.weights.anomaly"
            :min="0"
            :max="100"
            :step="5"
            show-input
            input-size="small"
          />
          <span class="weight-desc">权重: {{ config.weights.anomaly }}%</span>
        </el-form-item>
        <el-form-item label="系统负载">
          <el-slider
            v-model="config.weights.systemLoad"
            :min="0"
            :max="100"
            :step="5"
            show-input
            input-size="small"
          />
          <span class="weight-desc">权重: {{ config.weights.systemLoad }}%</span>
        </el-form-item>
        <el-alert
          v-if="totalWeight !== 100"
          :title="`权重总和: ${totalWeight}% (建议调整为100%)`"
          :type="totalWeight > 100 ? 'error' : 'warning'"
          show-icon
          :closable="false"
        />
      </el-form>
    </el-card>

    <!-- 设备优先级配置 -->
    <el-card class="config-section">
      <template #header>
        <div class="section-header">
          <span>设备优先级配置</span>
          <el-button size="small" @click="showAddPriorityDialog = true">
            <el-icon><Plus /></el-icon>
            添加规则
          </el-button>
        </div>
      </template>
      <el-table :data="priorityRules" style="width: 100%">
        <el-table-column prop="deviceType" label="设备类型" width="150" />
        <el-table-column prop="location" label="位置" width="150" />
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)">
              {{ getPriorityName(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="multiplier" label="间隔倍数" width="100">
          <template #default="{ row }">
            {{ row.multiplier }}x
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editPriority(row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="deletePriority">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 轮询状态监控 -->
    <el-card class="config-section">
      <template #header>
        <div class="section-header">
          <span>轮询状态监控</span>
          <el-button size="small" @click="refreshStatus">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col :span="6">
          <el-statistic title="活跃轮询任务" :value="status.activeTasks" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="平均轮询间隔" :value="status.avgInterval" suffix="秒" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="成功率" :value="status.successRate" suffix="%" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="系统负载" :value="status.systemLoad" suffix="%" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 添加优先级规则对话框 -->
    <el-dialog v-model="showAddPriorityDialog" title="添加优先级规则" width="500px">
      <el-form :model="priorityForm" label-width="100px">
        <el-form-item label="设备类型">
          <el-select v-model="priorityForm.deviceType" placeholder="请选择设备类型">
            <el-option label="温度传感器" value="temperature" />
            <el-option label="湿度传感器" value="humidity" />
            <el-option label="压力传感器" value="pressure" />
            <el-option label="流量传感器" value="flow" />
            <el-option label="液位传感器" value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="priorityForm.location" placeholder="请输入设备位置" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="priorityForm.priority" placeholder="请选择优先级">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="间隔倍数">
          <el-input-number
            v-model="priorityForm.multiplier"
            :min="0.1"
            :max="5"
            :step="0.1"
            :precision="1"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="priorityForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入规则描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddPriorityDialog = false">取消</el-button>
        <el-button type="primary" @click="savePriority">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, RefreshRight, Plus, Refresh } from '@element-plus/icons-vue'
import { usePollingStore } from '../stores/polling'
import { useSensorStore } from '../stores/sensor'

interface DevicePriority {
  deviceType: string
  location: string
  priority: string
  multiplier: number
  description: string
}

interface PriorityForm extends Partial<DevicePriority> {
  index?: number
}

const pollingStore = usePollingStore()
const sensorStore = useSensorStore()

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

const config = computed({
  get: () => {
    ensureWeights()

    return {
      aiPollingEnabled: pollingStore.config.enabled,
      defaultInterval: pollingStore.config.baseInterval,
      minInterval: pollingStore.config.minInterval,
      maxInterval: pollingStore.config.maxInterval,
      maxConcurrent: 50,
      weights: {
        variability: Math.round((pollingStore.config.weights?.variability ?? 0) * 100),
        priority: Math.round((pollingStore.config.weights?.priority ?? 0) * 100),
        anomaly: Math.round((pollingStore.config.weights?.anomaly ?? 0) * 100),
        systemLoad: Math.round((pollingStore.config.weights?.systemLoad ?? 0) * 100)
      }
    }
  },
  set: (value) => {
    ensureWeights()
    pollingStore.config.enabled = value.aiPollingEnabled
    pollingStore.config.baseInterval = value.defaultInterval
    pollingStore.config.minInterval = value.minInterval
    pollingStore.config.maxInterval = value.maxInterval
    pollingStore.config.weights = {
      variability: value.weights.variability / 100,
      priority: value.weights.priority / 100,
      anomaly: value.weights.anomaly / 100,
      systemLoad: value.weights.systemLoad / 100
    }
  }
})

const status = computed(() => {
  const metrics = pollingStore.getTaskMetrics()
  return {
    activeTasks: pollingStore.pollingStatus.activeTasks,
    avgInterval: pollingStore.pollingStatus.averageInterval,
    successRate: Number(metrics.successRate.toFixed(1)),
    systemLoad: Number(pollingStore.pollingStatus.systemLoad.toFixed(1))
  }
})

const priorityRules = computed<DevicePriority[]>(() => {
  return sensorStore.sensors.map(sensor => ({
    deviceType: sensor.type,
    location: sensor.location,
    priority: sensor.priority,
    multiplier: sensor.priority === 'critical' ? 0.5 : sensor.priority === 'high' ? 0.8 : sensor.priority === 'medium' ? 1 : 1.2,
    description: `${sensor.name} (${sensor.id})`
  }))
})

const showAddPriorityDialog = ref(false)
const priorityForm = ref<PriorityForm>({
  deviceType: '',
  location: '',
  priority: '',
  multiplier: 1.0,
  description: ''
})

const totalWeight = computed(() => {
  const weights = config.value.weights
  return weights.variability + weights.priority + weights.anomaly + weights.systemLoad
})

const getPriorityType = (priority: string) => {
  const typeMap: Record<string, string> = {
    critical: 'danger',
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return typeMap[priority] || 'info'
}

const getPriorityName = (priority: string) => {
  const nameMap: Record<string, string> = {
    critical: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return nameMap[priority] || priority
}

const handleAIPollingToggle = async (enabled: boolean) => {
  try {
    if (enabled) {
      await pollingStore.startPollingService()
      ElMessage.success('AI智能轮询已启用')
    } else {
      await pollingStore.stopPollingService()
      ElMessage.info('已切换到固定轮询模式')
    }

    await pollingStore.updatePollingConfig({ enabled })
  } catch {
    config.value = { ...config.value, aiPollingEnabled: !enabled }
    ElMessage.error('切换轮询模式失败')
  }
}

const saveConfig = async () => {
  if (config.value.aiPollingEnabled && totalWeight.value !== 100) {
    ElMessage.warning('AI算法权重总和应为100%，请调整权重配置')
    return
  }

  try {
    await pollingStore.updatePollingConfig({
      enabled: config.value.aiPollingEnabled,
      baseInterval: config.value.defaultInterval,
      minInterval: config.value.minInterval,
      maxInterval: config.value.maxInterval,
      weights: {
        variability: config.value.weights.variability / 100,
        priority: config.value.weights.priority / 100,
        anomaly: config.value.weights.anomaly / 100,
        systemLoad: config.value.weights.systemLoad / 100
      }
    })
    ElMessage.success('轮询配置保存成功')
  } catch {
    ElMessage.error('轮询配置保存失败')
  }
}

const resetConfig = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有配置吗？这将恢复到默认设置。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

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

    ElMessage.success('配置已重置为默认值')
  } catch {
    // 用户取消重置
  }
}

const editPriority = (row: DevicePriority) => {
  priorityForm.value = { ...row }
  showAddPriorityDialog.value = true
}

const deletePriority = async () => {
  await ElMessageBox.alert('设备优先级来自实时传感器数据，请在设备列表中调整优先级。', '提示', {
    confirmButtonText: '知道了'
  })
}

const savePriority = async () => {
  if (!priorityForm.value.description) {
    ElMessage.warning('请在设备列表中维护真实设备优先级')
    return
  }

  const sensorIdMatch = priorityForm.value.description.match(/\(([^)]+)\)$/)
  const sensorId = sensorIdMatch?.[1]

  if (!sensorId || !priorityForm.value.priority) {
    ElMessage.warning('未找到对应设备，请在设备列表中调整优先级')
    return
  }

  sensorStore.updateSensor(sensorId, { priority: priorityForm.value.priority as any })
  showAddPriorityDialog.value = false
  ElMessage.success('设备优先级更新成功')
}

const refreshStatus = async () => {
  await Promise.all([
    pollingStore.fetchTasks(),
    sensorStore.fetchSensors()
  ])
  ElMessage.success('状态信息已刷新')
}

const initializeData = async () => {
  await Promise.all([
    pollingStore.fetchTasks(),
    sensorStore.fetchSensors()
  ])
}

onMounted(() => {
  void initializeData()
})
</script>

<style scoped>
.polling-config-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.config-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.unit-text {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.weight-desc {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style>