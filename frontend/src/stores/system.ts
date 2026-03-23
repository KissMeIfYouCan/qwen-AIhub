import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SystemMetrics } from '../types'
import { systemMonitorService } from '../services/SystemMonitorService'

/**
 * 系统监控 Store
 */
export const useSystemStore = defineStore('system', () => {
  // 状态
  const currentMetrics = ref<SystemMetrics | null>(null)
  const metricsHistory = ref<SystemMetrics[]>([])
  const isMonitoring = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const alerts = ref<Array<{
    id: string
    type: string
    message: string
    level: 'warning' | 'error'
    timestamp: number
    acknowledged: boolean
  }>>([])
  const maxHistorySize = ref(100)
  const updateInterval = ref(5000)

  // 计算属性
  const systemHealth = computed(() => {
    if (!currentMetrics.value) return 'unknown'

    const { cpu, memory, networkLoad } = currentMetrics.value

    // 计算系统健康度
    const avgLoad = (cpu + memory + networkLoad) / 3

    if (avgLoad > 90) return 'critical'
    if (avgLoad > 80) return 'warning'
    if (avgLoad > 60) return 'moderate'
    return 'good'
  })

  const systemHealthScore = computed(() => {
    if (!currentMetrics.value) return 0

    const { cpu, memory, networkLoad } = currentMetrics.value
    const avgLoad = (cpu + memory + networkLoad) / 3

    return Math.max(0, 100 - avgLoad)
  })

  const cpuTrend = computed(() => {
    if (metricsHistory.value.length < 2) return 'stable'

    const recent = metricsHistory.value.slice(-5)
    const trend = recent[recent.length - 1].cpu - recent[0].cpu

    if (trend > 5) return 'rising'
    if (trend < -5) return 'falling'
    return 'stable'
  })

  const memoryTrend = computed(() => {
    if (metricsHistory.value.length < 2) return 'stable'

    const recent = metricsHistory.value.slice(-5)
    const trend = recent[recent.length - 1].memory - recent[0].memory

    if (trend > 5) return 'rising'
    if (trend < -5) return 'falling'
    return 'stable'
  })

  const networkTrend = computed(() => {
    if (metricsHistory.value.length < 2) return 'stable'

    const recent = metricsHistory.value.slice(-5)
    const trend = recent[recent.length - 1].networkLoad - recent[0].networkLoad

    if (trend > 10) return 'rising'
    if (trend < -10) return 'falling'
    return 'stable'
  })

  const averageMetrics = computed(() => {
    if (metricsHistory.value.length === 0) return null

    const sum = metricsHistory.value.reduce(
      (acc, metrics) => ({
        cpu: acc.cpu + metrics.cpu,
        memory: acc.memory + metrics.memory,
        networkLoad: acc.networkLoad + metrics.networkLoad,
        activePollingTasks: acc.activePollingTasks + metrics.activePollingTasks,
        diskIO: (acc.diskIO || 0) + (metrics.diskIO || 0),
        dbConnections: (acc.dbConnections || 0) + (metrics.dbConnections || 0),
        apiResponseTime: (acc.apiResponseTime || 0) + (metrics.apiResponseTime || 0)
      }),
      {
        cpu: 0,
        memory: 0,
        networkLoad: 0,
        activePollingTasks: 0,
        diskIO: 0,
        dbConnections: 0,
        apiResponseTime: 0
      }
    )

    const count = metricsHistory.value.length

    return {
      cpu: Math.round(sum.cpu / count),
      memory: Math.round(sum.memory / count),
      networkLoad: Math.round(sum.networkLoad / count),
      activePollingTasks: Math.round(sum.activePollingTasks / count),
      diskIO: Math.round((sum.diskIO || 0) / count),
      dbConnections: Math.round((sum.dbConnections || 0) / count),
      apiResponseTime: Math.round((sum.apiResponseTime || 0) / count)
    }
  })

  const peakMetrics = computed(() => {
    if (metricsHistory.value.length === 0) return null

    return metricsHistory.value.reduce(
      (peak, metrics) => ({
        cpu: Math.max(peak.cpu, metrics.cpu),
        memory: Math.max(peak.memory, metrics.memory),
        networkLoad: Math.max(peak.networkLoad, metrics.networkLoad),
        activePollingTasks: Math.max(peak.activePollingTasks, metrics.activePollingTasks),
        diskIO: Math.max(peak.diskIO || 0, metrics.diskIO || 0),
        dbConnections: Math.max(peak.dbConnections || 0, metrics.dbConnections || 0),
        apiResponseTime: Math.max(peak.apiResponseTime || 0, metrics.apiResponseTime || 0)
      }),
      {
        cpu: 0,
        memory: 0,
        networkLoad: 0,
        activePollingTasks: 0,
        diskIO: 0,
        dbConnections: 0,
        apiResponseTime: 0
      }
    )
  })

  const activeAlerts = computed(() =>
    alerts.value.filter(alert => !alert.acknowledged)
  )

  const criticalAlerts = computed(() =>
    activeAlerts.value.filter(alert => alert.level === 'error')
  )

  const warningAlerts = computed(() =>
    activeAlerts.value.filter(alert => alert.level === 'warning')
  )

  const systemStatus = computed(() => ({
    health: systemHealth.value,
    healthScore: systemHealthScore.value,
    isMonitoring: isMonitoring.value,
    currentMetrics: currentMetrics.value,
    trends: {
      cpu: cpuTrend.value,
      memory: memoryTrend.value,
      network: networkTrend.value
    },
    alerts: {
      total: activeAlerts.value.length,
      critical: criticalAlerts.value.length,
      warning: warningAlerts.value.length
    }
  }))

  // Actions
  const startMonitoring = async (): Promise<void> => {
    if (isMonitoring.value) {
      console.log('系统监控已在运行中')
      return
    }

    loading.value = true
    error.value = null

    try {
      systemMonitorService.startMonitoring()
      isMonitoring.value = true

      // 设置事件监听器
      setupServiceListeners()

      console.log('系统监控已启动')

    } catch (err) {
      error.value = err instanceof Error ? err.message : '启动系统监控失败'
      console.error('启动系统监控失败:', err)
    } finally {
      loading.value = false
    }
  }

  const stopMonitoring = async (): Promise<void> => {
    if (!isMonitoring.value) {
      return
    }

    loading.value = true

    try {
      systemMonitorService.stopMonitoring()
      isMonitoring.value = false

      console.log('系统监控已停止')

    } catch (err) {
      error.value = err instanceof Error ? err.message : '停止系统监控失败'
      console.error('停止系统监控失败:', err)
    } finally {
      loading.value = false
    }
  }

  const updateMetrics = (metrics: SystemMetrics): void => {
    currentMetrics.value = metrics

    // 添加时间戳
    const timestampedMetrics = {
      ...metrics,
      timestamp: Date.now()
    } as SystemMetrics & { timestamp: number }

    metricsHistory.value.push(timestampedMetrics)

    // 限制历史记录大小
    if (metricsHistory.value.length > maxHistorySize.value) {
      metricsHistory.value.shift()
    }
  }

  const addAlert = (alert: {
    type: string
    message: string
    level: 'warning' | 'error'
  }): void => {
    const newAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...alert,
      timestamp: Date.now(),
      acknowledged: false
    }

    alerts.value.unshift(newAlert)

    // 限制告警数量
    if (alerts.value.length > 100) {
      alerts.value = alerts.value.slice(0, 100)
    }
  }

  const acknowledgeAlert = (alertId: string): void => {
    const alert = alerts.value.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  const acknowledgeAllAlerts = (): void => {
    alerts.value.forEach(alert => {
      alert.acknowledged = true
    })
  }

  const clearAlert = (alertId: string): void => {
    const index = alerts.value.findIndex(a => a.id === alertId)
    if (index > -1) {
      alerts.value.splice(index, 1)
    }
  }

  const clearAllAlerts = (): void => {
    alerts.value = []
  }

  const clearAcknowledgedAlerts = (): void => {
    alerts.value = alerts.value.filter(alert => !alert.acknowledged)
  }

  const getMetricsHistory = (timeRange?: number): SystemMetrics[] => {
    if (!timeRange) {
      return [...metricsHistory.value]
    }

    const cutoffTime = Date.now() - timeRange
    return metricsHistory.value.filter(metrics =>
      (metrics as any).timestamp && (metrics as any).timestamp > cutoffTime
    )
  }

  const getAverageMetrics = (timeRange?: number): SystemMetrics | null => {
    return systemMonitorService.getAverageMetrics(timeRange)
  }

  const exportSystemData = (): any => {
    return {
      exportTime: Date.now(),
      currentMetrics: currentMetrics.value,
      metricsHistory: metricsHistory.value,
      alerts: alerts.value,
      systemStatus: systemStatus.value,
      monitoringStatus: systemMonitorService.getMonitoringStatus()
    }
  }

  const importSystemData = (data: any): void => {
    try {
      if (data.currentMetrics) {
        currentMetrics.value = data.currentMetrics
      }

      if (data.metricsHistory && Array.isArray(data.metricsHistory)) {
        metricsHistory.value = data.metricsHistory
      }

      if (data.alerts && Array.isArray(data.alerts)) {
        alerts.value = data.alerts
      }

      console.log('系统数据导入成功')
    } catch (err) {
      console.error('导入系统数据失败:', err)
    }
  }

  const setUpdateInterval = (interval: number): void => {
    if (interval < 1000) {
      throw new Error('更新间隔不能小于1秒')
    }

    updateInterval.value = interval
    systemMonitorService.setUpdateInterval(interval)
  }

  const setMaxHistorySize = (size: number): void => {
    if (size < 10) {
      throw new Error('历史记录大小不能小于10')
    }

    maxHistorySize.value = size
    systemMonitorService.setMaxHistorySize(size)

    // 如果当前历史记录超过新的大小限制，进行裁剪
    if (metricsHistory.value.length > size) {
      metricsHistory.value = metricsHistory.value.slice(-size)
    }
  }

  const clearHistory = (): void => {
    metricsHistory.value = []
    systemMonitorService.clearHistory()
  }

  const getSystemPerformance = (): any => {
    if (!currentMetrics.value) return null

    const metrics = currentMetrics.value

    return {
      overall: systemHealthScore.value,
      cpu: {
        usage: metrics.cpu,
        status: metrics.cpu > 90 ? 'critical' : metrics.cpu > 80 ? 'warning' : 'good',
        trend: cpuTrend.value
      },
      memory: {
        usage: metrics.memory,
        status: metrics.memory > 95 ? 'critical' : metrics.memory > 85 ? 'warning' : 'good',
        trend: memoryTrend.value
      },
      network: {
        load: metrics.networkLoad,
        status: metrics.networkLoad > 80 ? 'warning' : 'good',
        trend: networkTrend.value
      },
      api: {
        responseTime: metrics.apiResponseTime || 0,
        status: (metrics.apiResponseTime || 0) > 2000 ? 'warning' : 'good'
      }
    }
  }

  const setupServiceListeners = (): void => {
    // 监听指标更新
    systemMonitorService.on('metrics:updated', (metrics: SystemMetrics) => {
      updateMetrics(metrics)
    })

    // 监听告警
    systemMonitorService.on('alert', (alert: any) => {
      addAlert(alert)
    })

    // 监听监控启动
    systemMonitorService.on('monitoring:started', () => {
      isMonitoring.value = true
    })

    // 监听监控停止
    systemMonitorService.on('monitoring:stopped', () => {
      isMonitoring.value = false
    })

    // 监听错误
    systemMonitorService.on('metrics:error', (err: Error) => {
      error.value = err.message
      addAlert({
        type: 'monitoring_error',
        message: `监控服务错误: ${err.message}`,
        level: 'error'
      })
    })
  }

  const resetStore = (): void => {
    currentMetrics.value = null
    metricsHistory.value = []
    isMonitoring.value = false
    loading.value = false
    error.value = null
    alerts.value = []
  }

  const getHealthSummary = (): any => {
    return {
      overall: systemHealth.value,
      score: systemHealthScore.value,
      components: {
        cpu: {
          value: currentMetrics.value?.cpu || 0,
          status: (currentMetrics.value?.cpu || 0) > 90 ? 'critical' :
                  (currentMetrics.value?.cpu || 0) > 80 ? 'warning' : 'good'
        },
        memory: {
          value: currentMetrics.value?.memory || 0,
          status: (currentMetrics.value?.memory || 0) > 95 ? 'critical' :
                  (currentMetrics.value?.memory || 0) > 85 ? 'warning' : 'good'
        },
        network: {
          value: currentMetrics.value?.networkLoad || 0,
          status: (currentMetrics.value?.networkLoad || 0) > 80 ? 'warning' : 'good'
        }
      },
      alerts: {
        total: activeAlerts.value.length,
        critical: criticalAlerts.value.length,
        warning: warningAlerts.value.length
      },
      uptime: isMonitoring.value ? Date.now() - (systemMonitorService as any).startTime : 0
    }
  }

  return {
    // 状态
    currentMetrics,
    metricsHistory,
    isMonitoring,
    loading,
    error,
    alerts,
    maxHistorySize,
    updateInterval,

    // 计算属性
    systemHealth,
    systemHealthScore,
    cpuTrend,
    memoryTrend,
    networkTrend,
    averageMetrics,
    peakMetrics,
    activeAlerts,
    criticalAlerts,
    warningAlerts,
    systemStatus,

    // Actions
    startMonitoring,
    stopMonitoring,
    updateMetrics,
    addAlert,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    clearAlert,
    clearAllAlerts,
    clearAcknowledgedAlerts,
    getMetricsHistory,
    getAverageMetrics,
    exportSystemData,
    importSystemData,
    setUpdateInterval,
    setMaxHistorySize,
    clearHistory,
    getSystemPerformance,
    setupServiceListeners,
    resetStore,
    getHealthSummary
  }
})