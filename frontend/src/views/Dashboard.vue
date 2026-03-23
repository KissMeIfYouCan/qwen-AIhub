<template>
  <div class="dashboard">
    <!-- KPI 指标卡片 -->
    <el-row :gutter="20" class="kpi-cards">
      <el-col :span="6">
        <el-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon device">
              <el-icon><Setting /></el-icon>
            </div>
            <div class="kpi-info">
              <div class="kpi-value">{{ systemStatus.totalDevices }}</div>
              <div class="kpi-label">设备总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon online">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="kpi-info">
              <div class="kpi-value">{{ systemStatus.onlineDevices }}</div>
              <div class="kpi-label">在线设备</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon alarm">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="kpi-info">
              <div class="kpi-value">{{ systemStatus.activeAlarms }}</div>
              <div class="kpi-label">活跃告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon critical">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="kpi-info">
              <div class="kpi-value">{{ systemStatus.criticalAlarms }}</div>
              <div class="kpi-label">严重告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表和列表区域 -->
    <el-row :gutter="20" class="content-row">
      <!-- 设备状态分布 -->
      <el-col :span="12">
        <el-card title="设备状态分布">
          <template #header>
            <span>设备状态分布</span>
          </template>
          <div class="chart-container">
            <v-chart :option="deviceStatusChartOption" style="height: 300px;" />
          </div>
        </el-card>
      </el-col>

      <!-- 告警级别分布 -->
      <el-col :span="12">
        <el-card title="告警级别分布">
          <template #header>
            <span>告警级别分布</span>
          </template>
          <div class="chart-container">
            <v-chart :option="alarmLevelChartOption" style="height: 300px;" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近事件 -->
    <el-row :gutter="20" class="content-row">
      <!-- 最近告警 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近告警</span>
              <el-button type="primary" size="small" @click="$router.push('/alarms')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-table :data="recentAlarms" style="width: 100%" max-height="300">
            <el-table-column prop="device_name" label="设备" width="120" />
            <el-table-column prop="title" label="告警内容" />
            <el-table-column prop="level" label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="getAlarmLevelType(row.level)" size="small">
                  {{ getAlarmLevelText(row.level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="occurred_at" label="时间" width="120">
              <template #default="{ row }">
                {{ formatTime(row.occurred_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 设备列表 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>设备状态</span>
              <el-button type="primary" size="small" @click="$router.push('/devices')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-table :data="recentDevices" style="width: 100%" max-height="300">
            <el-table-column prop="name" label="设备名称" />
            <el-table-column prop="location" label="位置" width="120" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="getDeviceStatusType(row.status)" size="small">
                  {{ getDeviceStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useAppStore } from '@/stores'
import { storeToRefs } from 'pinia'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const appStore = useAppStore()

const { devices, alarms, systemStatus } = storeToRefs(appStore)

// 最近告警（取前5条）
const recentAlarms = computed(() => alarms.value.slice(0, 5))

// 最近设备（取前5条）
const recentDevices = computed(() => devices.value.slice(0, 5))

// 设备状态分布图表配置
const deviceStatusChartOption = computed(() => ({
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      name: '设备状态',
      type: 'pie',
      radius: '50%',
      data: [
        { value: devices.value.filter(d => d.status === 'online').length, name: '在线' },
        { value: devices.value.filter(d => d.status === 'offline').length, name: '离线' },
        { value: devices.value.filter(d => d.status === 'fault').length, name: '故障' },
        { value: devices.value.filter(d => d.status === 'maintenance').length, name: '维护' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))

// 告警级别分布图表配置
const alarmLevelChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  xAxis: {
    type: 'category',
    data: ['低级', '中级', '高级', '严重']
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: '告警数量',
      type: 'bar',
      data: [
        alarms.value.filter(a => a.level === 'low').length,
        alarms.value.filter(a => a.level === 'medium').length,
        alarms.value.filter(a => a.level === 'high').length,
        alarms.value.filter(a => a.level === 'critical').length
      ],
      itemStyle: {
        color: function(params: any) {
          const colors = ['#67C23A', '#E6A23C', '#F56C6C', '#F56C6C']
          return colors[params.dataIndex]
        }
      }
    }
  ]
}))

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

const formatTime = (time: string) => {
  return new Date(time).toLocaleTimeString()
}

onMounted(() => {
  appStore.initializeData()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.kpi-cards {
  margin-bottom: 20px;
}

.kpi-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.kpi-content {
  display: flex;
  align-items: center;
}

.kpi-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.kpi-icon.device {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.kpi-icon.online {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.kpi-icon.alarm {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.kpi-icon.critical {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.kpi-info {
  flex: 1;
}

.kpi-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.kpi-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.content-row {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>