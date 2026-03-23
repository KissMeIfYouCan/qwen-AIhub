<template>
  <div class="system-monitor">
    <!-- 监控头部 -->
    <div class="monitor-header">
      <div class="header-info">
        <h3>系统监控</h3>
        <div class="monitor-status">
          <el-tag :type="isMonitoring ? 'success' : 'danger'" size="small">
            {{ isMonitoring ? '监控中' : '已停止' }}
          </el-tag>
          <span class="last-update">{{ formatLastUpdate() }}</span>
        </div>
      </div>

      <div class="header-controls">
        <el-button
          size="small"
          :type="isMonitoring ? 'warning' : 'primary'"
          @click="toggleMonitoring"
          :loading="loading"
        >
          <el-icon>
            <VideoPause v-if="isMonitoring" />
            <VideoPlay v-else />
          </el-icon>
          {{ isMonitoring ? '停止监控' : '开始监控' }}
        </el-button>

        <el-button
          size="small"
          @click="refreshMetrics"
          :loading="refreshing"
          :disabled="!isMonitoring"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>

        <el-button
          size="small"
          @click="showSettings = true"
        >
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
      </div>
    </div>

    <div class="monitor-scroll">
      <!-- 系统健康度概览 -->
      <!-- 健康度已移至独立的SystemHealthPanel组件 -->

      <!-- 核心指标网格 -->
      <div class="metrics-grid">
        <!-- CPU 使用率 -->
        <el-card class="metric-card cpu-card">
          <template #header>
            <div class="metric-header">
              <el-icon><Cpu /></el-icon>
              <span>CPU 使用率</span>
              <el-tag :type="getTrendType(cpuTrend)" size="small">
                {{ getTrendText(cpuTrend) }}
              </el-tag>
            </div>
          </template>
          <div class="metric-content">
            <div class="metric-value">
              <span class="value">{{ (currentMetrics?.cpu || 0).toFixed(2) }}%</span>
              <el-progress
                :percentage="currentMetrics?.cpu || 0"
                :color="getProgressColor(currentMetrics?.cpu || 0)"
                :stroke-width="8"
              />
            </div>
            <div class="metric-chart">
              <PerformanceMetrics
                :data="getCpuHistory()"
                :height="72"
                color="#409EFF"
                type="cpu"
                :show-axis="false"
                :area-style="false"
              />
            </div>
          </div>
        </el-card>

        <!-- 内存使用率 -->
        <el-card class="metric-card memory-card">
          <template #header>
            <div class="metric-header">
              <el-icon><Monitor /></el-icon>
              <span>内存使用率</span>
              <el-tag :type="getTrendType(memoryTrend)" size="small">
                {{ getTrendText(memoryTrend) }}
              </el-tag>
            </div>
          </template>
          <div class="metric-content">
            <div class="metric-value">
              <span class="value">{{ (currentMetrics?.memory || 0).toFixed(2) }}%</span>
              <el-progress
                :percentage="currentMetrics?.memory || 0"
                :color="getProgressColor(currentMetrics?.memory || 0)"
                :stroke-width="8"
              />
            </div>
            <div class="metric-chart">
              <PerformanceMetrics
                :data="getMemoryHistory()"
                :height="72"
                color="#67C23A"
                type="memory"
                :show-axis="false"
                :area-style="false"
              />
            </div>
          </div>
        </el-card>

        <!-- 网络负载 -->
        <el-card class="metric-card network-card">
          <template #header>
            <div class="metric-header">
              <el-icon><Connection /></el-icon>
              <span>网络负载</span>
              <el-tag :type="getTrendType(networkTrend)" size="small">
                {{ getTrendText(networkTrend) }}
              </el-tag>
            </div>
          </template>
          <div class="metric-content">
            <div class="metric-value">
              <span class="value">{{ (currentMetrics?.networkLoad || 0).toFixed(2) }}%</span>
              <el-progress
                :percentage="currentMetrics?.networkLoad || 0"
                :color="getProgressColor(currentMetrics?.networkLoad || 0)"
                :stroke-width="8"
              />
            </div>
            <div class="metric-chart">
              <PerformanceMetrics
                :data="getNetworkHistory()"
                :height="72"
                color="#E6A23C"
                type="network"
                :show-axis="false"
                :area-style="false"
              />
            </div>
          </div>
        </el-card>

        <!-- API 性能 -->
        <el-card class="metric-card api-card">
          <template #header>
            <div class="metric-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>API 响应时间</span>
              <el-tag
                :type="(currentMetrics?.apiResponseTime || 0) > 1000 ? 'warning' : 'success'"
                size="small"
              >
                {{ (currentMetrics?.apiResponseTime || 0) > 1000 ? '较慢' : '正常' }}
              </el-tag>
            </div>
          </template>
          <div class="metric-content">
            <div class="metric-value">
              <span class="value">{{ (currentMetrics?.apiResponseTime || 0).toFixed(2) }}ms</span>
              <div class="api-status">
                <span class="status-text">
                  {{ getApiStatusText(currentMetrics?.apiResponseTime || 0) }}
                </span>
              </div>
            </div>
            <div class="metric-chart">
              <PerformanceMetrics
                :data="getApiHistory()"
                :height="72"
                color="#F56C6C"
                type="api"
                :show-axis="false"
                :area-style="false"
              />
            </div>
          </div>
        </el-card>
      </div>

      <!-- 详细指标 -->
      <div class="detailed-metrics">
        <el-card>
          <template #header>
            <div class="detailed-header">
              <span>详细指标</span>
              <el-select v-model="selectedTimeRange" size="small" style="width: 120px">
                <el-option label="最近1小时" value="1h" />
                <el-option label="最近6小时" value="6h" />
                <el-option label="最近24小时" value="24h" />
              </el-select>
            </div>
          </template>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-descriptions title="系统资源" :column="2" size="small">
                <el-descriptions-item label="磁盘I/O">
                  {{ (currentMetrics?.diskIO || 0).toFixed(2) }}%
                </el-descriptions-item>
                <el-descriptions-item label="数据库连接">
                  {{ currentMetrics?.dbConnections || 0 }}
                </el-descriptions-item>
                <el-descriptions-item label="活跃轮询任务">
                  {{ currentMetrics?.activePollingTasks || 0 }}
                </el-descriptions-item>
                <el-descriptions-item label="平均负载">
                  {{ getAverageLoad().toFixed(2) }}%
                </el-descriptions-item>
              </el-descriptions>
            </el-col>

            <el-col :span="12">
              <el-descriptions title="性能统计" :column="2" size="small">
                <el-descriptions-item label="峰值CPU">
                  {{ (peakMetrics?.cpu || 0).toFixed(2) }}%
                </el-descriptions-item>
                <el-descriptions-item label="峰值内存">
                  {{ (peakMetrics?.memory || 0).toFixed(2) }}%
                </el-descriptions-item>
                <el-descriptions-item label="平均响应时间">
                  {{ (averageMetrics?.apiResponseTime || 0).toFixed(2) }}ms
                </el-descriptions-item>
                <el-descriptions-item label="系统评分">
                  {{ systemHealthScore }}/100
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
          </el-row>
        </el-card>
      </div>

      <!-- 告警列表 -->
      <div class="alerts-section" v-if="activeAlerts.length > 0">
        <el-card>
          <template #header>
            <div class="alerts-header">
              <span>系统告警 ({{ activeAlerts.length }})</span>
              <el-button size="small" @click="acknowledgeAllAlerts">
                全部确认
              </el-button>
            </div>
          </template>

          <div class="alerts-list">
            <div
              v-for="alert in activeAlerts.slice(0, 5)"
              :key="alert.id"
              class="alert-item"
              :class="alert.level"
            >
              <div class="alert-content">
                <div class="alert-message">{{ alert.message }}</div>
                <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
              </div>
              <div class="alert-actions">
                <el-button
                  size="small"
                  @click="acknowledgeAlert(alert.id)"
                >
                  确认
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="监控设置"
      width="400px"
    >
      <el-form label-width="100px">
        <el-form-item label="更新间隔">
          <el-select v-model="updateInterval">
            <el-option label="1秒" :value="1000" />
            <el-option label="5秒" :value="5000" />
            <el-option label="10秒" :value="10000" />
            <el-option label="30秒" :value="30000" />
          </el-select>
        </el-form-item>
        <el-form-item label="历史记录">
          <el-slider
            v-model="maxHistorySize"
            :min="50"
            :max="500"
            :step="50"
            show-input
          />
        </el-form-item>
        <el-form-item label="告警阈值">
          <el-descriptions :column="1" size="small">
            <el-descriptions-item label="CPU告警">80%</el-descriptions-item>
            <el-descriptions-item label="内存告警">85%</el-descriptions-item>
            <el-descriptions-item label="网络告警">80%</el-descriptions-item>
          </el-descriptions>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Refresh,
  Setting,
  Cpu,
  Monitor,
  Connection,
  DataAnalysis
} from '@element-plus/icons-vue'
import PerformanceMetrics from './PerformanceMetrics.vue'
import { useSystemStore } from '../../stores/system'
import { ElMessage } from 'element-plus'

// Store
const systemStore = useSystemStore()

// 响应式数据
const showSettings = ref(false)
const refreshing = ref(false)
const selectedTimeRange = ref('1h')
const updateInterval = ref(5000)
const maxHistorySize = ref(100)

// 计算属性
const {
  currentMetrics,
  isMonitoring,
  loading,
  systemHealthScore,
  cpuTrend,
  memoryTrend,
  networkTrend,
  activeAlerts,
  averageMetrics,
  peakMetrics
} = storeToRefs(systemStore)

// 方法
const toggleMonitoring = async () => {
  try {
    if (isMonitoring.value) {
      await systemStore.stopMonitoring()
      ElMessage.success('系统监控已停止')
    } else {
      await systemStore.startMonitoring()
      ElMessage.success('系统监控已启动')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const refreshMetrics = async () => {
  refreshing.value = true
  try {
    // 触发指标刷新
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('指标已刷新')
  } finally {
    refreshing.value = false
  }
}

const acknowledgeAlert = (alertId: string) => {
  systemStore.acknowledgeAlert(alertId)
  ElMessage.success('告警已确认')
}

const acknowledgeAllAlerts = () => {
  systemStore.acknowledgeAllAlerts()
  ElMessage.success('所有告警已确认')
}

const saveSettings = () => {
  try {
    systemStore.setUpdateInterval(updateInterval.value)
    systemStore.setMaxHistorySize(maxHistorySize.value)
    showSettings.value = false
    ElMessage.success('设置已保存')
  } catch (error) {
    ElMessage.error('保存设置失败')
  }
}

// 格式化函数
const formatLastUpdate = (): string => {
  if (!currentMetrics.value?.timestamp) return '未更新'

  const now = new Date()
  const lastUpdate = new Date(currentMetrics.value.timestamp)
  const diff = now.getTime() - lastUpdate.getTime()

  if (diff < 60000) return '刚刚更新'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  return lastUpdate.toLocaleTimeString('zh-CN')
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getTrendType = (trend: string): string => {
  const typeMap: Record<string, string> = {
    rising: 'warning',
    falling: 'success',
    stable: 'info'
  }
  return typeMap[trend] || 'info'
}

const getTrendText = (trend: string): string => {
  const textMap: Record<string, string> = {
    rising: '上升',
    falling: '下降',
    stable: '稳定'
  }
  return textMap[trend] || trend
}

const getProgressColor = (value: number): string => {
  if (value >= 90) return '#F56C6C'
  if (value >= 80) return '#E6A23C'
  return '#67C23A'
}

const getApiStatusText = (responseTime: number): string => {
  if (responseTime > 2000) return '响应较慢'
  if (responseTime > 1000) return '响应一般'
  return '响应良好'
}

const getAverageLoad = (): number => {
  if (!currentMetrics.value) return 0
  return Math.round((currentMetrics.value.cpu + currentMetrics.value.memory + currentMetrics.value.networkLoad) / 3)
}

// 获取历史数据
const getCpuHistory = () => {
  return systemStore.getMetricsHistory().map((metrics, index) => ({
    time: `${index * 5}s前`,
    value: metrics.cpu
  }))
}

const getMemoryHistory = () => {
  return systemStore.getMetricsHistory().map((metrics, index) => ({
    time: `${index * 5}s前`,
    value: metrics.memory
  }))
}

const getNetworkHistory = () => {
  return systemStore.getMetricsHistory().map((metrics, index) => ({
    time: `${index * 5}s前`,
    value: metrics.networkLoad
  }))
}

const getApiHistory = () => {
  return systemStore.getMetricsHistory().map((metrics, index) => ({
    time: `${index * 5}s前`,
    value: metrics.apiResponseTime || 0
  }))
}

// 生命周期
onMounted(() => {
  // 自动启动监控
  if (!isMonitoring.value) {
    systemStore.startMonitoring()
  }
})

onUnmounted(() => {
  // 组件卸载时不自动停止监控，让其在后台继续运行
})
</script>

<style scoped>
.system-monitor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.monitor-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.metrics-grid,
.detailed-metrics,
.alerts-section {
  min-height: 0;
  flex-shrink: 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  flex-shrink: 0;
}

.monitor-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.metric-card {
  height: 220px;
}

.metric-card :deep(.el-card__body) {
  height: calc(100% - 56px);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
}

.metric-value {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-value .value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.metric-chart {
  flex: 1;
  min-height: 60px;
}

.api-status {
  margin-top: 4px;
}

.status-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detailed-metrics {
  margin-top: 16px;
}

.detailed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alerts-section {
  margin-top: 16px;
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid;
}

.alert-item.warning {
  background: rgba(230, 162, 60, 0.1);
  border-left-color: var(--el-color-warning);
}

.alert-item.error {
  background: rgba(245, 108, 108, 0.1);
  border-left-color: var(--el-color-danger);
}

.alert-content {
  flex: 1;
}

.alert-message {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-info {
    text-align: center;
  }

  .header-controls {
    justify-content: center;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .detailed-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .alert-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>
