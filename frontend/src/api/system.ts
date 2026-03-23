import api from './request'
import type { SystemMetrics } from '../types'

/**
 * 系统监控 API
 */
export const systemApi = {
  /**
   * 获取系统指标
   */
  getMetrics: (): Promise<{ metrics: SystemMetrics }> => {
    return api.get('/system/metrics')
  },

  /**
   * 获取系统性能数据
   */
  getPerformance: (timeRange?: string): Promise<{
    performance: {
      cpu: SystemMetrics[]
      memory: SystemMetrics[]
      network: SystemMetrics[]
      api: SystemMetrics[]
    }
  }> => {
    return api.get('/system/performance', { params: { timeRange } })
  },

  /**
   * 获取系统健康状态
   */
  getHealth: (): Promise<{
    health: {
      status: 'good' | 'moderate' | 'warning' | 'critical'
      score: number
      components: Record<string, any>
      uptime: number
    }
  }> => {
    return api.get('/system/health')
  },

  /**
   * 获取系统资源使用情况
   */
  getResources: (): Promise<{
    resources: {
      cpu: { usage: number; cores: number; frequency: number }
      memory: { used: number; total: number; available: number }
      disk: { used: number; total: number; available: number }
      network: { bytesIn: number; bytesOut: number; packetsIn: number; packetsOut: number }
    }
  }> => {
    return api.get('/system/resources')
  },

  /**
   * 获取系统进程信息
   */
  getProcesses: (): Promise<{
    processes: Array<{
      pid: number
      name: string
      cpu: number
      memory: number
      status: string
    }>
  }> => {
    return api.get('/system/processes')
  },

  /**
   * 获取系统日志
   */
  getLogs: (params?: {
    level?: 'debug' | 'info' | 'warn' | 'error'
    limit?: number
    offset?: number
    startTime?: string
    endTime?: string
  }): Promise<{
    logs: Array<{
      id: string
      timestamp: string
      level: string
      message: string
      source: string
      metadata?: Record<string, any>
    }>
    total: number
  }> => {
    return api.get('/system/logs', { params })
  },

  /**
   * 获取系统告警
   */
  getAlerts: (params?: {
    status?: 'active' | 'acknowledged' | 'resolved'
    level?: 'info' | 'warning' | 'error' | 'critical'
    limit?: number
    offset?: number
  }): Promise<{
    alerts: Array<{
      id: string
      type: string
      message: string
      level: 'info' | 'warning' | 'error' | 'critical'
      status: 'active' | 'acknowledged' | 'resolved'
      timestamp: string
      source: string
      metadata?: Record<string, any>
    }>
    total: number
  }> => {
    return api.get('/system/alerts', { params })
  },

  /**
   * 确认系统告警
   */
  acknowledgeAlert: (alertId: string): Promise<{ success: boolean }> => {
    return api.post(`/system/alerts/${alertId}/acknowledge`)
  },

  /**
   * 解决系统告警
   */
  resolveAlert: (alertId: string, resolution?: string): Promise<{ success: boolean }> => {
    return api.post(`/system/alerts/${alertId}/resolve`, { resolution })
  },

  /**
   * 获取系统配置
   */
  getConfig: (): Promise<{
    config: {
      monitoring: {
        enabled: boolean
        interval: number
        retention: number
        thresholds: Record<string, { warning: number; error: number }>
      }
      alerts: {
        enabled: boolean
        channels: string[]
        rules: Array<{
          id: string
          name: string
          condition: string
          level: string
          enabled: boolean
        }>
      }
      performance: {
        maxConcurrentTasks: number
        taskTimeout: number
        retryAttempts: number
      }
    }
  }> => {
    return api.get('/system/config')
  },

  /**
   * 更新系统配置
   */
  updateConfig: (config: Record<string, any>): Promise<{ success: boolean }> => {
    return api.put('/system/config', config)
  },

  /**
   * 重启系统服务
   */
  restartService: (serviceName: string): Promise<{ success: boolean }> => {
    return api.post(`/system/services/${serviceName}/restart`)
  },

  /**
   * 获取系统服务状态
   */
  getServiceStatus: (): Promise<{
    services: Array<{
      name: string
      status: 'running' | 'stopped' | 'error'
      uptime: number
      memory: number
      cpu: number
    }>
  }> => {
    return api.get('/system/services')
  },

  /**
   * 导出系统数据
   */
  exportData: (params: {
    type: 'metrics' | 'logs' | 'alerts' | 'all'
    format: 'json' | 'csv' | 'excel'
    startTime?: string
    endTime?: string
  }): Promise<Blob> => {
    return api.post('/system/export', params, { responseType: 'blob' })
  },

  /**
   * 清理系统数据
   */
  cleanupData: (params: {
    type: 'logs' | 'metrics' | 'alerts'
    olderThan: string // ISO date string
  }): Promise<{
    success: boolean
    deletedCount: number
  }> => {
    return api.post('/system/cleanup', params)
  },

  /**
   * 获取系统统计信息
   */
  getStatistics: (timeRange?: string): Promise<{
    statistics: {
      uptime: number
      totalRequests: number
      averageResponseTime: number
      errorRate: number
      peakCpu: number
      peakMemory: number
      totalAlerts: number
      resolvedAlerts: number
    }
  }> => {
    return api.get('/system/statistics', { params: { timeRange } })
  },

  /**
   * 系统备份
   */
  createBackup: (params?: {
    includeData?: boolean
    includeConfig?: boolean
    includeLogs?: boolean
  }): Promise<{
    success: boolean
    backupId: string
    size: number
    path: string
  }> => {
    return api.post('/system/backup', params)
  },

  /**
   * 获取备份列表
   */
  getBackups: (): Promise<{
    backups: Array<{
      id: string
      timestamp: string
      size: number
      type: string
      status: 'completed' | 'failed' | 'in_progress'
    }>
  }> => {
    return api.get('/system/backups')
  },

  /**
   * 恢复系统备份
   */
  restoreBackup: (backupId: string): Promise<{ success: boolean }> => {
    return api.post(`/system/backups/${backupId}/restore`)
  },

  /**
   * 系统诊断
   */
  runDiagnostics: (): Promise<{
    diagnostics: {
      overall: 'healthy' | 'warning' | 'critical'
      checks: Array<{
        name: string
        status: 'pass' | 'warning' | 'fail'
        message: string
        details?: Record<string, any>
      }>
      recommendations: string[]
    }
  }> => {
    return api.post('/system/diagnostics')
  },

  /**
   * 获取系统版本信息
   */
  getVersion: (): Promise<{
    version: {
      application: string
      api: string
      database: string
      buildTime: string
      gitCommit: string
    }
  }> => {
    return api.get('/system/version')
  }
}

export default systemApi
