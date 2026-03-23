<template>
  <div class="alarms-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>告警管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon critical">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ criticalAlarms }}</div>
              <div class="stat-label">严重告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon high">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ highAlarms }}</div>
              <div class="stat-label">高级告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon medium">
              <el-icon><InfoFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ mediumAlarms }}</div>
              <div class="stat-label">中级告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon low">
              <el-icon><SuccessFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ lowAlarms }}</div>
              <div class="stat-label">低级告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="告警级别">
          <el-select v-model="filterForm.level" placeholder="请选择级别" clearable>
            <el-option label="严重" value="critical" />
            <el-option label="高级" value="high" />
            <el-option label="中级" value="medium" />
            <el-option label="低级" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警状态">
          <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
            <el-option label="活跃" value="active" />
            <el-option label="已确认" value="acknowledged" />
            <el-option label="已解决" value="resolved" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="filterForm.deviceName" placeholder="请输入设备名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 告警列表 -->
    <el-card class="table-card">
      <el-table
        :data="filteredAlarms"
        v-loading="alarmsLoading"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="getAlarmLevelType(row.level)" size="small">
              {{ getAlarmLevelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="device_name" label="设备名称" min-width="150">
          <template #default="{ row }">
            <div class="device-name">
              <el-icon class="device-icon"><Setting /></el-icon>
              {{ row.device_name }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="title" label="告警内容" min-width="200" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getAlarmStatusType(row.status)" size="small">
              {{ getAlarmStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="occurred_at" label="发生时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.occurred_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="acknowledged_by" label="确认人" width="120">
          <template #default="{ row }">
            {{ row.acknowledged_by || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click.stop="viewAlarm(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              size="small"
              type="warning"
              @click.stop="acknowledgeAlarm(row)"
            >
              <el-icon><Check /></el-icon>
              确认
            </el-button>
            <el-button
              v-if="row.status === 'acknowledged'"
              size="small"
              type="success"
              @click.stop="resolveAlarm(row)"
            >
              <el-icon><CircleCheck /></el-icon>
              解决
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 告警详情对话框 -->
    <el-dialog v-model="alarmDetailVisible" title="告警详情" width="600px">
      <div v-if="selectedAlarm" class="alarm-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="告警ID">{{ selectedAlarm.id }}</el-descriptions-item>
          <el-descriptions-item label="告警级别">
            <el-tag :type="getAlarmLevelType(selectedAlarm.level)">
              {{ getAlarmLevelText(selectedAlarm.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">{{ selectedAlarm.device_name }}</el-descriptions-item>
          <el-descriptions-item label="告警状态">
            <el-tag :type="getAlarmStatusType(selectedAlarm.status)">
              {{ getAlarmStatusText(selectedAlarm.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警标题" :span="2">{{ selectedAlarm.title || selectedAlarm.message }}</el-descriptions-item>
          <el-descriptions-item label="告警描述" :span="2">{{ selectedAlarm.description || selectedAlarm.message }}</el-descriptions-item>
          <el-descriptions-item label="发生时间" :span="2">{{ formatDateTime(selectedAlarm.occurred_at || selectedAlarm.timestamp) }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedAlarm.acknowledged_at" label="确认时间" :span="2">
            {{ formatDateTime(selectedAlarm.acknowledged_at) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedAlarm.acknowledged_by" label="确认人" :span="2">
            {{ selectedAlarm.acknowledged_by }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="alarmDetailVisible = false">关闭</el-button>
        <el-button
          v-if="selectedAlarm?.status === 'active'"
          type="warning"
          @click="acknowledgeAlarm(selectedAlarm)"
        >
          确认告警
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { alarmApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AlarmEvent } from '@/types'

const appStore = useAppStore()
const { alarms, alarmsLoading } = storeToRefs(appStore)

// 筛选表单
const filterForm = ref({
  level: '',
  status: '',
  deviceName: ''
})

// 告警详情对话框
const alarmDetailVisible = ref(false)
const selectedAlarm = ref<AlarmEvent | null>(null)

// 统计数据
const criticalAlarms = computed(() => alarms.value.filter(a => a.level === 'critical').length)
const highAlarms = computed(() => alarms.value.filter(a => a.level === 'high').length)
const mediumAlarms = computed(() => alarms.value.filter(a => a.level === 'medium').length)
const lowAlarms = computed(() => alarms.value.filter(a => a.level === 'low').length)

// 筛选后的告警列表
const filteredAlarms = computed(() => {
  let result = alarms.value

  if (filterForm.value.level) {
    result = result.filter(alarm => alarm.level === filterForm.value.level)
  }

  if (filterForm.value.status) {
    result = result.filter(alarm => alarm.status === filterForm.value.status)
  }

  if (filterForm.value.deviceName) {
    result = result.filter(alarm =>
      alarm.device_name.toLowerCase().includes(filterForm.value.deviceName.toLowerCase())
    )
  }

  return result
})

// 工具函数
const getAlarmLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
  }
  return typeMap[level] || 'info'
}

const getAlarmLevelText = (level: string) => {
  const textMap: Record<string, string> = {
    low: '低级',
    medium: '中级',
    high: '高级',
    critical: '严重'
  }
  return textMap[level] || level
}

const getAlarmStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    active: 'danger',
    acknowledged: 'warning',
    resolved: 'success'
  }
  return typeMap[status] || 'info'
}

const getAlarmStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    active: '活跃',
    acknowledged: '已确认',
    resolved: '已解决'
  }
  return textMap[status] || status
}

const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString()
}

// 事件处理
const refreshData = async () => {
  await appStore.fetchAlarms()
  ElMessage.success('数据刷新成功')
}

const handleFilter = () => {
  ElMessage.success('筛选完成')
}

const resetFilter = () => {
  filterForm.value = {
    level: '',
    status: '',
    deviceName: ''
  }
}

const handleRowClick = (row: AlarmEvent) => {
  viewAlarm(row)
}

const viewAlarm = (alarm: AlarmEvent) => {
  selectedAlarm.value = alarm
  alarmDetailVisible.value = true
}

const acknowledgeAlarm = async (alarm: AlarmEvent) => {
  try {
    await ElMessageBox.confirm('确认要确认这个告警吗？', '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await alarmApi.acknowledgeAlarm(alarm.id, '当前用户')

    // 更新本地数据
    const index = alarms.value.findIndex(a => a.id === alarm.id)
    if (index !== -1) {
      alarms.value[index].status = 'acknowledged'
      alarms.value[index].acknowledged_by = '当前用户'
      alarms.value[index].acknowledged_at = new Date().toISOString()
    }

    ElMessage.success('告警确认成功')
    alarmDetailVisible.value = false
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('告警确认失败')
    }
  }
}

const resolveAlarm = async (alarm: AlarmEvent) => {
  try {
    await ElMessageBox.confirm('确认要解决这个告警吗？', '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 模拟解决告警
    const index = alarms.value.findIndex(a => a.id === alarm.id)
    if (index !== -1) {
      alarms.value[index].status = 'resolved'
      alarms.value[index].resolved_at = new Date().toISOString()
    }

    ElMessage.success('告警解决成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('告警解决失败')
    }
  }
}

onMounted(() => {
  if (alarms.value.length === 0) {
    appStore.fetchAlarms()
  }
})
</script>

<style scoped>
.alarms-page {
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

.stat-icon.critical {
  background: #F56C6C;
}

.stat-icon.high {
  background: #E6A23C;
}

.stat-icon.medium {
  background: #409EFF;
}

.stat-icon.low {
  background: #67C23A;
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

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.device-name {
  display: flex;
  align-items: center;
}

.device-icon {
  margin-right: 8px;
  color: #409EFF;
}

.alarm-detail {
  padding: 20px 0;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>