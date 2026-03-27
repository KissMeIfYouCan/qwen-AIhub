<template>
  <div class="bottom-ai-input">
    <div class="assistant-header">
      <div>
        <span class="section-kicker">AI assistant</span>
        <h3>自然语言工作区</h3>
      </div>
      <div class="assistant-status">
        <span class="status-indicator" :class="aiStatus.type"></span>
        <span>{{ aiStatus.text }}</span>
      </div>
    </div>

    <div class="input-shell">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="4"
        :placeholder="placeholder"
        :disabled="isProcessing"
        resize="none"
        @keydown.ctrl.enter="handleSubmit"
        @keydown.meta.enter="handleSubmit"
      />

      <div class="input-toolbar">
        <div class="quick-commands">
          <button
            v-for="cmd in quickCommands"
            :key="cmd.id"
            class="quick-command"
            type="button"
            @click="insertCommand(cmd.text)"
          >
            {{ cmd.label }}
          </button>
        </div>

        <div class="action-buttons">
          <el-button size="small" @click="clearInput" :disabled="!inputText.trim()">清空</el-button>
          <el-button size="small" type="primary" @click="handleSubmit" :loading="isProcessing" :disabled="!inputText.trim()">
            <el-icon><Promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="lastResponse" class="response-area">
      <div class="response-header">
        <span>最近一次回复</span>
        <div class="response-actions">
          <el-tooltip content="复制回复">
            <el-button size="small" text aria-label="复制回复" @click="copyResponse">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="清空回复">
            <el-button size="small" text aria-label="清空回复" @click="clearResponse">
              <el-icon><Close /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
      <div class="response-content">{{ lastResponse }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Promotion, Close, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores'
import { useSensorStore } from '@/stores'
import { chatApi } from '@/api'
import { buildAIContext } from '@/utils/aiContext'

const appStore = useAppStore()
const sensorStore = useSensorStore()
const { devices, alarms } = storeToRefs(appStore)
const { sensors } = storeToRefs(sensorStore)

const inputText = ref('')
const isProcessing = ref(false)
const lastResponse = ref('')

const aiStatus = ref({
  type: 'ready',
  text: 'AI助手就绪'
})

const quickCommands = [
  { id: 1, label: '查看状态', text: '当前有哪些设备在线？' },
  { id: 2, label: '告警摘要', text: '最近有什么告警？' },
  { id: 3, label: '风险总结', text: '总结当前系统风险。' },
  { id: 4, label: '巡检建议', text: '给我下一步巡检建议。' }
]

const placeholder = computed(() =>
  isProcessing.value ? 'AI 正在处理中...' : '输入监控问题或操作指令，AI 会基于当前页面数据回答。Ctrl+Enter 发送。'
)

const insertCommand = (text: string) => {
  inputText.value = text
}

const clearInput = () => {
  inputText.value = ''
}

const clearResponse = () => {
  lastResponse.value = ''
}

const copyResponse = async () => {
  try {
    await navigator.clipboard.writeText(lastResponse.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const handleSubmit = async () => {
  const question = inputText.value.trim()
  if (!question || isProcessing.value) {
    return
  }

  aiStatus.value = {
    type: 'processing',
    text: 'AI 正在分析'
  }
  isProcessing.value = true

  try {
    const response = await chatApi.askQuestion({
      question,
      context: buildAIContext(devices.value, sensors.value, alarms.value)
    })

    lastResponse.value = response.answer || '当前未收到有效回复。'
    inputText.value = ''
    aiStatus.value = {
      type: 'success',
      text: '处理完成'
    }
    ElMessage.success('AI 回复已更新')
  } catch {
    aiStatus.value = {
      type: 'error',
      text: '处理失败'
    }
    ElMessage.error('AI 请求失败，请稍后重试')
  } finally {
    isProcessing.value = false
    window.setTimeout(() => {
      aiStatus.value = {
        type: 'ready',
        text: 'AI助手就绪'
      }
    }, 2400)
  }
}
</script>

<style scoped>
.bottom-ai-input {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.assistant-header,
.response-header,
.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.assistant-header h3 {
  margin: 4px 0 0;
  font-size: 20px;
  color: var(--app-text);
}

.assistant-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--app-text-muted);
}

.status-indicator.ready,
.status-indicator.success {
  background: var(--app-success);
}

.status-indicator.processing {
  background: var(--app-accent);
}

.status-indicator.error {
  background: var(--app-danger);
}

.input-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-command {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--app-surface-muted);
  color: var(--app-text-soft);
  cursor: pointer;
}

.action-buttons,
.response-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.response-actions :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.response-actions :deep(.el-button .el-icon),
.response-actions :deep(.el-button [class*=el-icon]) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}

.response-actions :deep(.el-button .el-icon svg),
.response-actions :deep(.el-button [class*=el-icon] svg) {
  width: 1em;
  height: 1em;
  fill: currentColor;
}

.response-area {
  border-top: 1px solid var(--app-border-subtle);
  padding-top: 16px;
}

.response-header span {
  color: var(--app-text-soft);
  font-size: 14px;
}

.response-content {
  margin-top: 10px;
  padding: 14px 16px;
  border-radius: var(--app-radius-md);
  background: var(--app-surface-muted);
  color: var(--app-text);
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .assistant-header,
  .input-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: flex-end;
  }
}
</style>
