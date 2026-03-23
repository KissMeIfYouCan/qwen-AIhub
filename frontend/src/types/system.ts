/**
 * 系统监控相关类型定义
 */

/**
 * 系统指标扩展
 */
export interface SystemMetrics {
  /** CPU使用率 (0-100) */
  cpu: number
  /** 内存使用率 (0-100) */
  memory: number
  /** 网络负载 (0-100) */
  networkLoad: number
  /** 活跃轮询任务数 */
  activePollingTasks: number
  /** 磁盘I/O使用率 (0-100) */
  diskIO?: number
  /** 数据库连接数 */
  dbConnections?: number
  /** API响应时间（毫秒） */
  apiResponseTime?: number
  /** 时间戳 */
  timestamp?: number
}

/**
 * 系统健康状态
 */
export interface SystemHealth {
  /** 整体状态 */
  status: 'good' | 'moderate' | 'warning' | 'critical' | 'unknown'
  /** 健康评分 (0-100) */
  score: number
  /** 各组件状态 */
  components: {
    cpu: ComponentHealth
    memory: ComponentHealth
    network: ComponentHealth
    database: ComponentHealth
    api: ComponentHealth
  }
  /** 运行时间（毫秒） */
  uptime: number
  /** 最后检查时间 */
  lastCheck: number
}

/**
 * 组件健康状态
 */
export interface ComponentHealth {
  /** 状态 */
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  /** 当前值 */
  value: number
  /** 阈值 */
  thresholds: {
    warning: number
    critical: number
  }
  /** 趋势 */
  trend: 'stable' | 'rising' | 'falling'
  /** 消息 */
  message?: string
}

/**
 * 系统资源信息
 */
export interface SystemResources {
  /** CPU信息 */
  cpu: {
    usage: number
    cores: number
    frequency: number
    model: string
    temperature?: number
  }
  /** 内存信息 */
  memory: {
    used: number
    total: number
    available: number
    cached: number
    buffers: number
  }
  /** 磁盘信息 */
  disk: {
    used: number
    total: number
    available: number
    readSpeed: number
    writeSpeed: number
  }
  /** 网络信息 */
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
    interfaces: NetworkInterface[]
  }
}

/**
 * 网络接口信息
 */
export interface NetworkInterface {
  name: string
  type: string
  status: 'up' | 'down'
  speed: number
  bytesIn: number
  bytesOut: number
}

/**
 * 系统进程信息
 */
export interface SystemProcess {
  pid: number
  name: string
  cpu: number
  memory: number
  status: 'running' | 'sleeping' | 'stopped' | 'zombie'
  startTime: number
  command: string
  user: string
}

/**
 * 系统日志
 */
export interface SystemLog {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  source: string
  category: string
  metadata?: Record<string, any>
  stackTrace?: string
}

/**
 * 系统告警
 */
export interface SystemAlert {
  id: string
  type: string
  title: string
  message: string
  level: 'info' | 'warning' | 'error' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  timestamp: string
  source: string
  category: string
  metadata?: Record<string, any>
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolvedBy?: string
  resolvedAt?: string
  resolution?: string
}

/**
 * 系统配置
 */
export interface SystemConfig {
  /** 监控配置 */
  monitoring: {
    enabled: boolean
    interval: number
    retention: number
    thresholds: Record<string, { warning: number; error: number }>
    autoCleanup: boolean
  }
  /** 告警配置 */
  alerts: {
    enabled: boolean
    channels: AlertChannel[]
    rules: AlertRule[]
    rateLimiting: {
      enabled: boolean
      maxPerMinute: number
    }
  }
  /** 性能配置 */
  performance: {
    maxConcurrentTasks: number
    taskTimeout: number
    retryAttempts: number
    cacheSize: number
  }
  /** 安全配置 */
  security: {
    authEnabled: boolean
    sessionTimeout: number
    maxLoginAttempts: number
    passwordPolicy: PasswordPolicy
  }
}

/**
 * 告警通道
 */
export interface AlertChannel {
  id: string
  name: string
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams'
  enabled: boolean
  config: Record<string, any>
}

/**
 * 告警规则
 */
export interface AlertRule {
  id: string
  name: string
  description: string
  condition: string
  level: 'info' | 'warning' | 'error' | 'critical'
  enabled: boolean
  channels: string[]
  cooldown: number
  metadata?: Record<string, any>
}

/**
 * 密码策略
 */
export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number
}

/**
 * 系统服务
 */
export interface SystemService {
  name: string
  displayName: string
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping'
  uptime: number
  memory: number
  cpu: number
  pid?: number
  port?: number
  version?: string
  dependencies: string[]
}

/**
 * 系统统计
 */
export interface SystemStatistics {
  /** 运行时间 */
  uptime: number
  /** 总请求数 */
  totalRequests: number
  /** 平均响应时间 */
  averageResponseTime: number
  /** 错误率 */
  errorRate: number
  /** 峰值CPU */
  peakCpu: number
  /** 峰值内存 */
  peakMemory: number
  /** 总告警数 */
  totalAlerts: number
  /** 已解决告警数 */
  resolvedAlerts: number
  /** 活跃用户数 */
  activeUsers: number
  /** 数据传输量 */
  dataTransferred: number
}

/**
 * 系统备份
 */
export interface SystemBackup {
  id: string
  timestamp: string
  size: number
  type: 'full' | 'incremental' | 'differential'
  status: 'completed' | 'failed' | 'in_progress' | 'cancelled'
  path: string
  checksum: string
  metadata?: {
    includeData: boolean
    includeConfig: boolean
    includeLogs: boolean
    compression: string
  }
}

/**
 * 系统诊断
 */
export interface SystemDiagnostics {
  overall: 'healthy' | 'warning' | 'critical'
  timestamp: string
  checks: DiagnosticCheck[]
  recommendations: string[]
  summary: {
    total: number
    passed: number
    warnings: number
    failed: number
  }
}

/**
 * 诊断检查
 */
export interface DiagnosticCheck {
  name: string
  category: string
  status: 'pass' | 'warning' | 'fail'
  message: string
  details?: Record<string, any>
  duration: number
  recommendations?: string[]
}

/**
 * 系统版本信息
 */
export interface SystemVersion {
  application: string
  api: string
  database: string
  buildTime: string
  gitCommit: string
  gitBranch: string
  environment: string
  dependencies: Record<string, string>
}

/**
 * API响应基础类型
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
  requestId: string
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 导出参数
 */
export interface ExportParams {
  type: 'metrics' | 'logs' | 'alerts' | 'all'
  format: 'json' | 'csv' | 'excel' | 'pdf'
  startTime?: string
  endTime?: string
  filters?: Record<string, any>
}

/**
 * 清理参数
 */
export interface CleanupParams {
  type: 'logs' | 'metrics' | 'alerts' | 'backups'
  olderThan: string
  dryRun?: boolean
}

/**
 * 系统事件
 */
export interface SystemEvent {
  id: string
  type: string
  category: string
  timestamp: string
  source: string
  user?: string
  description: string
  metadata?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: string
  tags?: Record<string, string>
  metadata?: Record<string, any>
}