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
        @keydown.ctrl.enter="handleSubmit"
        @keydown.meta.enter="handleSubmit"
        resize="none"
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

    <div class="response-area" v-if="lastResponse">
      <div class="response-header">
        <span>最近一次响应</span>
        <div class="response-actions">
          <el-tooltip content="复制响应">
            <el-button size="small" text aria-label="复制响应" @click="copyResponse">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="清空响应">
            <el-button size="small" text aria-label="清空响应" @click="clearResponse">
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
import { ref, computed } from 'vue'
import { Promotion, Close, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const inputText = ref('')
const isProcessing = ref(false)
const lastResponse = ref('')

const aiStatus = ref({
  type: 'ready',
  text: 'AI助手就绪'
})

const quickCommands = ref([
  { id: 1, label: '查看状态', text: '显示所有传感器的当前状态' },
  { id: 2, label: '生成报告', text: '生成过去24小时的设备运行报告' },
  { id: 3, label: '异常分析', text: '分析当前系统中的异常情况' },
  { id: 4, label: '优化建议', text: '提供系统性能优化建议' }
])

const placeholder = computed(() =>
  isProcessing.value ? 'AI正在处理中...' : '输入指令或问题，AI 将为您提供智能分析与建议。Ctrl+Enter 发送。'
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
  if (!inputText.value.trim() || isProcessing.value) {
    return
  }

  aiStatus.value = {
    type: 'processing',
    text: 'AI正在思考...'
  }
  isProcessing.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 1600))

    const responses = [
      '已完成传感器状态检查，发现 3 个设备需要关注。',
      '系统运行正常，建议在下午 2 点进行例行维护。',
      '检测到温度异常，建议先查看对应区域的历史趋势。',
      '已整理一份执行建议，可继续生成详细报告。'
    ]

    lastResponse.value = responses[Math.floor(Math.random() * responses.length)]
    inputText.value = ''
    aiStatus.value = {
      type: 'success',
      text: '处理完成'
    }
    ElMessage.success('指令执行成功')
  } catch {
    aiStatus.value = {
      type: 'error',
      text: '处理失败'
    }
    ElMessage.error('指令执行失败，请重试')
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
