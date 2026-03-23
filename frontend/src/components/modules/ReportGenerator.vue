<template>
  <div class="report-generator">
    <!-- 报告类型选择 -->
    <div class="report-types">
      <el-select v-model="selectedReportType" placeholder="选择报告类型" size="small">
        <el-option
          v-for="type in reportTypes"
          :key="type.value"
          :label="type.label"
          :value="type.value"
        >
          <div class="report-option">
            <el-icon><component :is="type.icon" /></el-icon>
            <span>{{ type.label }}</span>
          </div>
        </el-option>
      </el-select>
    </div>

    <!-- 报告配置 -->
    <div class="report-config" v-if="selectedReportType">
      <el-form :model="reportConfig" size="small" label-position="top">
        <!-- 时间范围 -->
        <el-form-item label="时间范围">
          <el-select v-model="reportConfig.timeRange" style="width: 100%">
            <el-option label="最近1小时" value="1h" />
            <el-option label="最近6小时" value="6h" />
            <el-option label="最近24小时" value="24h" />
            <el-option label="最近7天" value="7d" />
            <el-option label="最近30天" value="30d" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>

        <!-- 自定义时间范围 -->
        <el-form-item v-if="reportConfig.timeRange === 'custom'" label="自定义时间">
          <el-date-picker
            v-model="reportConfig.customTimeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            size="small"
            style="width: 100%"
          />
        </el-form-item>

        <!-- 设备筛选 -->
        <el-form-item label="设备筛选">
          <el-select
            v-model="reportConfig.deviceFilter"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择设备"
            style="width: 100%"
          >
            <el-option
              v-for="device in availableDevices"
              :key="device.id"
              :label="device.name"
              :value="device.id"
            />
          </el-select>
        </el-form-item>

        <!-- 报告格式 -->
        <el-form-item label="导出格式">
          <el-radio-group v-model="reportConfig.format">
            <el-radio label="pdf">PDF</el-radio>
            <el-radio label="excel">Excel</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 包含内容 -->
        <el-form-item label="包含内容">
          <el-checkbox-group v-model="reportConfig.includeContent">
            <el-checkbox label="summary">概要统计</el-checkbox>
            <el-checkbox label="charts">图表分析</el-checkbox>
            <el-checkbox label="details">详细数据</el-checkbox>
            <el-checkbox label="alerts">告警记录</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
    </div>

    <!-- 生成按钮 -->
    <div class="generate-actions" v-if="selectedReportType">
      <el-button
        type="primary"
        size="small"
        :loading="isGenerating"
        @click="generateReport"
        style="width: 100%"
      >
        <el-icon><Document /></el-icon>
        生成报告
      </el-button>
    </div>

    <!-- 报告历史 -->
    <div class="report-history" v-if="reportHistory.length > 0">
      <el-divider content-position="left">
        <span class="history-title">报告历史</span>
      </el-divider>
      <div class="history-list">
        <div
          v-for="report in reportHistory.slice(0, 5)"
          :key="report.id"
          class="history-item"
        >
          <div class="report-info">
            <div class="report-name">{{ report.name }}</div>
            <div class="report-meta">
              <span class="report-time">{{ formatTime(report.createdAt) }}</span>
              <el-tag :type="getReportTypeColor(report.type)" size="small">
                {{ getReportTypeName(report.type) }}
              </el-tag>
            </div>
          </div>
          <div class="report-actions">
            <el-button
              size="small"
              text
              @click="downloadReport(report)"
              :loading="downloadingReport === report.id"
            >
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click="deleteReport(report.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速报告 -->
    <div class="quick-reports">
      <el-divider content-position="left">
        <span class="quick-title">快速报告</span>
      </el-divider>
      <div class="quick-buttons">
        <el-button
          v-for="quick in quickReports"
          :key="quick.id"
          size="small"
          :type="quick.type"
          plain
          @click="generateQuickReport(quick)"
          :loading="generatingQuick === quick.id"
        >
          <el-icon><component :is="quick.icon" /></el-icon>
          {{ quick.label }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  Document,
  Download,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface ReportType {
  value: string
  label: string
  icon: string
}

interface Device {
  id: string
  name: string
}

interface ReportHistory {
  id: string
  name: string
  type: string
  createdAt: number
  format: string
  size: string
}

interface QuickReport {
  id: string
  label: string
  type: string
  icon: string
  config: any
}

// 报告类型
const reportTypes = ref<ReportType[]>([
  { value: 'device-status', label: '设备状态报告', icon: 'Monitor' },
  { value: 'alarm-analysis', label: '告警分析报告', icon: 'Warning' },
  { value: 'performance', label: '性能监控报告', icon: 'TrendCharts' },
  { value: 'data-analysis', label: '数据分析报告', icon: 'DataAnalysis' }
])

// 选中的报告类型
const selectedReportType = ref('')

// 报告配置
const reportConfig = reactive({
  timeRange: '24h',
  customTimeRange: null as Date[] | null,
  deviceFilter: [] as string[],
  format: 'pdf',
  includeContent: ['summary', 'charts'] as string[]
})

// 可用设备
const availableDevices = ref<Device[]>([
  { id: 'sensor-001', name: '温度传感器-001' },
  { id: 'sensor-002', name: '湿度传感器-002' },
  { id: 'sensor-003', name: '压力传感器-003' },
  { id: 'pump-001', name: '水泵-001' },
  { id: 'valve-001', name: '阀门-001' }
])

// 生成状态
const isGenerating = ref(false)
const downloadingReport = ref<string | null>(null)
const generatingQuick = ref<string | null>(null)

// 报告历史
const reportHistory = ref<ReportHistory[]>([
  {
    id: 'report-001',
    name: '设备状态报告_2024-03-17',
    type: 'device-status',
    createdAt: Date.now() - 3600000,
    format: 'pdf',
    size: '2.3MB'
  },
  {
    id: 'report-002',
    name: '告警分析报告_2024-03-16',
    type: 'alarm-analysis',
    createdAt: Date.now() - 86400000,
    format: 'excel',
    size: '1.8MB'
  }
])

// 快速报告
const quickReports = ref<QuickReport[]>([
  {
    id: 'quick-daily',
    label: '日报',
    type: 'primary',
    icon: 'Document',
    config: { timeRange: '24h', type: 'device-status' }
  },
  {
    id: 'quick-weekly',
    label: '周报',
    type: 'success',
    icon: 'TrendCharts',
    config: { timeRange: '7d', type: 'performance' }
  },
  {
    id: 'quick-alerts',
    label: '告警汇总',
    type: 'warning',
    icon: 'Warning',
    config: { timeRange: '24h', type: 'alarm-analysis' }
  }
])

// 生成报告
const generateReport = async () => {
  if (!selectedReportType.value) {
    ElMessage.warning('请选择报告类型')
    return
  }

  isGenerating.value = true

  try {
    // 模拟报告生成
    await new Promise(resolve => setTimeout(resolve, 3000))

    const reportName = `${getReportTypeName(selectedReportType.value)}_${new Date().toISOString().split('T')[0]}`

    // 添加到历史记录
    const newReport: ReportHistory = {
      id: `report-${Date.now()}`,
      name: reportName,
      type: selectedReportType.value,
      createdAt: Date.now(),
      format: reportConfig.format,
      size: `${(Math.random() * 3 + 1).toFixed(1)}MB`
    }

    reportHistory.value.unshift(newReport)

    ElMessage.success('报告生成成功')

  } catch (error) {
    ElMessage.error('报告生成失败')
  } finally {
    isGenerating.value = false
  }
}

// 生成快速报告
const generateQuickReport = async (quick: QuickReport) => {
  generatingQuick.value = quick.id

  try {
    // 模拟快速报告生成
    await new Promise(resolve => setTimeout(resolve, 2000))

    const reportName = `${quick.label}_${new Date().toISOString().split('T')[0]}`

    const newReport: ReportHistory = {
      id: `report-${Date.now()}`,
      name: reportName,
      type: quick.config.type,
      createdAt: Date.now(),
      format: 'pdf',
      size: `${(Math.random() * 2 + 0.5).toFixed(1)}MB`
    }

    reportHistory.value.unshift(newReport)

    ElMessage.success(`${quick.label}生成成功`)

  } catch (error) {
    ElMessage.error(`${quick.label}生成失败`)
  } finally {
    generatingQuick.value = null
  }
}

// 下载报告
const downloadReport = async (report: ReportHistory) => {
  downloadingReport.value = report.id

  try {
    // 模拟下载
    await new Promise(resolve => setTimeout(resolve, 1500))

    ElMessage.success('下载完成')

  } catch (error) {
    ElMessage.error('下载失败')
  } finally {
    downloadingReport.value = null
  }
}

// 删除报告
const deleteReport = async (reportId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个报告吗？', '确认删除', {
      type: 'warning'
    })

    const index = reportHistory.value.findIndex(r => r.id === reportId)
    if (index > -1) {
      reportHistory.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  } catch {
    // 用户取消删除
  }
}

// 获取报告类型名称
const getReportTypeName = (type: string) => {
  const reportType = reportTypes.value.find(t => t.value === type)
  return reportType ? reportType.label : type
}

// 获取报告类型颜色
const getReportTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    'device-status': 'primary',
    'alarm-analysis': 'warning',
    'performance': 'success',
    'data-analysis': 'info'
  }
  return colorMap[type] || 'info'
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.report-generator {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-types {
  width: 100%;
}

.report-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-config {
  background: var(--el-fill-color-extra-light);
  padding: 12px;
  border-radius: 6px;
}

.report-config :deep(.el-form-item) {
  margin-bottom: 12px;
}

.report-config :deep(.el-form-item__label) {
  font-size: 12px;
  padding-bottom: 4px;
}

.generate-actions {
  display: flex;
  gap: 8px;
}

.history-title,
.quick-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
}

.report-info {
  flex: 1;
  min-width: 0;
}

.report-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.report-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.report-actions {
  display: flex;
  gap: 4px;
}

.quick-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-buttons .el-button {
  justify-content: flex-start;
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .report-generator {
    padding: 4px;
    gap: 12px;
  }

  .report-config {
    padding: 8px;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .report-actions {
    align-self: flex-end;
  }

  .report-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>