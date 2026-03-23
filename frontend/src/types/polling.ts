/**
 * 轮询相关类型定义
 */

/**
 * 轮询配置
 */
export interface PollingConfig {
  /** 基础轮询间隔（秒） */
  baseInterval: number
  /** 最小轮询间隔（秒） */
  minInterval: number
  /** 最大轮询间隔（秒） */
  maxInterval: number
  /** 算法权重配置 */
  weights?: {
    /** 数值变化幅度权重 */
    variability: number
    /** 设备优先级权重 */
    priority: number
    /** 异常模式识别权重 */
    anomaly: number
    /** 系统负载权重 */
    systemLoad: number
  }
  /** 是否启用AI轮询 */
  enabled: boolean
}

/**
 * 轮询任务
 */
export interface PollingTask {
  /** 传感器ID */
  sensorId: string
  /** 传感器数据 */
  sensor: SensorData
  /** 下次轮询时间戳 */
  nextPollTime: number
  /** 轮询间隔（秒） */
  interval: number
  /** 任务状态 */
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'error' | 'failed' | 'paused'
  /** 重试次数 */
  retryCount: number
  /** 最大重试次数 */
  maxRetries: number
  /** 上次轮询时间 */
  lastPollTime: number | null
  /** 最后一次错误 */
  lastError: Error | null
  /** 定时器ID */
  timeoutId?: NodeJS.Timeout
}

/**
 * 轮询策略
 */
export interface PollingStrategy {
  /** 策略名称 */
  name: string
  /** 策略描述 */
  description: string
  /** 基础间隔 */
  baseInterval: number
  /** 适用的传感器类型 */
  applicableTypes: string[]
  /** 权重配置 */
  weights: PollingConfig['weights']
}

/**
 * 轮询历史记录
 */
export interface PollingHistory {
  /** 记录ID */
  id: string
  /** 传感器ID */
  sensorId: string
  /** 轮询时间戳 */
  timestamp: number
  /** 轮询间隔 */
  interval: number
  /** 响应时间（毫秒） */
  responseTime: number
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 数据值 */
  value?: any
}

/**
 * 轮询统计
 */
export interface PollingStatistics {
  /** 传感器ID */
  sensorId: string
  /** 总轮询次数 */
  totalPolls: number
  /** 成功次数 */
  successCount: number
  /** 失败次数 */
  failureCount: number
  /** 平均响应时间 */
  avgResponseTime: number
  /** 平均轮询间隔 */
  avgInterval: number
  /** 最后轮询时间 */
  lastPollTime: number
  /** 正常运行时间百分比 */
  uptimePercentage: number
}

/**
 * 轮询事件
 */
export interface PollingEvent {
  /** 事件类型 */
  type: 'poll_start' | 'poll_success' | 'poll_error' | 'interval_changed' | 'sensor_added' | 'sensor_removed'
  /** 传感器ID */
  sensorId: string
  /** 时间戳 */
  timestamp: number
  /** 事件数据 */
  data?: any
  /** 错误信息 */
  error?: string
}

/**
 * 轮询队列项
 */
export interface PollingQueueItem {
  /** 传感器ID */
  sensorId: string
  /** 优先级 (1-10, 10最高) */
  priority: number
  /** 预定执行时间 */
  scheduledTime: number
  /** 重试次数 */
  retryCount: number
  /** 创建时间 */
  createdAt: number
}

/**
 * 轮询性能指标
 */
export interface PollingPerformance {
  /** 当前活跃任务数 */
  activeTasks: number
  /** 队列长度 */
  queueLength: number
  /** 平均等待时间（毫秒） */
  avgWaitTime: number
  /** 吞吐量（每秒处理的任务数） */
  throughput: number
  /** 错误率 */
  errorRate: number
  /** 系统负载 */
  systemLoad: number
}

/**
 * 传感器优先级
 */
export type SensorPriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * 传感器状态
 */
export type SensorStatus = 'normal' | 'warning' | 'error' | 'offline'

/**
 * 传感器类型
 */
export type SensorType = 'light' | 'temperature' | 'humidity' | 'pressure' | 'flow' | 'level' | 'vibration' | 'current' | 'voltage'

/**
 * 传感器数据（扩展现有定义）
 */
export interface SensorData {
  /** 传感器ID */
  id: string
  /** 传感器名称 */
  name: string
  /** 传感器类型 */
  type: SensorType
  /** 当前值 */
  value: number | string
  /** 单位 */
  unit: string
  /** 状态 */
  status: SensorStatus
  /** 优先级 */
  priority: SensorPriority
  /** 位置 */
  location: string
  /** 时间戳 */
  timestamp: number
  /** 阈值配置 */
  thresholds?: {
    warning: number
    error: number
  }
  /** 设备ID */
  deviceId?: string
  /** 额外属性 */
  metadata?: Record<string, any>
  /** 原始寄存器数据 */
  rawData?: Record<string, any>
}

/**
 * 轮询服务配置
 */
export interface PollingServiceConfig {
  /** 最大并发任务数 */
  maxConcurrentTasks: number
  /** 任务超时时间（毫秒） */
  taskTimeout: number
  /** 重试配置 */
  retry: {
    maxRetries: number
    backoffMultiplier: number
    maxBackoffTime: number
  }
  /** 历史数据保留配置 */
  history: {
    maxRecords: number
    retentionDays: number
  }
  /** 性能监控配置 */
  monitoring: {
    metricsInterval: number
    alertThresholds: {
      errorRate: number
      responseTime: number
      queueLength: number
    }
  }
}

/**
 * 轮询算法参数
 */
export interface AlgorithmParameters {
  /** 变化检测窗口大小 */
  variabilityWindow: number
  /** 异常检测阈值 */
  anomalyThreshold: number
  /** 趋势分析周期 */
  trendAnalysisPeriod: number
  /** 负载平衡因子 */
  loadBalanceFactor: number
  /** 最小数据点数 */
  minDataPoints: number
}

/**
 * 轮询结果
 */
export interface PollingResult {
  /** 传感器ID */
  sensorId: string
  /** 轮询时间戳 */
  timestamp: number
  /** 是否成功 */
  success: boolean
  /** 传感器数据 */
  data?: SensorData
  /** 错误信息 */
  error?: string
  /** 响应时间（毫秒） */
  responseTime: number
  /** 下次轮询间隔 */
  nextInterval: number
}

/**
 * 轮询调度器状态
 */
export interface SchedulerState {
  /** 是否运行中 */
  isRunning: boolean
  /** 开始时间 */
  startTime: number
  /** 总处理任务数 */
  totalProcessed: number
  /** 当前负载 */
  currentLoad: number
  /** 平均处理时间 */
  avgProcessingTime: number
}