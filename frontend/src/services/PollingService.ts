import { AIPollingAlgorithm, createDefaultPollingConfig } from '../algorithms/AIPolling'
import type { SensorData, PollingTask, PollingConfig, SystemMetrics } from '../types'
import { sensorApi } from '../api'
import { EventEmitter } from '../utils/EventEmitter'

/**
 * 轮询服务
 * 管理多传感器轮询任务、动态调整间隔、资源调度
 */
export class PollingService extends EventEmitter {
  private algorithm: AIPollingAlgorithm
  private activeTasks: Map<string, PollingTask> = new Map()
  private sensorHistory: Map<string, SensorData[]> = new Map()
  private isRunning: boolean = false
  private maxConcurrentTasks: number = 50
  private taskQueue: string[] = []
  private processingQueue: boolean = false

  constructor(config?: PollingConfig) {
    super()
    this.algorithm = new AIPollingAlgorithm(config || createDefaultPollingConfig())
  }

  /**
   * 启动轮询服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('轮询服务已在运行中')
    }

    this.isRunning = true
    this.emit('service:started')

    // 开始处理任务队列
    this.processTaskQueue()

    console.log('轮询服务已启动')
  }

  /**
   * 停止轮询服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    // 清除所有活跃任务
    for (const [, task] of this.activeTasks) {
      if (task.timeoutId) {
        clearTimeout(task.timeoutId)
      }
    }

    this.activeTasks.clear()
    this.taskQueue = []
    this.processingQueue = false

    this.emit('service:stopped')
    console.log('轮询服务已停止')
  }

  /**
   * 添加传感器到轮询列表
   */
  addSensor(sensor: SensorData): void {
    if (this.activeTasks.has(sensor.id)) {
      console.warn(`传感器 ${sensor.id} 已在轮询列表中`)
      return
    }

    const task: PollingTask = {
      sensorId: sensor.id,
      sensor: sensor,
      nextPollTime: Date.now(),
      interval: this.algorithm.calculateNextInterval(sensor, this.getSensorHistory(sensor.id)),
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      lastPollTime: null,
      lastError: null
    }

    this.activeTasks.set(sensor.id, task)
    this.scheduleTask(sensor.id)

    this.emit('sensor:added', sensor.id)
    console.log(`传感器 ${sensor.id} 已添加到轮询列表`)
  }

  /**
   * 从轮询列表移除传感器
   */
  removeSensor(sensorId: string): void {
    const task = this.activeTasks.get(sensorId)
    if (!task) {
      return
    }

    if (task.timeoutId) {
      clearTimeout(task.timeoutId)
    }

    this.activeTasks.delete(sensorId)
    this.sensorHistory.delete(sensorId)

    // 从队列中移除
    const queueIndex = this.taskQueue.indexOf(sensorId)
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1)
    }

    this.emit('sensor:removed', sensorId)
    console.log(`传感器 ${sensorId} 已从轮询列表移除`)
  }

  /**
   * 更新传感器信息
   */
  updateSensor(sensor: SensorData): void {
    const task = this.activeTasks.get(sensor.id)
    if (!task) {
      console.warn(`传感器 ${sensor.id} 不在轮询列表中`)
      return
    }

    task.sensor = sensor

    // 重新计算轮询间隔
    const newInterval = this.algorithm.calculateNextInterval(sensor, this.getSensorHistory(sensor.id))
    if (Math.abs(newInterval - task.interval) > 5) { // 间隔变化超过5秒才更新
      task.interval = newInterval
      this.rescheduleTask(sensor.id)
    }

    this.emit('sensor:updated', sensor.id)
  }

  /**
   * 调度任务
   */
  private scheduleTask(sensorId: string): void {
    const task = this.activeTasks.get(sensorId)
    if (!task || !this.isRunning) {
      return
    }

    const delay = Math.max(0, task.nextPollTime - Date.now())

    task.timeoutId = setTimeout(() => {
      this.queueTask(sensorId)
    }, delay)

    task.status = 'scheduled'
  }

  /**
   * 重新调度任务
   */
  private rescheduleTask(sensorId: string): void {
    const task = this.activeTasks.get(sensorId)
    if (!task) {
      return
    }

    // 清除现有的定时器
    if (task.timeoutId) {
      clearTimeout(task.timeoutId)
      task.timeoutId = undefined
    }

    // 更新下次轮询时间
    task.nextPollTime = Date.now() + (task.interval * 1000)

    // 重新调度
    this.scheduleTask(sensorId)
  }

  /**
   * 将任务加入队列
   */
  private queueTask(sensorId: string): void {
    if (!this.taskQueue.includes(sensorId)) {
      this.taskQueue.push(sensorId)
    }

    if (!this.processingQueue) {
      this.processTaskQueue()
    }
  }

  /**
   * 处理任务队列
   */
  private async processTaskQueue(): Promise<void> {
    if (this.processingQueue || !this.isRunning) {
      return
    }

    this.processingQueue = true

    while (this.taskQueue.length > 0 && this.isRunning) {
      // 检查并发任务数限制
      const runningTasks = Array.from(this.activeTasks.values())
        .filter(task => task.status === 'running').length

      if (runningTasks >= this.maxConcurrentTasks) {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }

      const sensorId = this.taskQueue.shift()
      if (sensorId) {
        this.executeTask(sensorId)
      }
    }

    this.processingQueue = false
  }

  /**
   * 执行轮询任务
   */
  private async executeTask(sensorId: string): Promise<void> {
    const task = this.activeTasks.get(sensorId)
    if (!task || !this.isRunning) {
      return
    }

    task.status = 'running'
    task.lastPollTime = Date.now()

    try {
      // 执行实际的传感器数据获取
      const sensorData = await this.pollSensorData(task.sensor)

      // 更新历史数据
      this.updateSensorHistory(sensorId, sensorData)

      // 重新计算下次轮询间隔
      const newInterval = this.algorithm.calculateNextInterval(
        sensorData,
        this.getSensorHistory(sensorId)
      )

      // 更新任务信息
      task.sensor = sensorData
      task.interval = newInterval
      task.nextPollTime = Date.now() + (newInterval * 1000)
      task.retryCount = 0
      task.lastError = null
      task.status = 'completed'

      // 发出数据更新事件
      this.emit('data:updated', sensorId, sensorData)

      // 调度下次轮询
      this.scheduleTask(sensorId)

    } catch (error) {
      console.error(`轮询传感器 ${sensorId} 失败:`, error)

      task.retryCount++
      task.lastError = error as Error
      task.status = 'error'

      if (task.retryCount < task.maxRetries) {
        // 重试，使用指数退避
        const retryDelay = Math.min(1000 * Math.pow(2, task.retryCount), 30000)
        task.nextPollTime = Date.now() + retryDelay
        this.scheduleTask(sensorId)
      } else {
        // 达到最大重试次数，暂停该传感器的轮询
        task.status = 'failed'
        this.emit('sensor:failed', sensorId, error)
      }
    }
  }

  /**
   * 轮询传感器数据
   */
  private async pollSensorData(sensor: SensorData): Promise<SensorData> {
    const response = await sensorApi.refreshLatestSensorData()
    const latestList = response?.data ?? []
    const payload = latestList.find((item: any) => item.sensor_id === sensor.id)

    if (!payload) {
      throw new Error(`未找到传感器 ${sensor.id} 的最新采样数据`)
    }

    return {
      ...sensor,
      id: payload?.sensor_id ?? sensor.id,
      name: payload?.sensor_name ?? sensor.name,
      type: payload?.sensor_type ?? sensor.type,
      value: payload?.processed_value ?? payload?.value ?? sensor.value,
      unit: payload?.unit ?? sensor.unit,
      status: payload?.status ?? sensor.status,
      priority: sensor.priority,
      location: payload?.location ?? sensor.location,
      timestamp: payload?.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
      thresholds: sensor.thresholds,
      deviceId: payload?.device_id ?? sensor.deviceId,
      rawData: payload?.raw_data ?? sensor.rawData,
      metadata: {
        ...sensor.metadata,
        raw_data: payload?.raw_data ?? sensor.rawData
      }
    }
  }

  /**
   * 更新传感器历史数据
   */
  private updateSensorHistory(sensorId: string, data: SensorData): void {
    if (!this.sensorHistory.has(sensorId)) {
      this.sensorHistory.set(sensorId, [])
    }

    const history = this.sensorHistory.get(sensorId)!
    history.push(data)

    // 限制历史数据长度，保留最近100条记录
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }

  /**
   * 获取传感器历史数据
   */
  private getSensorHistory(sensorId: string): SensorData[] {
    return this.sensorHistory.get(sensorId) || []
  }

  /**
   * 更新系统指标
   */
  updateSystemMetrics(metrics: SystemMetrics): void {
    this.algorithm.updateSystemMetrics(metrics)
  }

  /**
   * 更新轮询配置
   */
  updateConfig(config: Partial<PollingConfig>): void {
    this.algorithm.updateConfig(config)
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    isRunning: boolean
    activeTasks: number
    queueLength: number
    totalSensors: number
    averageInterval: number
    systemLoad: number
  } {
    const tasks = Array.from(this.activeTasks.values())
    const runningTasks = tasks.filter(task => task.status === 'running').length
    const avgInterval = tasks.length > 0
      ? tasks.reduce((sum, task) => sum + task.interval, 0) / tasks.length
      : 0

    return {
      isRunning: this.isRunning,
      activeTasks: runningTasks,
      queueLength: this.taskQueue.length,
      totalSensors: this.activeTasks.size,
      averageInterval: Math.round(avgInterval),
      systemLoad: this.calculateSystemLoad()
    }
  }

  /**
   * 获取传感器任务信息
   */
  getSensorTask(sensorId: string): PollingTask | null {
    return this.activeTasks.get(sensorId) || null
  }

  /**
   * 获取所有传感器任务
   */
  getAllTasks(): PollingTask[] {
    return Array.from(this.activeTasks.values())
  }

  /**
   * 计算系统负载
   */
  private calculateSystemLoad(): number {
    const runningTasks = Array.from(this.activeTasks.values())
      .filter(task => task.status === 'running').length

    return Math.min((runningTasks / this.maxConcurrentTasks) * 100, 100)
  }

  /**
   * 强制轮询指定传感器
   */
  async forcePoll(sensorId: string): Promise<SensorData> {
    const task = this.activeTasks.get(sensorId)
    if (!task) {
      throw new Error(`传感器 ${sensorId} 不存在`)
    }

    return await this.pollSensorData(task.sensor)
  }

  /**
   * 暂停传感器轮询
   */
  pauseSensor(sensorId: string): void {
    const task = this.activeTasks.get(sensorId)
    if (!task) {
      return
    }

    if (task.timeoutId) {
      clearTimeout(task.timeoutId)
      task.timeoutId = undefined
    }

    task.status = 'paused'
    this.emit('sensor:paused', sensorId)
  }

  /**
   * 恢复传感器轮询
   */
  resumeSensor(sensorId: string): void {
    const task = this.activeTasks.get(sensorId)
    if (!task || task.status !== 'paused') {
      return
    }

    task.nextPollTime = Date.now()
    this.scheduleTask(sensorId)
    this.emit('sensor:resumed', sensorId)
  }

  /**
   * 获取轮询统计信息
   */
  getStatistics(): {
    totalPolls: number
    successfulPolls: number
    failedPolls: number
    averageResponseTime: number
    uptimePercentage: number
  } {
    const tasks = Array.from(this.activeTasks.values())
    const successfulPolls = tasks.filter(task => task.status === 'completed').length
    const failedPolls = tasks.filter(task => task.status === 'error' || task.status === 'failed').length
    const totalPolls = successfulPolls + failedPolls
    const averageResponseTime = 0
    const uptimePercentage = totalPolls > 0
      ? Number(((successfulPolls / totalPolls) * 100).toFixed(1))
      : 0

    return {
      totalPolls,
      successfulPolls,
      failedPolls,
      averageResponseTime,
      uptimePercentage
    }
  }
}

// 创建全局轮询服务实例
export const pollingService = new PollingService()

// 导出类型
export type { PollingTask }