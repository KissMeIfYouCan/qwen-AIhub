import { EventEmitter } from '../utils/EventEmitter'
import type { SensorData, PollingEvent } from '../types'

/**
 * WebSocket服务
 * 处理实时传感器数据流和轮询事件
 */
export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000
  private isConnecting: boolean = false
  private isManualClose: boolean = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatTimeout: NodeJS.Timeout | null = null
  private subscriptions: Set<string> = new Set()

  constructor(url: string = 'ws://localhost:8002/ws') {
    super()
    this.url = url
  }

  /**
   * 连接WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接')
      return
    }

    if (this.isConnecting) {
      console.log('WebSocket正在连接中')
      return
    }

    this.isConnecting = true
    this.isManualClose = false

    try {
      this.ws = new WebSocket(this.url)
      this.setupEventHandlers()

      // 等待连接建立
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket连接超时'))
        }, 10000)

        this.ws!.onopen = () => {
          clearTimeout(timeout)
          resolve()
        }

        this.ws!.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })

    } catch (error) {
      this.isConnecting = false
      throw error
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    this.isManualClose = true
    this.clearHeartbeat()

    if (this.ws) {
      this.ws.close(1000, '手动断开连接')
      this.ws = null
    }

    this.subscriptions.clear()
    this.reconnectAttempts = 0
    this.isConnecting = false

    this.emit('disconnected')
    console.log('WebSocket已断开连接')
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.startHeartbeat()

      // 重新订阅之前的传感器
      this.resubscribe()

      this.emit('connected')
      console.log('WebSocket连接已建立')
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('解析WebSocket消息失败:', error)
      }
    }

    this.ws.onclose = (event) => {
      this.isConnecting = false
      this.clearHeartbeat()

      if (!this.isManualClose) {
        console.log(`WebSocket连接关闭: ${event.code} - ${event.reason}`)
        this.handleReconnect()
      }

      this.emit('disconnected', event.code, event.reason)
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error)
      this.emit('error', error)
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'sensor_data':
        this.handleSensorData(message.data)
        break

      case 'polling_event':
        this.handlePollingEvent(message.data)
        break

      case 'system_metrics':
        this.handleSystemMetrics(message.data)
        break

      case 'heartbeat_response':
        this.handleHeartbeatResponse()
        break

      case 'subscription_confirmed':
        console.log(`订阅确认: ${message.sensorId}`)
        break

      case 'error':
        console.error('服务器错误:', message.error)
        this.emit('server_error', message.error)
        break

      default:
        console.warn('未知消息类型:', message.type)
    }
  }

  /**
   * 处理传感器数据
   */
  private handleSensorData(data: SensorData): void {
    this.emit('sensor_data', data)
  }

  /**
   * 处理轮询事件
   */
  private handlePollingEvent(event: PollingEvent): void {
    this.emit('polling_event', event)
  }

  /**
   * 处理系统指标
   */
  private handleSystemMetrics(metrics: any): void {
    this.emit('system_metrics', metrics)
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeatResponse(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  /**
   * 发送消息
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，无法发送消息')
    }
  }

  /**
   * 订阅传感器数据
   */
  subscribeSensor(sensorId: string): void {
    this.subscriptions.add(sensorId)

    this.sendMessage({
      type: 'subscribe_sensor',
      sensorId: sensorId
    })

    console.log(`已订阅传感器: ${sensorId}`)
  }

  /**
   * 取消订阅传感器数据
   */
  unsubscribeSensor(sensorId: string): void {
    this.subscriptions.delete(sensorId)

    this.sendMessage({
      type: 'unsubscribe_sensor',
      sensorId: sensorId
    })

    console.log(`已取消订阅传感器: ${sensorId}`)
  }

  /**
   * 订阅轮询事件
   */
  subscribePollingEvents(): void {
    this.sendMessage({
      type: 'subscribe_polling_events'
    })

    console.log('已订阅轮询事件')
  }

  /**
   * 订阅系统指标
   */
  subscribeSystemMetrics(): void {
    this.sendMessage({
      type: 'subscribe_system_metrics'
    })

    console.log('已订阅系统指标')
  }

  /**
   * 重新订阅
   */
  private resubscribe(): void {
    // 重新订阅传感器
    this.subscriptions.forEach(sensorId => {
      this.sendMessage({
        type: 'subscribe_sensor',
        sensorId: sensorId
      })
    })

    // 重新订阅轮询事件和系统指标
    this.subscribePollingEvents()
    this.subscribeSystemMetrics()
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.clearHeartbeat()

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'heartbeat' })

        // 设置心跳超时
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('心跳超时，连接可能已断开')
          this.ws?.close()
        }, 5000)
      }
    }, 30000) // 每30秒发送一次心跳
  }

  /**
   * 清除心跳
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      this.emit('reconnect_failed')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连`)

    setTimeout(() => {
      if (!this.isManualClose) {
        this.connect().catch(error => {
          console.error('重连失败:', error)
          this.handleReconnect()
        })
      }
    }, delay)
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): {
    connected: boolean
    connecting: boolean
    readyState: number | null
    reconnectAttempts: number
    subscriptions: string[]
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      connecting: this.isConnecting,
      readyState: this.ws?.readyState || null,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions)
    }
  }

  /**
   * 发送轮询指令
   */
  sendPollingCommand(command: string, params?: any): void {
    this.sendMessage({
      type: 'polling_command',
      command: command,
      params: params
    })
  }

  /**
   * 请求传感器历史数据
   */
  requestSensorHistory(sensorId: string, timeRange: { start: number, end: number }): void {
    this.sendMessage({
      type: 'request_sensor_history',
      sensorId: sensorId,
      timeRange: timeRange
    })
  }

  /**
   * 更新轮询配置
   */
  updatePollingConfig(config: any): void {
    this.sendMessage({
      type: 'update_polling_config',
      config: config
    })
  }

  /**
   * 获取实时统计信息
   */
  requestRealtimeStats(): void {
    this.sendMessage({
      type: 'request_realtime_stats'
    })
  }
}

// 创建全局WebSocket服务实例
export const wsService = new WebSocketService()

// 自动连接（可选）
if (typeof window !== 'undefined') {
  // 页面加载时自动连接
  window.addEventListener('load', () => {
    wsService.connect().catch(error => {
      console.error('WebSocket自动连接失败:', error)
    })
  })

  // 页面卸载时断开连接
  window.addEventListener('beforeunload', () => {
    wsService.disconnect()
  })

  // 网络状态变化时处理重连
  window.addEventListener('online', () => {
    if (!wsService.getConnectionState().connected) {
      wsService.connect().catch(error => {
        console.error('网络恢复后重连失败:', error)
      })
    }
  })
}

export default WebSocketService