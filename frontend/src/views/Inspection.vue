<template>
  <div class="inspection-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>巡检管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateTaskDialog">
          <el-icon><Plus /></el-icon>
          新建巡检任务
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ pendingTasks }}</div>
              <div class="stat-label">待执行</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon progress">
              <el-icon><Loading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ inProgressTasks }}</div>
              <div class="stat-label">进行中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon completed">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ completedTasks }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon reports">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalReports }}</div>
              <div class="stat-label">巡检报告</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 标签页 -->
    <el-card class="content-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 巡检任务 -->
        <el-tab-pane label="巡检任务" name="tasks">
          <div class="tab-content">
            <!-- 筛选条件 -->
            <el-form :model="taskFilterForm" inline class="filter-form">
              <el-form-item label="任务状态">
                <el-select v-model="taskFilterForm.status" placeholder="请选择状态" clearable>
                  <el-option label="待执行" value="pending" />
                  <el-option label="进行中" value="in_progress" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已取消" value="cancelled" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="filterTasks">查询</el-button>
                <el-button @click="resetTaskFilter">重置</el-button>
              </el-form-item>
            </el-form>

            <!-- 任务列表 -->
            <el-table :data="filteredTasks" v-loading="tasksLoading" style="width: 100%">
              <el-table-column prop="name" label="任务名称" min-width="200">
                <template #default="{ row }">
                  <div class="task-name">
                    <el-icon class="task-icon"><Document /></el-icon>
                    {{ row.name }}
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">
                    {{ getTaskStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="assigned_to" label="执行人" width="120">
                <template #default="{ row }">
                  {{ row.assigned_to || '未分配' }}
                </template>
              </el-table-column>

              <el-table-column prop="scheduled_at" label="计划时间" width="160">
                <template #default="{ row }">
                  {{ formatDateTime(row.scheduled_at) }}
                </template>
              </el-table-column>

              <el-table-column prop="device_ids" label="设备数量" width="100">
                <template #default="{ row }">
                  {{ row.device_ids?.length || 0 }} 台
                </template>
              </el-table-column>

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="viewTask(row)">
                    <el-icon><View /></el-icon>
                    详情
                  </el-button>
                  <el-button
                    v-if="row.status === 'pending'"
                    size="small"
                    type="primary"
                    @click="startTask(row)"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    开始
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 巡检报告 -->
        <el-tab-pane label="巡检报告" name="reports">
          <div class="tab-content">
            <!-- 报告列表 -->
            <el-table :data="inspectionReports" v-loading="reportsLoading" style="width: 100%">
              <el-table-column prop="task_name" label="任务名称" min-width="150" />
              <el-table-column prop="device_name" label="设备名称" min-width="150" />
              <el-table-column prop="inspector" label="巡检员" width="120" />

              <el-table-column label="发现问题" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.issues?.length > 0" type="warning" size="small">
                    {{ row.issues.length }} 个
                  </el-tag>
                  <el-tag v-else type="success" size="small">正常</el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="created_at" label="创建时间" width="160">
                <template #default="{ row }">
                  {{ formatDateTime(row.created_at) }}
                </template>
              </el-table-column>

              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="viewReport(row)">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button size="small" type="primary" @click="exportReport(row)">
                    <el-icon><Download /></el-icon>
                    导出
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 任务详情对话框 -->
    <el-dialog v-model="taskDetailVisible" title="巡检任务详情" width="700px">
      <div v-if="selectedTask" class="task-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务名称" :span="2">{{ selectedTask.name }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <el-tag :type="getTaskStatusType(selectedTask.status)">
              {{ getTaskStatusText(selectedTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行人">{{ selectedTask.assigned_to || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="计划时间" :span="2">{{ formatDateTime(selectedTask.scheduled_at) }}</el-descriptions-item>
          <el-descriptions-item label="任务描述" :span="2">{{ selectedTask.description }}</el-descriptions-item>
        </el-descriptions>

        <div class="devices-section">
          <h4>巡检设备</h4>
          <el-table :data="taskDevices" size="small">
            <el-table-column prop="name" label="设备名称" />
            <el-table-column prop="location" label="位置" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="getDeviceStatusType(row.status)" size="small">
                  {{ getDeviceStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="taskDetailVisible = false">关闭</el-button>
        <el-button
          v-if="selectedTask?.status === 'pending'"
          type="primary"
          @click="startTask(selectedTask)"
        >
          开始执行
        </el-button>
      </template>
    </el-dialog>

    <!-- 报告详情对话框 -->
    <el-dialog v-model="reportDetailVisible" title="巡检报告详情" width="800px">
      <div v-if="selectedReport" class="report-detail">
        <el-descriptions :column="2" border class="detail-section">
          <el-descriptions-item label="任务名称">{{ selectedReport.task_name }}</el-descriptions-item>
          <el-descriptions-item label="设备名称">{{ selectedReport.device_name }}</el-descriptions-item>
          <el-descriptions-item label="巡检员">{{ selectedReport.inspector }}</el-descriptions-item>
          <el-descriptions-item label="巡检时间">{{ formatDateTime(selectedReport.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section" v-if="selectedReport.findings?.length">
          <h4>巡检发现</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(finding, index) in selectedReport.findings"
              :key="index"
              :icon="CircleCheck"
              type="success"
            >
              {{ finding }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="detail-section" v-if="selectedReport.issues?.length">
          <h4>发现问题</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(issue, index) in selectedReport.issues"
              :key="index"
              :icon="WarningFilled"
              type="warning"
            >
              {{ issue }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="detail-section" v-if="selectedReport.recommendations?.length">
          <h4>处理建议</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(recommendation, index) in selectedReport.recommendations"
              :key="index"
              :icon="Tools"
              type="primary"
            >
              {{ recommendation }}
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>

      <template #footer>
        <el-button @click="reportDetailVisible = false">关闭</el-button>
        <el-button type="primary" @click="selectedReport && exportReport(selectedReport)">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { inspectionApi } from '@/api'
import { ElMessage } from 'element-plus'
import { CircleCheck, WarningFilled, Tools } from '@element-plus/icons-vue'
import type { InspectionTask, InspectionReport, Device } from '@/types'

const appStore = useAppStore()
const { devices } = storeToRefs(appStore)

// 标签页
const activeTab = ref('tasks')

// 任务相关
const inspectionTasks = ref<InspectionTask[]>([])
const tasksLoading = ref(false)
const taskFilterForm = ref({
  status: ''
})

// 报告相关
const inspectionReports = ref<InspectionReport[]>([])
const reportsLoading = ref(false)

// 对话框
const taskDetailVisible = ref(false)
const selectedTask = ref<InspectionTask | null>(null)
const reportDetailVisible = ref(false)
const selectedReport = ref<InspectionReport | null>(null)

// 统计数据
const pendingTasks = computed(() => inspectionTasks.value.filter(t => t.status === 'pending').length)
const inProgressTasks = computed(() => inspectionTasks.value.filter(t => t.status === 'in_progress').length)
const completedTasks = computed(() => inspectionTasks.value.filter(t => t.status === 'completed').length)
const totalReports = computed(() => inspectionReports.value.length)

// 筛选后的任务列表
const filteredTasks = computed(() => {
  let result = inspectionTasks.value

  if (taskFilterForm.value.status) {
    result = result.filter(task => task.status === taskFilterForm.value.status)
  }

  return result
})

// 任务关联的设备
const taskDevices = computed(() => {
  if (!selectedTask.value) return []

  return selectedTask.value.device_ids
    .map(deviceId => devices.value.find(d => d.id === deviceId))
    .filter(Boolean) as Device[]
})

// 工具函数
const getTaskStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }
  return typeMap[status] || 'info'
}

const getTaskStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待执行',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

const getDeviceStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    online: 'success',
    offline: 'info',
    fault: 'danger',
    maintenance: 'warning'
  }
  return typeMap[status] || 'info'
}

const getDeviceStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    fault: '故障',
    maintenance: '维护'
  }
  return textMap[status] || status
}

const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString()
}

// 事件处理
const handleTabChange = (tabName: string) => {
  if (tabName === 'reports' && inspectionReports.value.length === 0) {
    loadReports()
  }
}

const showCreateTaskDialog = () => {
  ElMessage.info('新建巡检任务功能开发中...')
}

const filterTasks = () => {
  ElMessage.success('筛选完成')
}

const resetTaskFilter = () => {
  taskFilterForm.value = {
    status: ''
  }
}

const viewTask = (task: InspectionTask) => {
  selectedTask.value = task
  taskDetailVisible.value = true
}

const startTask = (task: InspectionTask) => {
  // 模拟开始任务
  const index = inspectionTasks.value.findIndex(t => t.id === task.id)
  if (index !== -1) {
    inspectionTasks.value[index].status = 'in_progress'
    inspectionTasks.value[index].started_at = new Date().toISOString()
  }

  ElMessage.success('巡检任务已开始')
  taskDetailVisible.value = false
}

const viewReport = (report: InspectionReport) => {
  selectedReport.value = report
  reportDetailVisible.value = true
}

const exportReport = (report: InspectionReport | null) => {
  if (!report) return

  // 模拟导出功能
  const reportContent = `
巡检报告
========

任务名称: ${report.task_name}
设备名称: ${report.device_name}
巡检员: ${report.inspector}
巡检时间: ${formatDateTime(report.created_at)}

巡检发现:
${report.findings?.map((f, i) => `${i + 1}. ${f}`).join('\n') || '无'}

发现问题:
${report.issues?.map((i, idx) => `${idx + 1}. ${i}`).join('\n') || '无'}

处理建议:
${report.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || '无'}
  `

  // 创建下载链接
  const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `巡检报告_${report.device_name}_${new Date().toISOString().split('T')[0]}.txt`
  link.click()
  URL.revokeObjectURL(url)

  ElMessage.success('报告导出成功')
  reportDetailVisible.value = false
}

// 数据加载
const loadTasks = async () => {
  tasksLoading.value = true
  try {
    const { data } = await inspectionApi.getTasks()
    inspectionTasks.value = data.tasks || []
  } catch (error) {
    console.error('获取巡检任务失败:', error)
  } finally {
    tasksLoading.value = false
  }
}

const loadReports = async () => {
  reportsLoading.value = true
  try {
    const { data } = await inspectionApi.getReports()
    inspectionReports.value = data.reports || []
  } catch (error) {
    console.error('获取巡检报告失败:', error)
  } finally {
    reportsLoading.value = false
  }
}

onMounted(() => {
  // 加载设备列表
  if (devices.value.length === 0) {
    appStore.fetchDevices()
  }

  // 加载巡检任务
  loadTasks()
})
</script>

<style scoped>
.inspection-page {
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
  color: #303133;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 20px;
  color: white;
}

.stat-icon.pending {
  background: #909399;
}

.stat-icon.progress {
  background: #E6A23C;
}

.stat-icon.completed {
  background: #67C23A;
}

.stat-icon.reports {
  background: #409EFF;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.content-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.tab-content {
  padding: 20px 0;
}

.filter-form {
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.task-name {
  display: flex;
  align-items: center;
}

.task-icon {
  margin-right: 8px;
  color: #409EFF;
}

.task-detail,
.report-detail {
  padding: 20px 0;
}

.devices-section,
.detail-section {
  margin-top: 20px;
}

.devices-section h4,
.detail-section h4 {
  margin-bottom: 10px;
  color: #303133;
  font-size: 16px;
}

:deep(.el-timeline-item__content) {
  padding-bottom: 10px;
}
</style>