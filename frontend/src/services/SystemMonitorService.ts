import type { SystemMetrics } from '../types'
import { EventEmitter } from '../utils/EventEmitter'

/**
 * 系统监控服务
 * 收集和监控系统性能指标
 */
export class SystemMonitorService extends EventEmitter {
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private metricsHistory: SystemMetrics[] = []
  private maxHistorySize: number = 100
  private updateInterval: number = 5000 // 5秒更新一次

  constructor() {
    super()
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('系统监控已在运行中')
      return
    }

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.updateInterval)

    // 立即收集一次指标
    this.collectMetrics()

    this.emit('monitoring:started')
    console.log('系统监控已启动')
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.emit('monitoring:stopped')
    console.log('系统监控已停止')
  }

  /**
   * 收集系统指标
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherSystemMetrics()

      // 添加到历史记录
      this.metricsHistory.push(metrics)

      // 限制历史记录大小
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift()
      }

      // 发出指标更新事件
      this.emit('metrics:updated', metrics)

      // 检查告警条件
      this.checkAlerts(metrics)

    } catch (error) {
      console.error('收集系统指标失败:', error)
      this.emit('metrics:error', error)
    }
  }

  /**
   * 收集系统指标数据
   */
  private async gatherSystemMetrics(): Promise<SystemMetrics> {
    // 在浏览器环境中，我们只能获取有限的系统信息
    // 这里模拟系统指标收集，实际应用中应该从后端API获取

    const metrics: SystemMetrics = {
      cpu: await this.getCPUUsage(),
      memory: await this.getMemoryUsage(),
      networkLoad: await this.getNetworkLoad(),
      activePollingTasks: await this.getActivePollingTasks(),
      diskIO: await this.getDiskIOUsage(),
      dbConnections: await this.getDBConnections(),
      apiResponseTime: await this.getAPIResponseTime()
    }

    return metrics
  }

  /**
   * 获取CPU使用率
   */
  private async getCPUUsage(): Promise<number> {
    // 浏览器环境中无法直接获取CPU使用率
    // 这里使用模拟数据，实际应用中应从后端获取

    // 模拟CPU使用率波动
    const baseUsage = 45
    const variation = (Math.random() - 0.5) * 20
    return Math.max(0, Math.min(100, baseUsage + variation))
  }

  /**
   * 获取内存使用率
   */
  private async getMemoryUsage(): Promise<number> {
    // 尝试获取浏览器内存信息（仅在支持的浏览器中可用）
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      if (memInfo) {
        const usedMemory = memInfo.usedJSHeapSize
        const totalMemory = memInfo.totalJSHeapSize
        return Math.round((usedMemory / totalMemory) * 100)
      }
    }

    // 模拟内存使用率
    const baseUsage = 60
    const variation = (Math.random() - 0.5) * 15
    return Math.max(0, Math.min(100, baseUsage + variation))
  }

  /**
   * 获取网络负载
   */
  private async getNetworkLoad(): Promise<number> {
    // 浏览器环境中可以通过Network Information API获取部分网络信息
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        // 根据连接类型估算负载
        const effectiveType = connection.effectiveType
        const rtt = connection.rtt || 100

        // 简单的负载估算
        let load = 0
        switch (effectiveType) {
          case 'slow-2g':
            load = 80
            break
          case '2g':
            load = 60
            break
          case '3g':
            load = 40
            break
          case '4g':
            load = 20
            break
          default:
            load = 10
        }

        // 根据RTT调整
        load += Math.min(rtt / 10, 30)
        return Math.min(100, load)
      }
    }

    // 模拟网络负载
    const baseLoad = 25
    const variation = (Math.random() - 0.5) * 20
    return Math.max(0, Math.min(100, baseLoad + variation))
  }

  /**
   * 获取活跃轮询任务数
   */
  private async getActivePollingTasks(): Promise<number> {
    // 这里应该从轮询服务获取实际的任务数
    // 模拟数据
    return Math.floor(Math.random() * 20) + 5
  }

  /**
   * 获取磁盘I/O使用率
   */
  private async getDiskIOUsage(): Promise<number> {
    // 浏览器环境中无法获取磁盘I/O信息
    // 模拟数据
    const baseUsage = 15
    const variation = (Math.random() - 0.5) * 10
    return Math.max(0, Math.min(100, baseUsage + variation))
  }

  /**
   * 获取数据库连接数
   */
  private async getDBConnections(): Promise<number> {
    // 模拟数据库连接数
    return Math.floor(Math.random() * 10) + 15
  }

  /**
   * 获取API响应时间
   */
  private async getAPIResponseTime(): Promise<number> {
    // 可以通过实际的API调用来测量响应时间
    try {
      const startTime = performance.now()

      // 发送一个轻量级的API请求来测量响应时间
      await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache'
      })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      return Math.round(responseTime)
    } catch (error) {
      // 如果API调用失败，返回模拟数据
      return Math.floor(Math.random() * 200) + 100
    }
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(metrics: SystemMetrics): void {
    const alerts: Array<{ type: string, message: string, level: 'warning' | 'error' }> = []

    // CPU使用率告警
    if (metrics.cpu > 90) {
      alerts.push({
        type: 'cpu_high',
        message: `CPU使用率过高: ${metrics.cpu.toFixed(1)}%`,
        level: 'error'
      })
    } else if (metrics.cpu > 80) {
      alerts.push({
        type: 'cpu_warning',
        message: `CPU使用率较高: ${metrics.cpu.toFixed(1)}%`,
        level: 'warning'
      })
    }

    // 内存使用率告警
    if (metrics.memory > 95) {
      alerts.push({
        type: 'memory_high',
        message: `内存使用率过高: ${metrics.memory.toFixed(1)}%`,
        level: 'error'
      })
    } else if (metrics.memory > 85) {
      alerts.push({
        type: 'memory_warning',
        message: `内存使用率较高: ${metrics.memory.toFixed(1)}%`,
        level: 'warning'
      })
    }

    // 网络负载告警
    if (metrics.networkLoad > 80) {
      alerts.push({
        type: 'network_high',
        message: `网络负载过高: ${metrics.networkLoad.toFixed(1)}%`,
        level: 'warning'
      })
    }

    // API响应时间告警
    if (metrics.apiResponseTime && metrics.apiResponseTime > 2000) {
      alerts.push({
        type: 'api_slow',
        message: `API响应时间过长: ${metrics.apiResponseTime}ms`,
        level: 'warning'
      })
    }

    // 发出告警事件
    alerts.forEach(alert => {
      this.emit('alert', alert)
    })
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): SystemMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(count?: number): SystemMetrics[] {
    if (count) {
      return this.metricsHistory.slice(-count)
    }
    return [...this.metricsHistory]
  }

  /**
   * 获取平均指标
   */
  getAverageMetrics(timeRange?: number): SystemMetrics | null {
    let metrics = this.metricsHistory

    if (timeRange) {
      const cutoffTime = Date.now() - timeRange
      metrics = metrics.filter(m =>
        (m as any).timestamp && (m as any).timestamp > cutoffTime
      )
    }

    if (metrics.length === 0) {
      return null
    }

    const avg: SystemMetrics = {
      cpu: 0,
      memory: 0,
      networkLoad: 0,
      activePollingTasks: 0,
      diskIO: 0,
      dbConnections: 0,
      apiResponseTime: 0
    }

    metrics.forEach(metric => {
      avg.cpu += metric.cpu
      avg.memory += metric.memory
      avg.networkLoad += metric.networkLoad
      avg.activePollingTasks += metric.activePollingTasks
      if (metric.diskIO) avg.diskIO! += metric.diskIO
      if (metric.dbConnections) avg.dbConnections! += metric.dbConnections
      if (metric.apiResponseTime) avg.apiResponseTime! += metric.apiResponseTime
    })

    const count = metrics.length
    avg.cpu = Math.round(avg.cpu / count)
    avg.memory = Math.round(avg.memory / count)
    avg.networkLoad = Math.round(avg.networkLoad / count)
    avg.activePollingTasks = Math.round(avg.activePollingTasks / count)
    if (avg.diskIO) avg.diskIO = Math.round(avg.diskIO / count)
    if (avg.dbConnections) avg.dbConnections = Math.round(avg.dbConnections / count)
    if (avg.apiResponseTime) avg.apiResponseTime = Math.round(avg.apiResponseTime / count)

    return avg
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(): {
    isMonitoring: boolean
    updateInterval: number
    historySize: number
    maxHistorySize: number
  } {
    return {
      isMonitoring: this.isMonitoring,
      updateInterval: this.updateInterval,
      historySize: this.metricsHistory.length,
      maxHistorySize: this.maxHistorySize
    }
  }

  /**
   * 设置更新间隔
   */
  setUpdateInterval(interval: number): void {
    if (interval < 1000) {
      throw new Error('更新间隔不能小于1秒')
    }

    this.updateInterval = interval

    if (this.isMonitoring) {
      // 重启监控以应用新的间隔
      this.stopMonitoring()
      this.startMonitoring()
    }
  }

  /**
   * 设置历史记录大小
   */
  setMaxHistorySize(size: number): void {
    if (size < 10) {
      throw new Error('历史记录大小不能小于10')
    }

    this.maxHistorySize = size

    // 如果当前历史记录超过新的大小限制，进行裁剪
    if (this.metricsHistory.length > size) {
      this.metricsHistory = this.metricsHistory.slice(-size)
    }
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.metricsHistory = []
    this.emit('history:cleared')
  }

  /**
   * 导出指标数据
   */
  exportMetrics(): {
    exportTime: number
    monitoringStatus: any
    metrics: SystemMetrics[]
  } {
    return {
      exportTime: Date.now(),
      monitoringStatus: this.getMonitoringStatus(),
      metrics: [...this.metricsHistory]
    }
  }
}

// 创建全局系统监控服务实例
export const systemMonitorService = new SystemMonitorService()

// 自动启动监控（可选）
if (typeof window !== 'undefined') {
  // 页面加载时自动启动监控
  window.addEventListener('load', () => {
    systemMonitorService.startMonitoring()
  })

  // 页面卸载时停止监控
  window.addEventListener('beforeunload', () => {
    systemMonitorService.stopMonitoring()
  })
}

export default SystemMonitorService