import type { Device, AlarmEvent } from '@/types'
import type { SensorData } from '@/types'

type SystemStatus = {
  totalDevices: number
  onlineDevices: number
  activeAlarms: number
  criticalAlarms: number
}

type AIContext = {
  systemStatus: SystemStatus
  devices: Array<{
    id: string
    name: string
    status: string
    location: string
    type: string
  }>
  alarms: AlarmEvent[]
}

const normalizeSensorStatus = (status: string): string => {
  if (status === 'normal') return 'online'
  if (status === 'warning') return 'maintenance'
  if (status === 'error') return 'fault'
  return status || 'unknown'
}

export const buildAIContext = (
  appDevices: Device[],
  sensors: SensorData[],
  alarms: AlarmEvent[]
): AIContext => {
  const merged = new Map<string, { id: string; name: string; status: string; location: string; type: string }>()

  for (const device of appDevices) {
    merged.set(device.id, {
      id: device.id,
      name: device.name,
      status: device.status,
      location: device.location,
      type: device.type
    })
  }

  for (const sensor of sensors) {
    const sensorDeviceId = sensor.deviceId || sensor.id
    const current = merged.get(sensorDeviceId)
    merged.set(sensorDeviceId, {
      id: sensorDeviceId,
      name: current?.name || sensor.name,
      status: current?.status || normalizeSensorStatus(sensor.status),
      location: current?.location || sensor.location,
      type: current?.type || 'sensor'
    })
  }

  const devices = Array.from(merged.values())
  const activeAlarms = alarms.filter(alarm => alarm.status === 'active')
  const criticalAlarms = activeAlarms.filter(alarm => alarm.level === 'critical')

  return {
    systemStatus: {
      totalDevices: devices.length,
      onlineDevices: devices.filter(device => device.status === 'online').length,
      activeAlarms: activeAlarms.length,
      criticalAlarms: criticalAlarms.length
    },
    devices,
    alarms
  }
}
