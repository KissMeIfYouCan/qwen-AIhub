<template>
  <div class="diagnosis-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>异常诊断</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showNewDiagnosisDialog">
          <el-icon><Plus /></el-icon>
          新建诊断
        </el-button>
      </div>
    </div>

    <!-- 诊断表单 -->
    <el-card v-if="showDiagnosisForm" class="diagnosis-form-card">
      <template #header>
        <div class="card-header">
          <span>设备诊断分析</span>
          <el-button size="small" @click="hideDiagnosisForm">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </template>

      <el-form :model="diagnosisForm" :rules="diagnosisRules" ref="diagnosisFormRef" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择设备" prop="device_id">
              <el-select v-model="diagnosisForm.device_id" placeholder="请选择要诊断的设备" style="width: 100%">
                <el-option
                  v-for="device in devices"
                  :key="device.id"
                  :label="device.name"
                  :value="device.id"
                >
                  <span>{{ device.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ device.location }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="诊断类型" prop="diagnosis_type">
              <el-select v-model="diagnosisForm.diagnosis_type" placeholder="请选择诊断类型" style="width: 100%">
                <el-option label="性能分析" value="performance" />
                <el-option label="故障诊断" value="fault" />
                <el-option label="预测性维护" value="predictive" />
                <el-option label="综合诊断" value="comprehensive" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="诊断参数">
          <el-input
            v-model="diagnosisForm.parameters"
            type="textarea"
            :rows="3"
            placeholder="请输入诊断参数（JSON格式，可选）"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitDiagnosis" :loading="diagnosisLoading">
            <el-icon><Tools /></el-icon>
            开始诊断
          </el-button>
          <el-button @click="resetDiagnosisForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 诊断结果列表 -->
    <el-card class="results-card">
      <template #header>
        <span>诊断历史</span>
      </template>

      <el-table :data="diagnosisResults" v-loading="resultsLoading" style="width: 100%">
        <el-table-column prop="device_name" label="设备名称" min-width="150">
          <template #default="{ row }">
            <div class="device-name">
              <el-icon class="device-icon"><Setting /></el-icon>
              {{ row.device_name }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="diagnosis_type" label="诊断类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getDiagnosisTypeText(row.diagnosis_type) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getDiagnosisStatusType(row.status)" size="small">
              {{ getDiagnosisStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="confidence" label="置信度" width="100">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round(row.confidence * 100)"
              :color="getConfidenceColor(row.confidence)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>

        <el-table-column prop="summary" label="诊断摘要" min-width="200" show-overflow-tooltip />

        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDiagnosisResult(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 诊断结果详情对话框 -->
    <el-dialog v-model="resultDetailVisible" title="诊断结果详情" width="800px">
      <div v-if="selectedResult" class="result-detail">
        <!-- 基本信息 -->
        <el-descriptions :column="3" border class="detail-section">
          <el-descriptions-item label="设备名称">{{ selectedResult.device_name }}</el-descriptions-item>
          <el-descriptions-item label="诊断类型">{{ getDiagnosisTypeText(selectedResult.diagnosis_type) }}</el-descriptions-item>
          <el-descriptions-item label="诊断状态">
            <el-tag :type="getDiagnosisStatusType(selectedResult.status)">
              {{ getDiagnosisStatusText(selectedResult.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="置信度" :span="3">
            <el-progress
              :percentage="Math.round(selectedResult.confidence * 100)"
              :color="getConfidenceColor(selectedResult.confidence)"
            />
          </el-descriptions-item>
        </el-descriptions>

        <!-- 诊断摘要 -->
        <div class="detail-section">
          <h4>诊断摘要</h4>
          <el-alert :title="selectedResult.summary" type="info" :closable="false" />
        </div>

        <!-- 发现问题 -->
        <div class="detail-section" v-if="selectedResult.findings?.length">
          <h4>发现问题</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(finding, index) in selectedResult.findings"
              :key="index"
              :icon="WarningFilled"
              type="warning"
            >
              {{ finding }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 处理建议 -->
        <div class="detail-section" v-if="selectedResult.recommendations?.length">
          <h4>处理建议</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(recommendation, index) in selectedResult.recommendations"
              :key="index"
              :icon="Tools"
              type="primary"
            >
              {{ recommendation }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 时间信息 -->
        <div class="detail-section">
          <h4>时间信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="创建时间">{{ formatDateTime(selectedResult.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">
              {{ selectedResult.completed_at ? formatDateTime(selectedResult.completed_at) : '未完成' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <el-button @click="resultDetailVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportDiagnosisReport">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores'
import { diagnosisApi } from '@/api'
import { ElMessage } from 'element-plus'
import { WarningFilled, Tools } from '@element-plus/icons-vue'
import type { DiagnosisRequest, DiagnosisResult } from '@/types'

interface DiagnosisFormState {
  device_id: string
  diagnosis_type: DiagnosisRequest['diagnosis_type']
  parameters: string
}

const route = useRoute()
const appStore = useAppStore()

const { devices } = storeToRefs(appStore)

// 表单相关
const showDiagnosisForm = ref(false)
const diagnosisForm = ref<DiagnosisFormState>({
  device_id: '',
  diagnosis_type: 'comprehensive',
  parameters: ''
})

const diagnosisRules = {
  device_id: [{ required: true, message: '请选择设备', trigger: 'change' }],
  diagnosis_type: [{ required: true, message: '请选择诊断类型', trigger: 'change' }]
}

const diagnosisFormRef = ref()
const diagnosisLoading = ref(false)

// 结果相关
const diagnosisResults = ref<DiagnosisResult[]>([])
const resultsLoading = ref(false)
const resultDetailVisible = ref(false)
const selectedResult = ref<DiagnosisResult | null>(null)

// 工具函数
const getDiagnosisTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    performance: '性能分析',
    fault: '故障诊断',
    predictive: '预测性维护',
    comprehensive: '综合诊断'
  }
  return typeMap[type] || type
}

const getDiagnosisStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    completed: 'success',
    processing: 'warning',
    failed: 'danger'
  }
  return typeMap[status] || 'info'
}

const getDiagnosisStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    completed: '已完成',
    processing: '处理中',
    failed: '失败'
  }
  return textMap[status] || status
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return '#67C23A'
  if (confidence >= 0.6) return '#E6A23C'
  return '#F56C6C'
}

const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString()
}

// 事件处理
const showNewDiagnosisDialog = () => {
  showDiagnosisForm.value = true

  // 如果URL中有deviceId参数，自动选择该设备
  const deviceId = route.query.deviceId as string
  if (deviceId) {
    diagnosisForm.value.device_id = deviceId
  }
}

const hideDiagnosisForm = () => {
  showDiagnosisForm.value = false
  resetDiagnosisForm()
}

const resetDiagnosisForm = () => {
  diagnosisForm.value = {
    device_id: '',
    diagnosis_type: 'comprehensive',
    parameters: ''
  }
  diagnosisFormRef.value?.clearValidate()
}

const submitDiagnosis = async () => {
  try {
    await diagnosisFormRef.value.validate()

    diagnosisLoading.value = true

    // 处理参数
    let parameters = {}
    const rawParameters = diagnosisForm.value.parameters
    if (typeof rawParameters === 'string' && rawParameters.trim()) {
      try {
        parameters = JSON.parse(rawParameters)
      } catch (error) {
        parameters = {}
      }
    }

    const requestData: DiagnosisRequest = {
      device_id: diagnosisForm.value.device_id,
      diagnosis_type: diagnosisForm.value.diagnosis_type,
      parameters
    }

    const data = await diagnosisApi.analyzeDevice(requestData)

    // 添加到结果列表
    diagnosisResults.value.unshift(data)

    ElMessage.success('诊断任务已提交，正在分析中...')
    hideDiagnosisForm()
  } catch (error) {
    ElMessage.error('诊断提交失败')
  } finally {
    diagnosisLoading.value = false
  }
}

const viewDiagnosisResult = (result: DiagnosisResult) => {
  selectedResult.value = result
  resultDetailVisible.value = true
}

const exportDiagnosisReport = () => {
  if (!selectedResult.value) return

  // 模拟导出功能
  const reportContent = `
诊断报告
========

设备名称: ${selectedResult.value.device_name}
诊断类型: ${getDiagnosisTypeText(selectedResult.value.diagnosis_type)}
诊断状态: ${getDiagnosisStatusText(selectedResult.value.status)}
置信度: ${Math.round(selectedResult.value.confidence * 100)}%

诊断摘要:
${selectedResult.value.summary}

发现问题:
${selectedResult.value.findings?.map((f, i) => `${i + 1}. ${f}`).join('\n') || '无'}

处理建议:
${selectedResult.value.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || '无'}

创建时间: ${formatDateTime(selectedResult.value.created_at)}
完成时间: ${selectedResult.value.completed_at ? formatDateTime(selectedResult.value.completed_at) : '未完成'}
  `

  // 创建下载链接
  const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `诊断报告_${selectedResult.value.device_name}_${new Date().toISOString().split('T')[0]}.txt`
  link.click()
  URL.revokeObjectURL(url)

  ElMessage.success('报告导出成功')
}

onMounted(() => {
  // 加载设备列表
  if (devices.value.length === 0) {
    appStore.fetchDevices()
  }

  // 如果URL中有deviceId参数，自动显示诊断表单
  if (route.query.deviceId) {
    showNewDiagnosisDialog()
  }
})
</script>

<style scoped>
.diagnosis-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.diagnosis-form-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.results-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.device-name {
  display: flex;
  align-items: center;
}

.device-icon {
  margin-right: 8px;
  color: #409EFF;
}

.result-detail {
  padding: 20px 0;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin-bottom: 10px;
  color: #303133;
  font-size: 16px;
}

:deep(.el-timeline-item__content) {
  padding-bottom: 10px;
}
</style>
