import type { SensorData, PollingConfig, SystemMetrics } from '../types'

/**
 * AI动态轮询算法
 * 根据传感器数据变化、设备优先级、历史异常模式和系统负载
 * 智能计算下一次轮询的时间间隔
 */
export class AIPollingAlgorithm {
  private config: PollingConfig
  private systemMetrics: SystemMetrics | null = null

  constructor(config: PollingConfig) {
    this.config = config
  }

  /**
   * 计算下一次轮询间隔
   * @param sensor 传感器数据
   * @param history 历史数据数组
   * @returns 下次轮询间隔（秒）
   */
  calculateNextInterval(sensor: SensorData, history: SensorData[]): number {
    // 1. 数值变化幅度分析 (30%)
    const variabilityScore = this.analyzeVariability(history)

    // 2. 设备状态和优先级 (25%)
    const priorityScore = this.calculatePriorityScore(sensor)

    // 3. 历史异常模式识别 (25%)
    const anomalyScore = this.detectAnomalyPattern(history)

    // 4. 系统负载和资源限制 (20%)
    const resourceScore = this.assessSystemLoad()

    // 综合计算下次轮询间隔
    const baseInterval = this.config.baseInterval || 30 // 默认30秒
    const multiplier = this.calculateMultiplier(
      variabilityScore,
      priorityScore,
      anomalyScore,
      resourceScore
    )

    // 应用配置的最小和最大间隔限制
    const calculatedInterval = baseInterval * multiplier
    return Math.max(
      Math.min(calculatedInterval, this.config.maxInterval || 3600),
      this.config.minInterval || 5
    )
  }

  /**
   * 分析数值变化幅度
   * 变化越大，轮询频率应该越高
   */
  private analyzeVariability(history: SensorData[]): number {
    if (history.length < 2) return 0.5 // 默认中等变化

    // 计算最近几个数据点的变化率
    const recentData = history.slice(-10) // 取最近10个数据点
    let totalVariation = 0
    let validComparisons = 0

    for (let i = 1; i < recentData.length; i++) {
      const current = parseFloat(recentData[i].value?.toString() || '0')
      const previous = parseFloat(recentData[i - 1].value?.toString() || '0')

      if (!isNaN(current) && !isNaN(previous) && previous !== 0) {
        const variation = Math.abs((current - previous) / previous)
        totalVariation += variation
        validComparisons++
      }
    }

    if (validComparisons === 0) return 0.5

    const avgVariation = totalVariation / validComparisons

    // 将变化率映射到0-1的分数
    // 变化率越高，分数越高，需要更频繁的轮询
    if (avgVariation > 0.2) return 1.0 // 高变化
    if (avgVariation > 0.1) return 0.8 // 中高变化
    if (avgVariation > 0.05) return 0.6 // 中等变化
    if (avgVariation > 0.02) return 0.4 // 低变化
    return 0.2 // 极低变化
  }

  /**
   * 计算设备优先级分数
   */
  private calculatePriorityScore(sensor: SensorData): number {
    let score = 0.5 // 默认中等优先级

    // 根据设备优先级调整
    switch (sensor.priority) {
      case 'critical':
        score = 1.0
        break
      case 'high':
        score = 0.8
        break
      case 'medium':
        score = 0.5
        break
      case 'low':
        score = 0.2
        break
    }

    // 根据设备状态调整
    switch (sensor.status) {
      case 'error':
        score = Math.min(score + 0.3, 1.0) // 错误状态提高优先级
        break
      case 'warning':
        score = Math.min(score + 0.2, 1.0) // 警告状态适度提高
        break
      case 'offline':
        score = Math.min(score + 0.4, 1.0) // 离线状态大幅提高
        break
      case 'normal':
        // 正常状态不调整
        break
    }

    // 根据设备类型调整
    const criticalTypes = ['temperature', 'pressure', 'safety']
    if (criticalTypes.includes(sensor.type)) {
      score = Math.min(score + 0.1, 1.0)
    }

    return score
  }

  /**
   * 检测历史异常模式
   */
  private detectAnomalyPattern(history: SensorData[]): number {
    if (history.length < 5) return 0.3 // 数据不足，默认低异常风险

    const recentData = history.slice(-20) // 分析最近20个数据点
    let anomalyCount = 0
    let trendScore = 0

    // 检测异常值
    const values = recentData
      .map(d => parseFloat(d.value?.toString() || '0'))
      .filter(v => !isNaN(v))

    if (values.length < 3) return 0.3

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    // 统计超出2个标准差的异常值
    values.forEach(value => {
      if (Math.abs(value - mean) > 2 * stdDev) {
        anomalyCount++
      }
    })

    const anomalyRate = anomalyCount / values.length

    // 检测趋势变化
    if (values.length >= 5) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2))
      const secondHalf = values.slice(Math.floor(values.length / 2))

      const firstMean = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
      const secondMean = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

      const trendChange = Math.abs(secondMean - firstMean) / (firstMean || 1)
      trendScore = Math.min(trendChange, 1.0)
    }

    // 综合异常分数
    const combinedScore = (anomalyRate * 0.7) + (trendScore * 0.3)

    // 映射到0-1范围
    if (combinedScore > 0.3) return 1.0 // 高异常风险
    if (combinedScore > 0.2) return 0.8 // 中高异常风险
    if (combinedScore > 0.1) return 0.6 // 中等异常风险
    if (combinedScore > 0.05) return 0.4 // 低异常风险
    return 0.2 // 极低异常风险
  }

  /**
   * 评估系统负载
   */
  private assessSystemLoad(): number {
    if (!this.systemMetrics) return 0.5 // 默认中等负载

    const { cpu, memory, networkLoad, activePollingTasks } = this.systemMetrics

    // CPU负载评分 (0-1)
    const cpuScore = Math.min(cpu / 100, 1.0)

    // 内存负载评分 (0-1)
    const memoryScore = Math.min(memory / 100, 1.0)

    // 网络负载评分 (0-1)
    const networkScore = Math.min(networkLoad / 100, 1.0)

    // 轮询任务负载评分
    const maxTasks = 100 // 假设最大并发任务数
    const taskScore = Math.min(activePollingTasks / maxTasks, 1.0)

    // 综合负载分数
    const loadScore = (cpuScore * 0.3) + (memoryScore * 0.3) +
                     (networkScore * 0.2) + (taskScore * 0.2)

    return loadScore
  }

  /**
   * 计算轮询间隔倍数
   */
  private calculateMultiplier(
    variabilityScore: number,
    priorityScore: number,
    anomalyScore: number,
    resourceScore: number
  ): number {
    const weights = this.config.weights || {
      variability: 0.30,
      priority: 0.25,
      anomaly: 0.25,
      systemLoad: 0.20
    }

    // 计算加权分数
    const weightedScore =
      (variabilityScore * weights.variability) +
      (priorityScore * weights.priority) +
      (anomalyScore * weights.anomaly) +
      (resourceScore * weights.systemLoad)

    // 分数越高，需要更频繁的轮询，倍数越小
    // 分数越低，可以降低轮询频率，倍数越大

    // 使用反比例函数计算倍数
    // 当分数为1时，倍数为0.5（更频繁）
    // 当分数为0时，倍数为2.0（更稀疏）
    const multiplier = 0.5 + (1.5 * (1 - weightedScore))

    return Math.max(0.2, Math.min(multiplier, 5.0)) // 限制在0.2-5.0之间
  }

  /**
   * 更新系统指标
   */
  updateSystemMetrics(metrics: SystemMetrics): void {
    this.systemMetrics = metrics
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PollingConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取算法状态信息
   */
  getAlgorithmStatus(): {
    config: PollingConfig
    systemMetrics: SystemMetrics | null
    isActive: boolean
  } {
    return {
      config: this.config,
      systemMetrics: this.systemMetrics,
      isActive: true
    }
  }

  /**
   * 预测未来轮询间隔趋势
   */
  predictPollingTrend(sensor: SensorData, history: SensorData[], steps: number = 5): number[] {
    const predictions: number[] = []
    let currentHistory = [...history]

    for (let i = 0; i < steps; i++) {
      const interval = this.calculateNextInterval(sensor, currentHistory)
      predictions.push(interval)

      // 模拟下一个数据点（简单预测）
      if (currentHistory.length > 0) {
        const lastValue = parseFloat(currentHistory[currentHistory.length - 1].value?.toString() || '0')
        const simulatedNext: SensorData = {
          ...sensor,
          value: lastValue + (Math.random() - 0.5) * 2, // 简单的随机变化
          timestamp: Date.now() + (i + 1) * interval * 1000
        }
        currentHistory.push(simulatedNext)
      }
    }

    return predictions
  }
}

/**
 * 创建默认的轮询配置
 */
export function createDefaultPollingConfig(): PollingConfig {
  return {
    baseInterval: 30,
    minInterval: 5,
    maxInterval: 300,
    weights: {
      variability: 0.30,
      priority: 0.25,
      anomaly: 0.25,
      systemLoad: 0.20
    },
    enabled: true
  }
}

/**
 * 验证轮询配置
 */
export function validatePollingConfig(config: PollingConfig): string[] {
  const errors: string[] = []

  if (config.baseInterval < 1) {
    errors.push('基础轮询间隔不能小于1秒')
  }

  if (config.minInterval < 1) {
    errors.push('最小轮询间隔不能小于1秒')
  }

  if (config.maxInterval < config.minInterval) {
    errors.push('最大轮询间隔不能小于最小轮询间隔')
  }

  if (config.weights) {
    const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0)
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      errors.push('权重总和必须等于1.0')
    }

    Object.entries(config.weights).forEach(([key, weight]) => {
      if (weight < 0 || weight > 1) {
        errors.push(`权重 ${key} 必须在0-1之间`)
      }
    })
  }

  return errors
}