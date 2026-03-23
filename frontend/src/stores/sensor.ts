import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type { SensorData, SensorType, SensorStatus, SensorPriority } from '../types'
import { sensorApi } from '../api'
import { wsService } from '../services/WebSocketService'

export const useSensorStore = defineStore('sensor', () => {
  const sensors = ref<SensorData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdateTime = ref<number>(0)
  const selectedSensorId = ref<string | null>(null)
  const sensorHistory = ref<Map<string, SensorData[]>>(new Map())

  const totalSensors = computed(() => sensors.value.length)
  const onlineSensors = computed(() => sensors.value.filter(sensor => sensor.status !== 'offline'))
  const offlineSensors = computed(() => sensors.value.filter(sensor => sensor.status === 'offline'))
  const normalSensors = computed(() => sensors.value.filter(sensor => sensor.status === 'normal'))
  const warningSensors = computed(() => sensors.value.filter(sensor => sensor.status === 'warning'))
  const errorSensors = computed(() => sensors.value.filter(sensor => sensor.status === 'error'))
  const criticalSensors = computed(() => sensors.value.filter(sensor => sensor.priority === 'critical'))

  const sensorsByType = computed(() => {
    const grouped: Record<SensorType, SensorData[]> = {} as Record<SensorType, SensorData[]>
    sensors.value.forEach(sensor => {
      if (!grouped[sensor.type]) {
        grouped[sensor.type] = []
      }
      grouped[sensor.type].push(sensor)
    })
    return grouped
  })

  const sensorsByLocation = computed(() => {
    const grouped: Record<string, SensorData[]> = {}
    sensors.value.forEach(sensor => {
      if (!grouped[sensor.location]) {
        grouped[sensor.location] = []
      }
      grouped[sensor.location].push(sensor)
    })
    return grouped
  })

  const selectedSensor = computed(() => sensors.value.find(sensor => sensor.id === selectedSensorId.value) || null)

  const sensorStatistics = computed(() => ({
    total: totalSensors.value,
    online: onlineSensors.value.length,
    offline: offlineSensors.value.length,
    normal: normalSensors.value.length,
    warning: warningSensors.value.length,
    error: errorSensors.value.length,
    critical: criticalSensors.value.length,
    byType: Object.keys(sensorsByType.value).reduce((acc, type) => {
      acc[type] = sensorsByType.value[type as SensorType].length
      return acc
    }, {} as Record<string, number>),
    byLocation: Object.keys(sensorsByLocation.value).reduce((acc, location) => {
      acc[location] = sensorsByLocation.value[location].length
      return acc
    }, {} as Record<string, number>)
  }))

  const toSensorPriority = (status: SensorStatus): SensorPriority => {
    if (status === 'error') return 'critical'
    if (status === 'warning') return 'high'
    if (status === 'offline') return 'medium'
    return 'low'
  }

  const getThresholdsByType = (type: SensorType): { warning: number; error: number } => {
    const thresholdMap: Record<SensorType, { warning: number; error: number }> = {
      light: { warning: 300, error: 100 },
      temperature: { warning: 35, error: 45 },
      humidity: { warning: 75, error: 90 },
      pressure: { warning: 3.0, error: 3.5 },
      flow: { warning: 20, error: 25 },
      level: { warning: 90, error: 95 },
      vibration: { warning: 1.0, error: 1.5 },
      current: { warning: 10, error: 15 },
      voltage: { warning: 240, error: 250 }
    }
    return thresholdMap[type] || { warning: 80, error: 90 }
  }

  const mapBackendSensor = (sensor: any): SensorData => ({
    id: sensor.sensor_id,
    name: sensor.sensor_name,
    type: sensor.sensor_type as SensorType,
    value: sensor.processed_value,
    unit: sensor.unit,
    status: sensor.status as SensorStatus,
    priority: toSensorPriority(sensor.status as SensorStatus),
    location: sensor.location,
    timestamp: new Date(sensor.timestamp).getTime(),
    thresholds: getThresholdsByType(sensor.sensor_type as SensorType),
    deviceId: sensor.device_id,
    rawData: sensor.raw_data,
    metadata: {
      raw_data: sensor.raw_data
    }
  })

  const fetchSensors = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const response = await sensorApi.refreshLatestSensorData()
      const latestSensors = (response.data || []).map(mapBackendSensor)
      sensors.value = latestSensors
      latestSensors.forEach((sensor: SensorData) => updateSensorHistory(sensor.id, sensor))
      latestSensors.forEach((sensor: SensorData) => wsService.subscribeSensor(sensor.id))
      lastUpdateTime.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取传感器数据失败'
      console.error('获取传感器数据失败:', err)
    } finally {
      loading.value = false
    }
  }

  const addSensor = (sensor: SensorData): void => {
    const existingIndex = sensors.value.findIndex(s => s.id === sensor.id)
    if (existingIndex > -1) {
      sensors.value[existingIndex] = sensor
    } else {
      sensors.value.push(sensor)
    }
    updateSensorHistory(sensor.id, sensor)
    lastUpdateTime.value = Date.now()
  }

  const updateSensor = (sensorId: string, updates: Partial<SensorData>): void => {
    const index = sensors.value.findIndex(s => s.id === sensorId)
    if (index > -1) {
      const nextSensor = { ...sensors.value[index], ...updates }
      sensors.value[index] = nextSensor
      lastUpdateTime.value = Date.now()
    }
  }

  const removeSensor = (sensorId: string): void => {
    const index = sensors.value.findIndex(s => s.id === sensorId)
    if (index > -1) {
      sensors.value.splice(index, 1)
      sensorHistory.value.delete(sensorId)
      if (selectedSensorId.value === sensorId) {
        selectedSensorId.value = null
      }
      lastUpdateTime.value = Date.now()
    }
  }

  const getSensorById = (sensorId: string): SensorData | null => sensors.value.find(s => s.id === sensorId) || null
  const getSensorsByType = (type: SensorType): SensorData[] => sensors.value.filter(s => s.type === type)
  const getSensorsByStatus = (status: SensorStatus): SensorData[] => sensors.value.filter(s => s.status === status)
  const getSensorsByPriority = (priority: SensorPriority): SensorData[] => sensors.value.filter(s => s.priority === priority)
  const getSensorsByLocation = (location: string): SensorData[] => sensors.value.filter(s => s.location === location)
  const selectSensor = (sensorId: string | null): void => { selectedSensorId.value = sensorId }

  const updateSensorHistory = (sensorId: string, data: SensorData): void => {
    if (!sensorHistory.value.has(sensorId)) {
      sensorHistory.value.set(sensorId, [])
    }

    const history = sensorHistory.value.get(sensorId)!
    const lastEntry = history[history.length - 1]

    if (lastEntry) {
      if (lastEntry.timestamp === data.timestamp) {
        history[history.length - 1] = data
      } else if (data.timestamp < lastEntry.timestamp) {
        const existingIndex = history.findIndex(item => item.timestamp === data.timestamp)
        if (existingIndex > -1) {
          history[existingIndex] = data
        } else {
          history.push(data)
          history.sort((a, b) => a.timestamp - b.timestamp)
        }
      } else {
        history.push(data)
      }
    } else {
      history.push(data)
    }

    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }

    triggerRef(sensorHistory)
  }

  const getSensorHistory = (sensorId: string): SensorData[] => sensorHistory.value.get(sensorId) || []

  const clearSensorHistory = (sensorId?: string): void => {
    if (sensorId) {
      sensorHistory.value.delete(sensorId)
    } else {
      sensorHistory.value.clear()
    }
  }

  const searchSensors = (query: string): SensorData[] => {
    const lowerQuery = query.toLowerCase()
    return sensors.value.filter(sensor =>
      sensor.name.toLowerCase().includes(lowerQuery) ||
      sensor.location.toLowerCase().includes(lowerQuery) ||
      sensor.type.toLowerCase().includes(lowerQuery) ||
      sensor.id.toLowerCase().includes(lowerQuery)
    )
  }

  const filterSensors = (filters: {
    type?: SensorType
    status?: SensorStatus
    priority?: SensorPriority
    location?: string
  }): SensorData[] => {
    return sensors.value.filter(sensor => {
      if (filters.type && sensor.type !== filters.type) return false
      if (filters.status && sensor.status !== filters.status) return false
      if (filters.priority && sensor.priority !== filters.priority) return false
      if (filters.location && sensor.location !== filters.location) return false
      return true
    })
  }

  const refreshSensor = async (sensorId: string): Promise<void> => {
    await fetchSensors()
    if (!getSensorById(sensorId)) {
      console.warn(`传感器 ${sensorId} 不存在`)
    }
  }

  const batchUpdateSensors = (updates: Array<{ id: string; data: Partial<SensorData> }>): void => {
    updates.forEach(({ id, data }) => updateSensor(id, data))
  }

  const resetStore = (): void => {
    sensors.value = []
    loading.value = false
    error.value = null
    lastUpdateTime.value = 0
    selectedSensorId.value = null
    sensorHistory.value.clear()
  }

  const setupWebSocketListeners = (): void => {
    wsService.on('sensor_data', (data: SensorData) => {
      updateSensor(data.id, data)
      updateSensorHistory(data.id, data)
    })

    wsService.on('connected', () => {
      sensors.value.forEach(sensor => {
        wsService.subscribeSensor(sensor.id)
      })
    })
  }

  setupWebSocketListeners()

  return {
    sensors,
    loading,
    error,
    lastUpdateTime,
    selectedSensorId,
    sensorHistory,
    totalSensors,
    onlineSensors,
    offlineSensors,
    normalSensors,
    warningSensors,
    errorSensors,
    criticalSensors,
    sensorsByType,
    sensorsByLocation,
    selectedSensor,
    sensorStatistics,
    fetchSensors,
    addSensor,
    updateSensor,
    removeSensor,
    getSensorById,
    getSensorsByType,
    getSensorsByStatus,
    getSensorsByPriority,
    getSensorsByLocation,
    selectSensor,
    updateSensorHistory,
    getSensorHistory,
    clearSensorHistory,
    searchSensors,
    filterSensors,
    refreshSensor,
    batchUpdateSensors,
    resetStore,
    setupWebSocketListeners
  }
})
