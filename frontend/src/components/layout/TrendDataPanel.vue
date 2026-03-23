<template>
  <div class="trend-data-panel">
    <div class="trend-header">
      <div class="header-info">
        <span class="section-kicker">Trend</span>
        <div>
          <h3>实时数据趋势</h3>
          <p>基于真实传感器历史采样自动刷新，保留时间范围切换与实时开关。</p>
        </div>
      </div>
      <div class="trend-controls">
        <el-tag :type="isActive ? 'success' : 'info'" effect="plain" round>
          {{ isActive ? '实时更新' : '已暂停' }}
        </el-tag>
        <el-select v-model="selectedTimeRange" size="small" class="range-select">
          <el-option label="最近1小时" value="1h" />
          <el-option label="最近6小时" value="6h" />
          <el-option label="最近24小时" value="24h" />
        </el-select>
        <el-button size="small" :type="isActive ? 'warning' : 'primary'" @click="toggleUpdate">
          <el-icon>
            <VideoPause v-if="isActive" />
            <VideoPlay v-else />
          </el-icon>
          {{ isActive ? '暂停' : '开始' }}
        </el-button>
      </div>
    </div>

    <div class="trend-chart-container">
      <v-chart :option="trendChartOption" autoresize class="trend-chart" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { useSensorStore } from '../../stores/sensor'
import { usePollingStore } from '../../stores/polling'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

type TimeRange = '1h' | '6h' | '24h'

const selectedTimeRange = ref<TimeRange>('1h')
const isActive = ref(true)
const sensorStore = useSensorStore()
const pollingStore = usePollingStore()

const rangeDurationMap: Record<TimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000
}

const allHistoryPoints = computed(() => {
  return sensorStore.sensors
    .flatMap(sensor => sensorStore.getSensorHistory(sensor.id))
    .reduce<Array<{ timestamp: number; value: number }>>((points, item) => {
      const value = Number(item.value)
      if (Number.isFinite(value)) {
        points.push({
          timestamp: item.timestamp,
          value
        })
      }
      return points
    }, [])
    .sort((a, b) => a.timestamp - b.timestamp)
})

const filteredHistoryPoints = computed(() => {
  const now = Date.now()
  const duration = rangeDurationMap[selectedTimeRange.value]
  const minTimestamp = now - duration

  const points = allHistoryPoints.value.filter(point => point.timestamp >= minTimestamp)
  if (points.length > 0) {
    return points
  }

  return sensorStore.sensors
    .reduce<Array<{ timestamp: number; value: number }>>((fallback, sensor) => {
      const value = Number(sensor.value)
      if (Number.isFinite(value)) {
        fallback.push({
          timestamp: sensor.timestamp,
          value
        })
      }
      return fallback
    }, [])
    .sort((a, b) => a.timestamp - b.timestamp)
})

const chartSeries = computed(() => {
  return filteredHistoryPoints.value.map(point => [point.timestamp, point.value])
})

const trendChartOption = computed(() => ({
  grid: {
    left: '2%',
    right: '2%',
    bottom: '8%',
    top: '8%',
    containLabel: true
  },
  xAxis: {
    type: 'time',
    boundaryGap: false,
    axisLabel: {
      fontSize: 11,
      color: '#787268',
      formatter: (value: number) => new Date(value).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(84, 73, 42, 0.1)'
      }
    }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      fontSize: 11,
      color: '#787268'
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(84, 73, 42, 0.08)'
      }
    }
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: 'rgba(84, 73, 42, 0.12)',
    textStyle: {
      color: '#24221c'
    },
    formatter: (params: Array<{ value: [number, number] }>) => {
      const point = params[0]?.value
      if (!point) {
        return '暂无数据'
      }

      return `${new Date(point[0]).toLocaleString('zh-CN')}<br/>传感器数据: ${point[1].toFixed(2)}`
    }
  },
  series: [
    {
      name: '传感器数据',
      type: 'line',
      smooth: true,
      showSymbol: chartSeries.value.length <= 60,
      symbol: 'circle',
      symbolSize: 6,
      data: chartSeries.value,
      itemStyle: {
        color: '#4f6fff'
      },
      lineStyle: {
        color: '#4f6fff',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(79, 111, 255, 0.2)' },
            { offset: 1, color: 'rgba(79, 111, 255, 0.02)' }
          ]
        }
      }
    }
  ]
}))

const toggleUpdate = () => {
  isActive.value = !isActive.value
}

let updateInterval: number | undefined

onMounted(async () => {
  await sensorStore.fetchSensors()

  if (!pollingStore.isServiceRunning) {
    await pollingStore.startPollingService()
  }

  updateInterval = window.setInterval(() => {
    if (isActive.value) {
      void sensorStore.fetchSensors()
    }
  }, 30000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.trend-data-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-info h3 {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--app-text);
}

.header-info p {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.trend-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.range-select {
  width: 132px;
}

.trend-chart-container {
  min-height: 260px;
  border: 1px solid var(--app-border-subtle);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(250, 248, 244, 0.92) 100%);
  border-radius: var(--app-radius-md);
  padding: 12px;
}

.trend-chart {
  height: 236px;
}

@media (max-width: 768px) {
  .trend-header {
    flex-direction: column;
  }

  .trend-chart-container {
    min-height: 220px;
  }

  .trend-chart {
    height: 196px;
  }
}
</style>
