import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PollingTask, PollingConfig, PollingStatistics, PollingEvent } from '../types'
import { pollingService } from '../services/PollingService'
import { createDefaultPollingConfig } from '../algorithms/AIPolling'
import { useSensorStore } from './sensor'

/**
 * 轮询管理 Store
 */
export const usePollingStore = defineStore('polling', () => {
  // 状态
  const tasks = ref<Map<string, PollingTask>>(new Map())
  const config = ref<PollingConfig>(createDefaultPollingConfig())
  const isServiceRunning = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const statistics = ref<PollingStatistics[]>([])
  const events = ref<PollingEvent[]>([])
  const maxEvents = ref(100)

  // 计算属性
  const totalTasks = computed(() => tasks.value.size)

  const activeTasks = computed(() => {
    return Array.from(tasks.value.values()).filter(
      task => task.status === 'running' || task.status === 'scheduled'
    )
  })

  const completedTasks = computed(() => {
    return Array.from(tasks.value.values()).filter(
      task => task.status === 'completed'
    )
  })

  const errorTasks = computed(() => {
    return Array.from(tasks.value.values()).filter(
      task => task.status === 'error' || task.status === 'failed'
    )
  })

  const pausedTasks = computed(() => {
    return Array.from(tasks.value.values()).filter(
      task => task.status === 'paused'
    )
  })

  const averageInterval = computed(() => {
    const taskList = Array.from(tasks.value.values())
    if (taskList.length === 0) return 0

    const totalInterval = taskList.reduce((sum, task) => sum + task.interval, 0)
    return Math.round(totalInterval / taskList.length)
  })

  const systemLoad = computed(() => {
    const maxConcurrent = 50 // 假设最大并发数
    const runningCount = activeTasks.value.length
    return Math.min((runningCount / maxConcurrent) * 100, 100)
  })

  const pollingStatus = computed(() => ({
    isRunning: isServiceRunning.value,
    totalTasks: totalTasks.value,
    activeTasks: activeTasks.value.length,
    completedTasks: completedTasks.value.length,
    errorTasks: errorTasks.value.length,
    pausedTasks: pausedTasks.value.length,
    averageInterval: averageInterval.value,
    systemLoad: systemLoad.value,
    queueLength: pollingService.getStatus().queueLength
  }))

  const tasksByStatus = computed(() => {
    const grouped: Record<string, PollingTask[]> = {
      pending: [],
      scheduled: [],
      running: [],
      completed: [],
      error: [],
      failed: [],
      paused: []
    }

    Array.from(tasks.value.values()).forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    })

    return grouped
  })

  // Actions
  const startPollingService = async (): Promise<void> => {
    if (isServiceRunning.value) {
      console.log('轮询服务已在运行中')
      return
    }

    loading.value = true
    error.value = null

    try {
      await pollingService.start()
      isServiceRunning.value = true

      // 设置事件监听器
      setupServiceListeners()

      addEvent({
        type: 'poll_start',
        sensorId: 'system',
        timestamp: Date.now(),
        data: { message: '轮询服务已启动' }
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : '启动轮询服务失败'
      console.error('启动轮询服务失败:', err)
    } finally {
      loading.value = false
    }
  }

  const stopPollingService = async (): Promise<void> => {
    if (!isServiceRunning.value) {
      return
    }

    loading.value = true

    try {
      await pollingService.stop()
      isServiceRunning.value = false
      tasks.value.clear()

      addEvent({
        type: 'poll_start',
        sensorId: 'system',
        timestamp: Date.now(),
        data: { message: '轮询服务已停止' }
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : '停止轮询服务失败'
      console.error('停止轮询服务失败:', err)
    } finally {
      loading.value = false
    }
  }

  const addSensorToPolling = (sensorData: any): void => {
    try {
      pollingService.addSensor(sensorData)

      addEvent({
        type: 'sensor_added',
        sensorId: sensorData.id,
        timestamp: Date.now(),
        data: { sensorName: sensorData.name }
      })

    } catch (err) {
      console.error('添加传感器到轮询失败:', err)
    }
  }

  const removeSensorFromPolling = (sensorId: string): void => {
    try {
      pollingService.removeSensor(sensorId)
      tasks.value.delete(sensorId)

      addEvent({
        type: 'sensor_removed',
        sensorId,
        timestamp: Date.now()
      })

    } catch (err) {
      console.error('从轮询中移除传感器失败:', err)
    }
  }

  const updatePollingConfig = async (newConfig: Partial<PollingConfig>): Promise<void> => {
    try {
      const updatedConfig = { ...config.value, ...newConfig }
      pollingService.updateConfig(updatedConfig)
      config.value = updatedConfig

      // 保存配置到本地存储
      localStorage.setItem('pollingConfig', JSON.stringify(updatedConfig))

      addEvent({
        type: 'interval_changed',
        sensorId: 'system',
        timestamp: Date.now(),
        data: { config: newConfig }
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新轮询配置失败'
      console.error('更新轮询配置失败:', err)
    }
  }

  const forcePollSensor = async (sensorId: string): Promise<void> => {
    try {
      const sensorData = await pollingService.forcePoll(sensorId)
      const sensorStore = useSensorStore()
      sensorStore.addSensor(sensorData)
      sensorStore.updateSensorHistory(sensorId, sensorData)
      addEvent({
        type: 'poll_start',
        sensorId,
        timestamp: Date.now(),
        data: { forced: true }
      })
      addEvent({
        type: 'poll_success',
        sensorId,
        timestamp: Date.now(),
        data: sensorData
      })
      updateTaskStatus(sensorId, 'completed')
    } catch (err) {
      console.error(`强制轮询传感器 ${sensorId} 失败:`, err)
      throw err
    }
  }

  const pauseSensor = (sensorId: string): void => {
    try {
      pollingService.pauseSensor(sensorId)

      const task = tasks.value.get(sensorId)
      if (task) {
        task.status = 'paused'
      }

    } catch (err) {
      console.error(`暂停传感器 ${sensorId} 轮询失败:`, err)
    }
  }

  const resumeSensor = (sensorId: string): void => {
    try {
      pollingService.resumeSensor(sensorId)

      const task = tasks.value.get(sensorId)
      if (task) {
        task.status = 'scheduled'
      }

    } catch (err) {
      console.error(`恢复传感器 ${sensorId} 轮询失败:`, err)
    }
  }

  const getTask = (sensorId: string): PollingTask | null => {
    return tasks.value.get(sensorId) || null
  }

  const getAllTasks = (): PollingTask[] => {
    return Array.from(tasks.value.values())
  }

  const getTasksByStatus = (status: PollingTask['status']): PollingTask[] => {
    return Array.from(tasks.value.values()).filter(task => task.status === status)
  }

  const fetchTasks = async (): Promise<void> => {
    loading.value = true

    try {
      const serviceTasks = pollingService.getAllTasks()

      // 更新任务映射
      tasks.value.clear()
      serviceTasks.forEach(task => {
        tasks.value.set(task.sensorId, task)
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取轮询任务失败'
      console.error('获取轮询任务失败:', err)
    } finally {
      loading.value = false
    }
  }

  const updateTaskStatus = (sensorId: string, status: PollingTask['status']): void => {
    const task = tasks.value.get(sensorId)
    if (task) {
      task.status = status
    }
  }

  const getPollingStatistics = (): any => {
    return pollingService.getStatistics()
  }

  const addEvent = (event: PollingEvent): void => {
    events.value.unshift(event)

    // 限制事件数量
    if (events.value.length > maxEvents.value) {
      events.value = events.value.slice(0, maxEvents.value)
    }
  }

  const clearEvents = (): void => {
    events.value = []
  }

  const getRecentEvents = (count: number = 10): PollingEvent[] => {
    return events.value.slice(0, count)
  }

  const getEventsBySensor = (sensorId: string): PollingEvent[] => {
    return events.value.filter(event => event.sensorId === sensorId)
  }

  const setupServiceListeners = (): void => {
    const sensorStore = useSensorStore()

    // 监听轮询服务事件
    pollingService.on('data:updated', (sensorId: string, data: any) => {
      sensorStore.addSensor(data)
      sensorStore.updateSensorHistory(sensorId, data)

      addEvent({
        type: 'poll_success',
        sensorId,
        timestamp: Date.now(),
        data
      })

      // 更新任务状态
      updateTaskStatus(sensorId, 'completed')
      void fetchTasks()
    })

    pollingService.on('sensor:failed', (sensorId: string, error: Error) => {
      addEvent({
        type: 'poll_error',
        sensorId,
        timestamp: Date.now(),
        error: error.message
      })

      // 更新任务状态
      updateTaskStatus(sensorId, 'failed')
      void fetchTasks()
    })

    pollingService.on('sensor:added', () => {
      // 刷新任务列表
      void fetchTasks()
    })

    pollingService.on('sensor:removed', (sensorId: string) => {
      tasks.value.delete(sensorId)
    })
  }

  const loadConfig = (): void => {
    try {
      const saved = localStorage.getItem('pollingConfig')
      if (saved) {
        const savedConfig = JSON.parse(saved)
        config.value = { ...config.value, ...savedConfig }
      }
    } catch (err) {
      console.error('加载轮询配置失败:', err)
    }
  }

  const resetStore = (): void => {
    tasks.value.clear()
    config.value = createDefaultPollingConfig()
    isServiceRunning.value = false
    loading.value = false
    error.value = null
    statistics.value = []
    events.value = []
  }

  const exportPollingData = (): any => {
    return {
      exportTime: Date.now(),
      config: config.value,
      tasks: Array.from(tasks.value.values()),
      statistics: statistics.value,
      events: events.value.slice(0, 50), // 导出最近50个事件
      status: pollingStatus.value
    }
  }

  const importPollingData = (data: any): void => {
    try {
      if (data.config) {
        config.value = { ...config.value, ...data.config }
      }

      if (data.tasks && Array.isArray(data.tasks)) {
        tasks.value.clear()
        data.tasks.forEach((task: PollingTask) => {
          tasks.value.set(task.sensorId, task)
        })
      }

      if (data.statistics && Array.isArray(data.statistics)) {
        statistics.value = data.statistics
      }

      console.log('轮询数据导入成功')
    } catch (err) {
      console.error('导入轮询数据失败:', err)
    }
  }

  const getTaskMetrics = (): any => {
    const taskList = Array.from(tasks.value.values())

    return {
      totalTasks: taskList.length,
      averageInterval: averageInterval.value,
      successRate: taskList.length > 0
        ? (completedTasks.value.length / taskList.length) * 100
        : 0,
      errorRate: taskList.length > 0
        ? (errorTasks.value.length / taskList.length) * 100
        : 0,
      systemLoad: systemLoad.value,
      uptime: isServiceRunning.value ? Date.now() - (pollingService as any).startTime : 0
    }
  }

  // 初始化
  loadConfig()

  return {
    // 状态
    tasks,
    config,
    isServiceRunning,
    loading,
    error,
    statistics,
    events,
    maxEvents,

    // 计算属性
    totalTasks,
    activeTasks,
    completedTasks,
    errorTasks,
    pausedTasks,
    averageInterval,
    systemLoad,
    pollingStatus,
    tasksByStatus,

    // Actions
    startPollingService,
    stopPollingService,
    addSensorToPolling,
    removeSensorFromPolling,
    updatePollingConfig,
    forcePollSensor,
    pauseSensor,
    resumeSensor,
    getTask,
    getAllTasks,
    getTasksByStatus,
    fetchTasks,
    updateTaskStatus,
    getPollingStatistics,
    addEvent,
    clearEvents,
    getRecentEvents,
    getEventsBySensor,
    setupServiceListeners,
    loadConfig,
    resetStore,
    exportPollingData,
    importPollingData,
    getTaskMetrics
  }
})