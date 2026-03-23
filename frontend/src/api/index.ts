import api from './request'
import { systemApi } from './system'

// 导出系统 API
export { systemApi }

// 设备相关接口
export const deviceApi = {
  // 获取设备列表
  getDevices: (params?: any) => api.get('/devices', { params }),
  // 获取设备详情
  getDevice: (id: string) => api.get(`/devices/${id}`)
}

// 报告相关接口
export const reportApi = {
  getReports: (params?: any) => api.get('/reports', { params }),
  getReport: (id: string) => api.get(`/reports/${id}`),
  createReport: (data: any) => api.post('/reports', data),
  deleteReport: (id: string) => api.delete(`/reports/${id}`),
  downloadReport: (id: string) => api.get(`/reports/${id}/download`, { responseType: 'blob' })
}

// 传感器数据相关接口
export const sensorApi = {
  // 获取传感器数据
  getSensorData: (params?: any) => api.get('/sensor-data', { params }),
  // 获取最新传感器数据
  getLatestSensorData: () => api.get('/sensor-data/latest'),
  // 创建传感器数据
  createSensorData: (data: any) => api.post('/sensor-data', data),
  // 触发网关采集
  pollGateway: (data?: any) => api.post('/gateway/poll', data ?? { modbus_host: '172.1.1.100' }),
  // 采集后获取最新传感器数据
  refreshLatestSensorData: async (pollPayload?: any) => {
    await api.post('/gateway/poll', pollPayload ?? { modbus_host: '172.1.1.100' })
    return api.get('/sensor-data/latest')
  },
  // 获取传感器列表
  getSensors: (params?: any) => api.get('/sensors', { params }),
  // 获取传感器详情
  getSensor: (id: string) => api.get(`/sensors/${id}`),
  // 更新传感器配置
  updateSensor: (id: string, data: any) => api.put(`/sensors/${id}`, data),
  // 删除传感器
  deleteSensor: (id: string) => api.delete(`/sensors/${id}`),
  // 获取传感器历史数据
  getSensorHistory: (id: string, params?: any) => api.get(`/sensors/${id}/history`, { params }),
  // 强制轮询传感器
  forcePoll: (id: string) => api.post(`/sensors/${id}/poll`),
  // 批量操作传感器
  batchOperation: (data: { operation: string; sensorIds: string[] }) =>
    api.post('/sensors/batch', data)
}

// 告警相关接口
export const alarmApi = {
  // 获取告警列表
  getAlarms: (params?: any) => api.get('/alarms', { params }),
  // 获取告警详情
  getAlarm: (id: string) => api.get(`/alarms/${id}`),
  // 确认告警
  acknowledgeAlarm: (id: string, acknowledgedBy: string) =>
    api.post(`/alarms/${id}/acknowledge`, { acknowledged_by: acknowledgedBy })
}

// 诊断相关接口
export const diagnosisApi = {
  // 设备诊断分析
  analyzeDevice: (data: any) => api.post('/diagnosis/analyze', data),
  // 获取诊断结果
  getDiagnosisResult: (id: string) => api.get(`/diagnosis/${id}`)
}

// 巡检相关接口
export const inspectionApi = {
  // 获取巡检任务列表
  getTasks: (params?: any) => api.get('/inspection/tasks', { params }),
  // 获取巡检任务详情
  getTask: (id: string) => api.get(`/inspection/tasks/${id}`),
  // 获取巡检报告列表
  getReports: (params?: any) => api.get('/inspection/reports', { params })
}

// 聊天相关接口
export const chatApi = {
  // 发送问题
  askQuestion: (data: any) => api.post('/chat/ask', data)
}

// 系统配置相关接口
export const configApi = {
  // 获取系统配置列表
  getConfigs: (params?: any) => api.get('/system-config', { params }),
  // 获取单个配置
  getConfig: (key: string) => api.get(`/system-config/${key}`),
  // 更新配置
  updateConfig: (key: string, data: any) => api.put(`/system-config/${key}`, data)
}

// 健康检查
export const healthApi = {
  check: () => api.get('/health')
}

// 轮询相关接口
export const pollingApi = {
  // 获取轮询配置
  getConfig: () => api.get('/polling/config'),
  // 更新轮询配置
  updateConfig: (data: any) => api.put('/polling/config', data),
  // 获取轮询任务列表
  getTasks: (params?: any) => api.get('/polling/tasks', { params }),
  // 获取轮询任务详情
  getTask: (id: string) => api.get(`/polling/tasks/${id}`),
  // 启动轮询服务
  startService: () => api.post('/polling/start'),
  // 停止轮询服务
  stopService: () => api.post('/polling/stop'),
  // 获取轮询服务状态
  getServiceStatus: () => api.get('/polling/status'),
  // 添加传感器到轮询
  addSensor: (sensorId: string, config?: any) =>
    api.post('/polling/sensors', { sensorId, config }),
  // 从轮询中移除传感器
  removeSensor: (sensorId: string) =>
    api.delete(`/polling/sensors/${sensorId}`),
  // 暂停传感器轮询
  pauseSensor: (sensorId: string) =>
    api.post(`/polling/sensors/${sensorId}/pause`),
  // 恢复传感器轮询
  resumeSensor: (sensorId: string) =>
    api.post(`/polling/sensors/${sensorId}/resume`),
  // 强制轮询传感器
  forcePollSensor: (sensorId: string) =>
    api.post(`/polling/sensors/${sensorId}/force-poll`),
  // 获取轮询统计
  getStatistics: (timeRange?: string) =>
    api.get('/polling/statistics', { params: { timeRange } }),
  // 获取轮询事件
  getEvents: (params?: any) =>
    api.get('/polling/events', { params }),
  // 导出轮询数据
  exportData: (params: any) =>
    api.post('/polling/export', params, { responseType: 'blob' }),
  // 获取AI算法状态
  getAlgorithmStatus: () => api.get('/polling/algorithm/status'),
  // 更新AI算法参数
  updateAlgorithmParams: (params: any) =>
    api.put('/polling/algorithm/params', params),
  // 预测轮询趋势
  predictTrend: (sensorId: string, steps?: number) =>
    api.post('/polling/algorithm/predict', { sensorId, steps })
}
