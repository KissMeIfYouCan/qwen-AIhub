// 设备相关类型
export interface Device {
  id: string
  name: string
  type: 'pump' | 'valve' | 'sensor' | 'motor' | 'controller'
  status: 'online' | 'offline' | 'fault' | 'maintenance'
  location: string
  description?: string
  parameters?: Record<string, any>
  last_update?: string
  created_at?: string
}

// 告警相关类型
export interface AlarmEvent {
  id: string
  device_id: string
  device_name: string
  type: string
  level: 'warning' | 'critical' | 'low' | 'medium' | 'high'
  title?: string
  description?: string
  message: string
  timestamp: string
  occurred_at?: string
  acknowledged_at?: string
  acknowledged_by?: string
  resolved_at?: string
  status: 'active' | 'acknowledged' | 'resolved'
  location: string
}

// 诊断相关类型
export interface DiagnosisRequest {
  device_id: string
  diagnosis_type: 'performance' | 'fault' | 'predictive' | 'comprehensive'
  parameters?: Record<string, any>
}

export interface DiagnosisResult {
  id: string
  device_id: string
  device_name: string
  diagnosis_type: string
  status: string
  confidence: number
  summary: string
  findings: string[]
  recommendations: string[]
  created_at: string
  completed_at?: string
}

// 巡检相关类型
export interface InspectionTask {
  id: string
  name: string
  description: string
  device_ids: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_at: string
  started_at?: string
  completed_at?: string
  assigned_to?: string
  created_by: string
  created_at: string
}

export interface InspectionReport {
  id: string
  task_id: string
  task_name: string
  device_id: string
  device_name: string
  inspector: string
  findings: string[]
  issues: string[]
  recommendations: string[]
  attachments: string[]
  created_at: string
}

// 聊天相关类型
export interface ChatRequest {
  question: string
  context?: Record<string, any>
  session_id?: string
}

export interface ChatResponse {
  answer: string
  confidence: number
  sources: string[]
  suggestions: string[]
  session_id: string
  timestamp: string
}

// 系统配置类型
export interface SystemConfig {
  key: string
  value: any
  description?: string
  category: string
  is_public: boolean
}

// 通用响应类型
export interface ApiResponse<T> {
  data: T
  message?: string
  code?: number
}

export interface ListResponse<T> {
  items: T[]
  total: number
  page?: number
  page_size?: number
}

export * from './polling'
export * from './system'
