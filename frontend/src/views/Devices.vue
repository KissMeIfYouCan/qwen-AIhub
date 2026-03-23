<template>
  <div class="devices-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>设备管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="设备状态">
          <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="故障" value="fault" />
            <el-option label="维护" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="filterForm.type" placeholder="请选择类型" clearable>
            <el-option label="水泵" value="pump" />
            <el-option label="阀门" value="valve" />
            <el-option label="传感器" value="sensor" />
            <el-option label="电机" value="motor" />
            <el-option label="控制器" value="controller" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 设备列表 -->
    <el-card class="table-card">
      <el-table
        :data="filteredDevices"
        v-loading="devicesLoading"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="name" label="设备名称" min-width="220">
          <template #default="{ row }">
            <div class="device-name-wrap">
              <div class="device-name">
                <el-icon class="device-icon"><Setting /></el-icon>
                <span>{{ row.name }}</span>
                <el-tag v-if="isRealtimeDevice(row)" size="small" type="success">实时</el-tag>
              </div>
              <span class="device-id">ID: {{ row.id }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="设备类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getDeviceTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="运行状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getDeviceStatusType(row.status)" size="small">
              {{ getDeviceStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="location" label="安装位置" min-width="150" />

        <el-table-column label="关键参数" min-width="200">
          <template #default="{ row }">
            <div class="parameters">
              <span v-for="(value, key) in row.parameters" :key="key" class="param-item">
                {{ key }}: {{ value }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click.stop="viewDevice(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button size="small" type="primary" @click.stop="diagnoseDevice(row)">
              <el-icon><Tools /></el-icon>
              诊断
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 设备详情对话框 -->
    <el-dialog v-model="deviceDetailVisible" title="设备详情" width="600px">
      <div v-loading="deviceDetailLoading" v-if="selectedDevice" class="device-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="设备ID">{{ selectedDevice.id }}</el-descriptions-item>
          <el-descriptions-item label="设备名称">{{ selectedDevice.name }}</el-descriptions-item>
          <el-descriptions-item label="设备类型">{{ getDeviceTypeText(selectedDevice.type) }}</el-descriptions-item>
          <el-descriptions-item label="运行状态">
            <el-tag :type="getDeviceStatusType(selectedDevice.status)">
              {{ getDeviceStatusText(selectedDevice.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="安装位置" :span="2">{{ selectedDevice.location }}</el-descriptions-item>
          <el-descriptions-item label="设备描述" :span="2">{{ selectedDevice.description || '暂无描述' }}</el-descriptions-item>
        </el-descriptions>

        <div class="parameters-section" v-if="selectedDevice.parameters">
          <h4>运行参数</h4>
          <el-table :data="parametersList" size="small">
            <el-table-column prop="key" label="参数名称" />
            <el-table-column prop="value" label="当前值" />
            <el-table-column prop="unit" label="单位" />
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="deviceDetailVisible = false">关闭</el-button>
        <el-button type="primary" @click="selectedDevice && diagnoseDevice(selectedDevice)">
          执行诊断
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { deviceApi } from '@/api'
import type { Device } from '@/types'

const router = useRouter()
const appStore = useAppStore()

const { devices, devicesLoading } = storeToRefs(appStore)

// 筛选表单
const filterForm = ref({
  status: '',
  type: ''
})

// 设备详情对话框
const deviceDetailVisible = ref(false)
const selectedDevice = ref<Device | null>(null)
const deviceDetailLoading = ref(false)

// 筛选后的设备列表
const filteredDevices = computed(() => {
  let result = [...devices.value]

  result.sort((left, right) => {
    if (isRealtimeDevice(left) === isRealtimeDevice(right)) {
      return 0
    }
    return isRealtimeDevice(left) ? -1 : 1
  })

  if (filterForm.value.status) {
    result = result.filter(device => device.status === filterForm.value.status)
  }

  if (filterForm.value.type) {
    result = result.filter(device => device.type === filterForm.value.type)
  }

  return result
})

// 参数列表（用于详情展示）
const parametersList = computed(() => {
  if (!selectedDevice.value?.parameters) return []

  return Object.entries(selectedDevice.value.parameters).map(([key, value]) => ({
    key,
    value,
    unit: getParameterUnit(key)
  }))
})

// 工具函数
const isRealtimeDevice = (device: Device) => !device.id.startsWith('device_')

const getDeviceTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    pump: '水泵',
    valve: '阀门',
    sensor: '传感器',
    motor: '电机',
    controller: '控制器'
  }
  return typeMap[type] || type
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

const getParameterUnit = (key: string) => {
  const unitMap: Record<string, string> = {
    temperature: '°C',
    pressure: 'MPa',
    flow_rate: 'L/min',
    humidity: '%',
    voltage: 'V',
    current: 'A'
  }
  return unitMap[key] || ''
}

const loadDeviceDetail = async (device: Device) => {
  deviceDetailLoading.value = true
  try {
    const response: any = await deviceApi.getDevice(device.id)
    selectedDevice.value = response.device || response.data || device
    deviceDetailVisible.value = true
  } catch (error) {
    selectedDevice.value = device
    deviceDetailVisible.value = true
    ElMessage.warning('设备详情接口获取失败，已展示列表数据')
  } finally {
    deviceDetailLoading.value = false
  }
}

// 事件处理
const refreshData = async () => {
  await appStore.fetchDevices()
  ElMessage.success('数据刷新成功')
}

const handleFilter = () => {
  ElMessage.success('筛选完成')
}

const resetFilter = () => {
  filterForm.value = {
    status: '',
    type: ''
  }
}

const handleRowClick = (row: Device) => {
  viewDevice(row)
}

const viewDevice = async (device: Device) => {
  await loadDeviceDetail(device)
}

const diagnoseDevice = (device: Device | null) => {
  if (device) {
    router.push({
      path: '/diagnosis',
      query: { deviceId: device.id }
    })
  }
}

onMounted(() => {
  if (devices.value.length === 0) {
    appStore.fetchDevices()
  }
})
</script>

<style scoped>
.devices-page {
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

.parameters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.param-item {
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.device-detail {
  padding: 20px 0;
}

.parameters-section {
  margin-top: 20px;
}

.parameters-section h4 {
  margin-bottom: 10px;
  color: #303133;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>