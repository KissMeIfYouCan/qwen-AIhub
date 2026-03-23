<template>
  <div class="system-health-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-info">
        <h3>系统健康度</h3>
        <div class="health-status">
          <el-tag :type="getHealthTagType(systemHealth)" size="small">
            {{ getHealthText(systemHealth) }}
          </el-tag>
          <span class="last-update">{{ formatLastUpdate() }}</span>
        </div>
      </div>

      <div class="header-controls">
        <el-button
          size="small"
          @click="refreshHealth"
          :loading="refreshing"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 健康度内容 -->
    <div class="health-content">
      <!-- 健康度评分 -->
      <div class="health-score">
        <el-progress
          type="circle"
          :percentage="systemHealthScore"
          :width="100"
          :color="getHealthColor(systemHealthScore)"
        >
          <template #default="{ percentage }">
            <span class="health-percentage">{{ percentage.toFixed(0) }}%</span>
          </template>
        </el-progress>
      </div>

      <!-- 健康度详情 -->
      <div class="health-details">
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">运行时间</div>
            <div class="detail-value">{{ formatUptime() }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">活跃告警</div>
            <div class="detail-value alarm">{{ activeAlerts.length }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">CPU使用率</div>
            <div class="detail-value">{{ (currentMetrics?.cpu || 0).toFixed(1) }}%</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">内存使用率</div>
            <div class="detail-value">{{ (currentMetrics?.memory || 0).toFixed(1) }}%</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">网络负载</div>
            <div class="detail-value">{{ (currentMetrics?.networkLoad || 0).toFixed(1) }}%</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">API响应</div>
            <div class="detail-value">{{ (currentMetrics?.apiResponseTime || 0).toFixed(0) }}ms</div>
          </div>
        </div>
      </div>

      <!-- 健康度趋势 -->
      <div class="health-trend">
        <div class="trend-header">
          <span>健康度趋势</span>
        </div>
        <div class="trend-chart">
          <div class="trend-line">
            <div
              v-for="(point, index) in healthTrend"
              :key="index"
              class="trend-point"
              :style="{
                left: `${(index / (healthTrend.length - 1)) * 100}%`,
                bottom: `${point}%`,
                backgroundColor: getHealthColor(point)
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Refresh } from '@element-plus/icons-vue'
import { useSystemStore } from '../../stores/system'
import { ElMessage } from 'element-plus'

// Store
const systemStore = useSystemStore()

// 响应式数据
const refreshing = ref(false)
const healthTrend = ref<number[]>([])

// 计算属性
const {
  currentMetrics,
  systemHealth,
  systemHealthScore,
  activeAlerts
} = storeToRefs(systemStore)

// 方法
const refreshHealth = async () => {
  refreshing.value = true
  try {
    // 模拟刷新
    await new Promise(resolve => setTimeout(resolve, 1000))
    updateHealthTrend()
    ElMessage.success('健康度数据已刷新')
  } finally {
    refreshing.value = false
  }
}

const formatLastUpdate = (): string => {
  if (!currentMetrics.value?.timestamp) return '未更新'

  const now = new Date()
  const lastUpdate = new Date(currentMetrics.value.timestamp)
  const diff = now.getTime() - lastUpdate.getTime()

  if (diff < 60000) return '刚刚更新'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  return lastUpdate.toLocaleTimeString('zh-CN')
}

const formatUptime = (): string => {
  // 模拟运行时间
  const uptime = Date.now() - (Date.now() - 3600000 * 24) // 假设运行了24小时
  const hours = Math.floor(uptime / 3600000)
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days > 0) {
    return `${days}天${remainingHours}小时`
  }
  return `${remainingHours}小时`
}

const getHealthColor = (score: number): string => {
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  if (score >= 40) return '#F56C6C'
  return '#F56C6C'
}

const getHealthTagType = (health: string): string => {
  const typeMap: Record<string, string> = {
    good: 'success',
    moderate: 'warning',
    warning: 'warning',
    critical: 'danger',
    unknown: 'info'
  }
  return typeMap[health] || 'info'
}

const getHealthText = (health: string): string => {
  const textMap: Record<string, string> = {
    good: '良好',
    moderate: '一般',
    warning: '告警',
    critical: '严重',
    unknown: '未知'
  }
  return textMap[health] || health
}

const updateHealthTrend = () => {
  // 生成健康度趋势数据
  const trend: number[] = []
  for (let i = 0; i < 20; i++) {
    const baseScore = systemHealthScore.value || 85
    const variation = (Math.random() - 0.5) * 20
    trend.push(Math.max(0, Math.min(100, baseScore + variation)))
  }
  healthTrend.value = trend
}

// 生命周期
onMounted(() => {
  updateHealthTrend()

  // 定期更新趋势数据
  const interval = setInterval(updateHealthTrend, 30000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>

<style scoped>
.system-health-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.health-status {
  display: flex;
  gap: 12px;
  align-items: center;
}

.last-update {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.health-content {
  flex: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.health-score {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.health-details {
  min-width: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-item {
  padding: 12px;
  text-align: left;
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
}

.detail-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-value.alarm {
  color: var(--el-color-danger);
}

.health-trend {
  grid-column: 1 / -1;
  width: 100%;
}

.trend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.trend-chart {
  height: 72px;
  position: relative;
  padding: 8px 10px;
  background: var(--el-fill-color-extra-light);
  border-radius: 10px;
}

.trend-line {
  position: relative;
  height: 100%;
}

.trend-point {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transform: translate(-50%, 50%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-info {
    text-align: center;
  }

  .health-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .health-score {
    justify-content: center;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

@media (max-width: 576px) {
  .system-health-panel {
    padding: 12px;
    gap: 12px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .detail-value {
    font-size: 14px;
  }
}
</style>
