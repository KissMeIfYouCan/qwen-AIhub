<template>
  <div class="performance-metrics" :style="{ height: `${height}px` }">
    <v-chart
      :option="chartOption"
      :init-options="initOptions"
      :style="{ width: '100%', height: '100%' }"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { LineChart, BarChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  LineChart,
  BarChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer
])

// Props
interface Props {
  data: Array<{ time: string; value: number }>
  height?: number
  color?: string
  type?: 'cpu' | 'memory' | 'network' | 'api' | 'gauge' | 'bar'
  showAxis?: boolean
  showTooltip?: boolean
  smooth?: boolean
  areaStyle?: boolean
  threshold?: { warning: number; error: number }
  unit?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: 100,
  color: '#409EFF',
  type: 'cpu',
  showAxis: true,
  showTooltip: true,
  smooth: true,
  areaStyle: true,
  unit: '%'
})

const initOptions = {
  devicePixelRatio: typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2
}

// 计算图表配置
const chartOption = computed(() => {
  if (props.type === 'gauge') {
    return createGaugeOption()
  }

  if (props.type === 'bar') {
    return createBarOption()
  }

  return createLineOption()
})

// 创建线图配置
const createLineOption = () => {
  const option: any = {
    grid: {
      left: props.showAxis ? '10%' : '2%',
      right: props.showAxis ? '10%' : '2%',
      top: props.showAxis ? '15%' : '5%',
      bottom: props.showAxis ? '20%' : '5%',
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
        color: '#909399',
        interval: Math.max(0, Math.floor(props.data.length / 5) - 1)
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      show: props.showAxis,
      min: 0,
      max: props.type === 'api' ? undefined : 100,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        show: props.showAxis,
        fontSize: 10,
        color: '#909399',
        formatter: (value: number) => {
          if (props.type === 'api') {
            return `${value}ms`
          }
          return `${value}${props.unit}`
        }
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
                color: `${props.color}40`
              },
              {
                offset: 1,
                color: `${props.color}10`
              }
            ]
          }
        } : undefined,
        markLine: props.threshold ? {
          silent: true,
          lineStyle: {
            color: '#F56C6C',
            type: 'dashed',
            width: 1
          },
          data: [
            {
              yAxis: props.threshold.warning,
              name: '告警线'
            },
            {
              yAxis: props.threshold.error,
              name: '错误线'
            }
          ]
        } : undefined
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
        const value = param.value
        const unit = props.type === 'api' ? 'ms' : props.unit

        let status = '正常'
        if (props.threshold) {
          if (value >= props.threshold.error) {
            status = '错误'
          } else if (value >= props.threshold.warning) {
            status = '告警'
          }
        }

        return `
          <div style="padding: 4px 8px;">
            <div style="margin-bottom: 4px; font-weight: 500;">
              ${param.axisValue}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; background: ${props.color}; border-radius: 50%;"></span>
              <span>${getMetricName()}: ${value}${unit}</span>
            </div>
            <div style="margin-top: 4px; font-size: 11px; color: ${getStatusColor(status)};">
              状态: ${status}
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

  return option
}

// 创建仪表盘配置
const createGaugeOption = () => {
  const currentValue = props.data.length > 0 ? props.data[props.data.length - 1].value : 0

  return {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '90%',
        min: 0,
        max: props.type === 'api' ? Math.max(currentValue * 1.2, 1000) : 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 6,
            color: [
              [0.3, '#67C23A'],
              [0.7, '#E6A23C'],
              [1, '#F56C6C']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5
          }
        },
        axisLabel: {
          color: '#464646',
          fontSize: 10,
          distance: -60,
          formatter: (value: number) => {
            if (props.type === 'api') {
              return `${Math.round(value)}ms`
            }
            return `${Math.round(value)}${props.unit}`
          }
        },
        title: {
          offsetCenter: [0, '-20%'],
          fontSize: 14,
          color: '#464646'
        },
        detail: {
          fontSize: 16,
          offsetCenter: [0, '-35%'],
          valueAnimation: true,
          formatter: (value: number) => {
            const unit = props.type === 'api' ? 'ms' : props.unit
            return `{value|${Math.round(value)}}{unit|${unit}}`
          },
          rich: {
            value: {
              fontSize: 20,
              fontWeight: 'bold',
              color: props.color
            },
            unit: {
              fontSize: 12,
              color: '#999',
              padding: [0, 0, -20, 10]
            }
          }
        },
        data: [
          {
            value: currentValue,
            name: getMetricName()
          }
        ]
      }
    ]
  }
}

// 创建柱状图配置
const createBarOption = () => {
  return {
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.map(item => item.time),
      axisLabel: {
        fontSize: 10,
        color: '#909399',
        interval: Math.max(0, Math.floor(props.data.length / 5) - 1)
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        color: '#909399',
        formatter: (value: number) => {
          if (props.type === 'api') {
            return `${value}ms`
          }
          return `${value}${props.unit}`
        }
      }
    },
    series: [
      {
        type: 'bar',
        data: props.data.map(item => ({
          value: item.value,
          itemStyle: {
            color: getBarColor(item.value)
          }
        })),
        barWidth: '60%'
      }
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const param = params[0]
        const unit = props.type === 'api' ? 'ms' : props.unit
        return `${param.axisValue}<br/>${getMetricName()}: ${param.value}${unit}`
      }
    }
  }
}

// 辅助函数
const getMetricName = (): string => {
  const nameMap: Record<string, string> = {
    cpu: 'CPU使用率',
    memory: '内存使用率',
    network: '网络负载',
    api: 'API响应时间'
  }
  return nameMap[props.type] || '指标'
}

const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    正常: '#67C23A',
    告警: '#E6A23C',
    错误: '#F56C6C'
  }
  return colorMap[status] || '#909399'
}

const getBarColor = (value: number): string => {
  if (props.threshold) {
    if (value >= props.threshold.error) {
      return '#F56C6C'
    } else if (value >= props.threshold.warning) {
      return '#E6A23C'
    }
  }
  return props.color
}
</script>

<style scoped>
.performance-metrics {
  width: 100%;
  position: relative;
  background: transparent;
}

.performance-metrics :deep(.echarts) {
  background: transparent !important;
}
</style>