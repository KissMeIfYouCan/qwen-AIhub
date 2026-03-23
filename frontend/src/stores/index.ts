import { defineStore } from 'pinia'
import { ref } from 'vue'
import { deviceApi, alarmApi } from '@/api'
import type { Device, AlarmEvent } from '@/types'

export { useSensorStore } from './sensor'
export { usePollingStore } from './polling'
export { useSystemStore } from './system'

export const useAppStore = defineStore('app', () => {
  const devices = ref<Device[]>([])
  const devicesLoading = ref(false)

  const alarms = ref<AlarmEvent[]>([])
  const alarmsLoading = ref(false)

  const systemStatus = ref({
    totalDevices: 0,
    onlineDevices: 0,
    activeAlarms: 0,
    criticalAlarms: 0
  })

  const fetchDevices = async () => {
    devicesLoading.value = true
    try {
      const response: any = await deviceApi.getDevices()
      devices.value = response.devices || response.data || []
      updateSystemStatus()
    } catch (error) {
      console.error('获取设备列表失败:', error)
    } finally {
      devicesLoading.value = false
    }
  }

  const fetchAlarms = async () => {
    alarmsLoading.value = true
    try {
      const response = await alarmApi.getAlarms()
      alarms.value = response.data || []
      updateSystemStatus()
    } catch (error) {
      console.error('获取告警列表失败:', error)
    } finally {
      alarmsLoading.value = false
    }
  }

  const updateSystemStatus = () => {
    systemStatus.value = {
      totalDevices: devices.value.length,
      onlineDevices: devices.value.filter(d => d.status === 'online').length,
      activeAlarms: alarms.value.filter(a => a.status === 'active').length,
      criticalAlarms: alarms.value.filter(a => a.level === 'critical' && a.status === 'active').length
    }
  }

  const initializeData = async () => {
    await Promise.all([
      fetchDevices(),
      fetchAlarms()
    ])
  }

  return {
    devices,
    devicesLoading,
    alarms,
    alarmsLoading,
    systemStatus,
    fetchDevices,
    fetchAlarms,
    initializeData
  }
})
