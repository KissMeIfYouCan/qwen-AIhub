<template>
  <div class="sensor-trend-chart" :style="{ height: `${height}px` }">
    <v-chart
      ref="chartRef"
      :option="chartOption"
      :init-options="initOptions"
      :style="{ width: '100%', height: '100%' }"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer
])

// Props
interface Props {
  data: Array<{ time: string; value: number }>
  height?: number
  color?: string
  showAxis?: boolean
  showTooltip?: boolean
  smooth?: boolean
  areaStyle?: boolean
  showDataZoom?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 60,
  color: '#409EFF',
  showAxis: false,
  showTooltip: true,
  smooth: true,
  areaStyle: true,
  showDataZoom: false
})

const chartRef = ref()
const initOptions = {
  devicePixelRatio: typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2
}

// 计算图表配置
const chartOption = computed(() => {
  const option: any = {
    grid: {
      left: props.showAxis ? '10%' : '2%',
      right: props.showAxis ? '10%' : '2%',
      top: props.showAxis ? '15%' : '5%',
      bottom: props.showAxis ? '15%' : '5%',
      containLabel: props.showAxis
    },
    xAxis: {
      type: 'category',
      data: props.data.map(item => item.time),
      show: props.showAxis,
      axisLine: {
        show: props.showAxis,
        lineStyle: {
          color: '#E4E7ED'
        }
      },
      axisTick: {
        show: props.showAxis
      },
      axisLabel: {
        show: props.showAxis,
        fontSize: 10,
        color: '#909399'
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      show: props.showAxis,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        show: props.showAxis,
        fontSize: 10,
        color: '#909399'
      },
      splitLine: {
        show: props.showAxis,
        lineStyle: {
          color: '#F2F6FC',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        type: 'line',
        data: props.data.map(item => item.value),
        smooth: props.smooth,
        symbol: 'none',
        lineStyle: {
          color: props.color,
          width: 2
        },
        areaStyle: props.areaStyle ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: `${props.color}40` // 25% 透明度
              },
              {
                offset: 1,
                color: `${props.color}10` // 6% 透明度
              }
            ]
          }
        } : undefined,
        emphasis: {
          focus: 'series'
        }
      }
    ],
    animation: true,
    animationDuration: 300,
    animationEasing: 'cubicOut'
  }

  // 添加提示框
  if (props.showTooltip) {
    option.tooltip = {
      trigger: 'axis',
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'transparent',
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: (params: any) => {
        const param = params[0]
        return `
          <div style="padding: 4px 8px;">
            <div style="margin-bottom: 4px; font-weight: 500;">
              ${param.axisValue}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; background: ${props.color}; border-radius: 50%;"></span>
              <span>数值: ${param.value}</span>
            </div>
          </div>
        `
      },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: props.color,
          width: 1,
          type: 'dashed'
        }
      }
    }
  }

  // 添加数据缩放
  if (props.showDataZoom) {
    option.dataZoom = [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true
      }
    ]
  }

  return option
})
</script>

<style scoped>
.sensor-trend-chart {
  width: 100%;
  position: relative;
  background: transparent;
}

.sensor-trend-chart :deep(.echarts) {
  background: transparent !important;
}

/* 确保图表在容器中正确显示 */
.sensor-trend-chart :deep(canvas) {
  border-radius: 4px;
}
</style>