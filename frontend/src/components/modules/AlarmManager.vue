<template>
  <div class="alarm-manager">
    <!-- 告警统计概览 -->
    <div class="alarm-overview">
      <div class="overview-grid">
        <div class="overview-item critical">
          <div class="overview-count">{{ alarmStats.critical }}</div>
          <div class="overview-label">紧急</div>
        </div>
        <div class="overview-item high">
          <div class="overview-count">{{ alarmStats.high }}</div>
          <div class="overview-label">高级</div>
        </div>
        <div class="overview-item medium">
          <div class="overview-count">{{ alarmStats.medium }}</div>
          <div class="overview-label">中级</div>
        </div>
        <div class="overview-item low">
          <div class="overview-count">{{ alarmStats.low }}</div>
          <div class="overview-label">低级</div>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <el-divider content-position="left">
        <span class="section-title">快速操作</span>
      </el-divider>

      <div class="action-buttons">
        <el-button
          size="small"
          type="danger"
          :disabled="selectedAlarms.length === 0"
          @click="batchAcknowledge"
          :loading="batchProcessing"
        >
          <el-icon><Check /></el-icon>
          批量确认 ({{ selectedAlarms.length }})
        </el-button>

        <el-button
          size="small"
          type="warning"
          :disabled="selectedAlarms.length === 0"
          @click="batchMute"
          :loading="batchProcessing"
        >
          <el-icon><Mute /></el-icon>
          批量静音
        </el-button>

        <el-button
          size="small"
          type="info"
          @click="refreshAlarms"
          :loading="refreshing"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 告警列表 -->
    <div class="alarm-list">
      <el-divider content-position="left">
        <span class="section-title">最新告警</span>
      </el-divider>

      <!-- 筛选器 -->
      <div class="alarm-filters">
        <el-select
          v-model="filterLevel"
          size="small"
          placeholder="告警级别"
          clearable
          style="width: 100%"
        >
          <el-option label="紧急" value="critical" />
          <el-option label="高级" value="high" />
          <el-option label="中级" value="medium" />
          <el-option label="低级" value="low" />
        </el-select>
      </div>

      <!-- 告警项目 -->
      <div class="alarm-items">
        <div
          v-for="alarm in filteredAlarms"
          :key="alarm.id"
          class="alarm-item"
          :class="[alarm.level, { selected: selectedAlarms.includes(alarm.id) }]"
          @click="toggleAlarmSelection(alarm.id)"
        >
          <div class="alarm-header">
            <el-checkbox
              :model-value="selectedAlarms.includes(alarm.id)"
              @change="toggleAlarmSelection(alarm.id)"
              @click.stop
            />
            <el-tag :type="getAlarmTypeColor(alarm.level)" size="small">
              {{ getAlarmLevelText(alarm.level) }}
            </el-tag>
            <span class="alarm-time">{{ formatTime(alarm.timestamp) }}</span>
          </div>

          <div class="alarm-content">
            <div class="alarm-title">{{ alarm.title }}</div>
            <div class="alarm-device">{{ alarm.deviceName }}</div>
          </div>

          <div class="alarm-actions">
            <el-button
              size="small"
              text
              @click.stop="acknowledgeAlarm(alarm.id)"
              :loading="processingAlarm === alarm.id"
              v-if="!alarm.acknowledged"
            >
              <el-icon><Check /></el-icon>
            </el-button>
            <el-button
              size="small"
              text
              @click.stop="muteAlarm(alarm.id)"
              :loading="processingAlarm === alarm.id"
              v-if="!alarm.muted"
            >
              <el-icon><Mute /></el-icon>
            </el-button>
            <el-button
              size="small"
              text
              @click.stop="viewAlarmDetails(alarm)"
            >
              <el-icon><View /></el-icon>
            </el-button>
          </div>
        </div>

        <div v-if="filteredAlarms.length === 0" class="no-alarms">
          <el-empty description="暂无告警" :image-size="60" />
        </div>
      </div>
    </div>

    <!-- 告警规则配置 -->
    <div class="alarm-rules">
      <el-divider content-position="left">
        <span class="section-title">告警规则</span>
      </el-divider>

      <div class="rule-actions">
        <el-button
          size="small"
          type="primary"
          plain
          @click="showRuleDialog = true"
        >
          <el-icon><Plus /></el-icon>
          添加规则
        </el-button>
        <el-button
          size="small"
          @click="manageRules"
        >
          <el-icon><Setting /></el-icon>
          管理规则
        </el-button>
      </div>

      <!-- 活跃规则列表 -->
      <div class="active-rules">
        <div
          v-for="rule in activeRules.slice(0, 3)"
          :key="rule.id"
          class="rule-item"
        >
          <div class="rule-info">
            <div class="rule-name">{{ rule.name }}</div>
            <div class="rule-condition">{{ rule.condition }}</div>
          </div>
          <el-switch
            v-model="rule.enabled"
            size="small"
            @change="toggleRule(rule.id, rule.enabled)"
          />
        </div>
      </div>
    </div>

    <!-- 告警详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="告警详情"
      width="400px"
    >
      <div v-if="selectedAlarmDetail" class="alarm-detail">
        <el-descriptions :column="1" size="small">
          <el-descriptions-item label="告警级别">
            <el-tag :type="getAlarmTypeColor(selectedAlarmDetail.level)">
              {{ getAlarmLevelText(selectedAlarmDetail.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">
            {{ selectedAlarmDetail.deviceName }}
          </el-descriptions-item>
          <el-descriptions-item label="告警时间">
            {{ formatFullTime(selectedAlarmDetail.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="告警描述">
            {{ selectedAlarmDetail.description }}
          </el-descriptions-item>
          <el-descriptions-item label="当前值">
            {{ selectedAlarmDetail.currentValue }}
          </el-descriptions-item>
          <el-descriptions-item label="阈值">
            {{ selectedAlarmDetail.threshold }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 添加规则对话框 -->
    <el-dialog
      v-model="showRuleDialog"
      title="添加告警规则"
      width="400px"
    >
      <el-form :model="newRule" label-width="80px" size="small">
        <el-form-item label="规则名称">
          <el-input v-model="newRule.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="newRule.deviceType" placeholder="选择设备类型">
            <el-option label="温度传感器" value="temperature" />
            <el-option label="湿度传感器" value="humidity" />
            <el-option label="压力传感器" value="pressure" />
            <el-option label="水泵" value="pump" />
            <el-option label="阀门" value="valve" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警条件">
          <el-input v-model="newRule.condition" placeholder="例如: 温度 > 80°C" />
        </el-form-item>
        <el-form-item label="告警级别">
          <el-select v-model="newRule.level">
            <el-option label="低级" value="low" />
            <el-option label="中级" value="medium" />
            <el-option label="高级" value="high" />
            <el-option label="紧急" value="critical" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRuleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  Check,
  Mute,
  Refresh,
  View,
  Plus,
  Setting
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface Alarm {
  id: string
  title: string
  description: string
  level: 'low' | 'medium' | 'high' | 'critical'
  deviceName: string
  timestamp: number
  acknowledged: boolean
  muted: boolean
  currentValue: string
  threshold: string
}

interface AlarmRule {
  id: string
  name: string
  deviceType: string
  condition: string
  level: string
  enabled: boolean
}

// 告警统计
const alarmStats = ref({
  critical: 2,
  high: 5,
  medium: 8,
  low: 12
})

// 选中的告警
const selectedAlarms = ref<string[]>([])

// 处理状态
const batchProcessing = ref(false)
const refreshing = ref(false)
const processingAlarm = ref<string | null>(null)

// 筛选级别
const filterLevel = ref('')

// 告警列表
const alarms = ref<Alarm[]>([
  {
    id: 'alarm-001',
    title: '温度超出正常范围',
    description: '设备温度持续超过阈值，可能影响正常运行',
    level: 'critical',
    deviceName: '温度传感器-001',
    timestamp: Date.now() - 300000,
    acknowledged: false,
    muted: false,
    currentValue: '85.2°C',
    threshold: '80°C'
  },
  {
    id: 'alarm-002',
    title: '湿度异常',
    description: '环境湿度过高，需要检查通风系统',
    level: 'high',
    deviceName: '湿度传感器-002',
    timestamp: Date.now() - 600000,
    acknowledged: false,
    muted: false,
    currentValue: '78%',
    threshold: '70%'
  },
  {
    id: 'alarm-003',
    title: '压力波动',
    description: '系统压力出现异常波动',
    level: 'medium',
    deviceName: '压力传感器-003',
    timestamp: Date.now() - 900000,
    acknowledged: true,
    muted: false,
    currentValue: '2.8 bar',
    threshold: '3.0 bar'
  }
])

// 活跃规则
const activeRules = ref<AlarmRule[]>([
  {
    id: 'rule-001',
    name: '高温告警',
    deviceType: 'temperature',
    condition: '温度 > 80°C',
    level: 'critical',
    enabled: true
  },
  {
    id: 'rule-002',
    name: '湿度告警',
    deviceType: 'humidity',
    condition: '湿度 > 70%',
    level: 'high',
    enabled: true
  },
  {
    id: 'rule-003',
    name: '压力告警',
    deviceType: 'pressure',
    condition: '压力 < 2.5 bar',
    level: 'medium',
    enabled: false
  }
])

// 对话框状态
const showDetailDialog = ref(false)
const showRuleDialog = ref(false)
const selectedAlarmDetail = ref<Alarm | null>(null)

// 新规则表单
const newRule = reactive({
  name: '',
  deviceType: '',
  condition: '',
  level: 'medium'
})

// 筛选后的告警
const filteredAlarms = computed(() => {
  if (!filterLevel.value) {
    return alarms.value
  }
  return alarms.value.filter(alarm => alarm.level === filterLevel.value)
})

// 切换告警选择
const toggleAlarmSelection = (alarmId: string) => {
  const index = selectedAlarms.value.indexOf(alarmId)
  if (index > -1) {
    selectedAlarms.value.splice(index, 1)
  } else {
    selectedAlarms.value.push(alarmId)
  }
}

// 批量确认告警
const batchAcknowledge = async () => {
  if (selectedAlarms.value.length === 0) return

  batchProcessing.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 1500))

    selectedAlarms.value.forEach(alarmId => {
      const alarm = alarms.value.find(a => a.id === alarmId)
      if (alarm) {
        alarm.acknowledged = true
      }
    })

    selectedAlarms.value = []
    ElMessage.success('批量确认成功')

  } catch (error) {
    ElMessage.error('批量确认失败')
  } finally {
    batchProcessing.value = false
  }
}

// 批量静音告警
const batchMute = async () => {
  if (selectedAlarms.value.length === 0) return

  batchProcessing.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 1500))

    selectedAlarms.value.forEach(alarmId => {
      const alarm = alarms.value.find(a => a.id === alarmId)
      if (alarm) {
        alarm.muted = true
      }
    })

    selectedAlarms.value = []
    ElMessage.success('批量静音成功')

  } catch (error) {
    ElMessage.error('批量静音失败')
  } finally {
    batchProcessing.value = false
  }
}

// 刷新告警
const refreshAlarms = async () => {
  refreshing.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟新告警
    const newAlarm: Alarm = {
      id: `alarm-${Date.now()}`,
      title: '新告警事件',
      description: '检测到新的异常情况',
      level: 'medium',
      deviceName: '传感器-' + Math.floor(Math.random() * 100),
      timestamp: Date.now(),
      acknowledged: false,
      muted: false,
      currentValue: '异常值',
      threshold: '正常范围'
    }

    alarms.value.unshift(newAlarm)
    ElMessage.success('告警列表已刷新')

  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 确认单个告警
const acknowledgeAlarm = async (alarmId: string) => {
  processingAlarm.value = alarmId

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const alarm = alarms.value.find(a => a.id === alarmId)
    if (alarm) {
      alarm.acknowledged = true
    }

    ElMessage.success('告警已确认')

  } catch (error) {
    ElMessage.error('确认失败')
  } finally {
    processingAlarm.value = null
  }
}

// 静音单个告警
const muteAlarm = async (alarmId: string) => {
  processingAlarm.value = alarmId

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const alarm = alarms.value.find(a => a.id === alarmId)
    if (alarm) {
      alarm.muted = true
    }

    ElMessage.success('告警已静音')

  } catch (error) {
    ElMessage.error('静音失败')
  } finally {
    processingAlarm.value = null
  }
}

// 查看告警详情
const viewAlarmDetails = (alarm: Alarm) => {
  selectedAlarmDetail.value = alarm
  showDetailDialog.value = true
}

// 切换规则状态
const toggleRule = async (ruleId: string, enabled: boolean) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success(enabled ? '规则已启用' : '规则已禁用')

  } catch (error) {
    // 恢复开关状态
    const rule = activeRules.value.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = !enabled
    }
    ElMessage.error('操作失败')
  }
}

// 管理规则
const manageRules = () => {
  ElMessage.info('跳转到规则管理页面')
}

// 保存新规则
const saveRule = async () => {
  if (!newRule.name || !newRule.deviceType || !newRule.condition) {
    ElMessage.warning('请填写完整的规则信息')
    return
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const rule: AlarmRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      deviceType: newRule.deviceType,
      condition: newRule.condition,
      level: newRule.level,
      enabled: true
    }

    activeRules.value.push(rule)

    // 重置表单
    newRule.name = ''
    newRule.deviceType = ''
    newRule.condition = ''
    newRule.level = 'medium'

    showRuleDialog.value = false
    ElMessage.success('规则添加成功')

  } catch (error) {
    ElMessage.error('规则添加失败')
  }
}

// 获取告警类型颜色
const getAlarmTypeColor = (level: string) => {
  const colorMap: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'primary',
    critical: 'danger'
  }
  return colorMap[level] || 'info'
}

// 获取告警级别文本
const getAlarmLevelText = (level: string) => {
  const textMap: Record<string, string> = {
    low: '低级',
    medium: '中级',
    high: '高级',
    critical: '紧急'
  }
  return textMap[level] || level
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化完整时间
const formatFullTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.alarm-manager {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alarm-overview {
  background: var(--el-fill-color-extra-light);
  padding: 12px;
  border-radius: 6px;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 4px;
}

.overview-item.critical {
  background: rgba(245, 108, 108, 0.1);
  color: var(--el-color-danger);
}

.overview-item.high {
  background: rgba(64, 158, 255, 0.1);
  color: var(--el-color-primary);
}

.overview-item.medium {
  background: rgba(230, 162, 60, 0.1);
  color: var(--el-color-warning);
}

.overview-item.low {
  background: rgba(144, 147, 153, 0.1);
  color: var(--el-color-info);
}

.overview-count {
  font-size: 18px;
  font-weight: bold;
}

.overview-label {
  font-size: 12px;
}

.section-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-buttons .el-button {
  justify-content: flex-start;
  width: 100%;
}

.alarm-filters {
  margin-bottom: 12px;
}

.alarm-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.alarm-item {
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.alarm-item:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-extra-light);
}

.alarm-item.selected {
  border-color: var(--el-color-primary);
  background: rgba(64, 158, 255, 0.1);
}

.alarm-item.critical {
  border-left: 3px solid var(--el-color-danger);
}

.alarm-item.high {
  border-left: 3px solid var(--el-color-primary);
}

.alarm-item.medium {
  border-left: 3px solid var(--el-color-warning);
}

.alarm-item.low {
  border-left: 3px solid var(--el-color-info);
}

.alarm-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.alarm-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-left: auto;
}

.alarm-content {
  margin-bottom: 8px;
}

.alarm-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.alarm-device {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.alarm-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.no-alarms {
  text-align: center;
  padding: 20px;
}

.rule-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.rule-actions .el-button {
  flex: 1;
}

.active-rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
}

.rule-info {
  flex: 1;
  min-width: 0;
}

.rule-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-condition {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alarm-detail :deep(.el-descriptions-item__label) {
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .alarm-manager {
    padding: 4px;
    gap: 12px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .alarm-header {
    flex-wrap: wrap;
    gap: 4px;
  }

  .alarm-time {
    margin-left: 0;
    width: 100%;
  }

  .rule-actions {
    flex-direction: column;
  }

  .rule-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* 滚动条样式 */
.alarm-items::-webkit-scrollbar {
  width: 4px;
}

.alarm-items::-webkit-scrollbar-track {
  background: transparent;
}

.alarm-items::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}

.alarm-items::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}
</style>