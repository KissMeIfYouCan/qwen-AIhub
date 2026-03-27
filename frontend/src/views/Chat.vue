<template>
  <div class="chat-page">
    <div class="page-header">
      <h2>知识问答</h2>
      <div class="header-actions">
        <el-button @click="clearChat">
          <el-icon><Delete /></el-icon>
          清空对话
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="chat-card">
          <div ref="messagesContainer" class="chat-messages">
            <div v-if="messages.length === 0" class="empty-chat">
              <el-empty description="暂无对话记录">
                <template #image>
                  <el-icon size="60" color="#C0C4CC"><ChatDotRound /></el-icon>
                </template>
              </el-empty>
            </div>

            <div v-for="(message, index) in messages" :key="index" :class="['message-item', message.type]">
              <div v-if="message.type === 'user'" class="user-message">
                <div class="message-content">
                  <div class="message-text">{{ message.content }}</div>
                  <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                </div>
                <div class="message-avatar">
                  <el-avatar :size="40">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                </div>
              </div>

              <div v-else class="ai-message">
                <div class="message-avatar">
                  <el-avatar :size="40" style="background: #409EFF;">
                    <el-icon><Robot /></el-icon>
                  </el-avatar>
                </div>
                <div class="message-content">
                  <div class="message-text">{{ message.content }}</div>

                  <div v-if="message.confidence" class="confidence-bar">
                    <span class="confidence-label">置信度</span>
                    <el-progress
                      :percentage="Math.round(message.confidence * 100)"
                      :color="getConfidenceColor(message.confidence)"
                      :stroke-width="6"
                      :show-text="false"
                      style="width: 100px; margin: 0 10px;"
                    />
                    <span class="confidence-value">{{ Math.round(message.confidence * 100) }}%</span>
                  </div>

                  <div v-if="message.sources?.length" class="sources">
                    <div class="sources-label">引用来源:</div>
                    <el-tag v-for="source in message.sources" :key="source" size="small" class="source-tag">
                      {{ source }}
                    </el-tag>
                  </div>

                  <div v-if="message.suggestions?.length" class="suggestions">
                    <div class="suggestions-label">相关问题:</div>
                    <div class="suggestion-buttons">
                      <el-button
                        v-for="suggestion in message.suggestions"
                        :key="suggestion"
                        size="small"
                        type="primary"
                        plain
                        @click="askSuggestion(suggestion)"
                      >
                        {{ suggestion }}
                      </el-button>
                    </div>
                  </div>

                  <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                </div>
              </div>
            </div>

            <div v-if="isLoading" class="message-item ai">
              <div class="ai-message">
                <div class="message-avatar">
                  <el-avatar :size="40" style="background: #409EFF;">
                    <el-icon><Robot /></el-icon>
                  </el-avatar>
                </div>
                <div class="message-content">
                  <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chat-input">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="请输入您的问题..."
              :disabled="isLoading"
              @keydown.ctrl.enter="sendMessage"
            />
            <div class="input-actions">
              <div class="input-tips">
                <el-text size="small" type="info">Ctrl + Enter 发送</el-text>
              </div>
              <el-button type="primary" :loading="isLoading" :disabled="!inputMessage.trim()" @click="sendMessage">
                <el-icon><Promotion /></el-icon>
                发送
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="sidebar-card">
          <template #header>
            <span>常见问题</span>
          </template>
          <div class="quick-questions">
            <el-button
              v-for="question in quickQuestions"
              :key="question"
              size="small"
              type="primary"
              plain
              class="question-button"
              @click="askQuestion(question)"
            >
              {{ question }}
            </el-button>
          </div>
        </el-card>

        <el-card class="sidebar-card">
          <template #header>
            <span>系统状态</span>
          </template>
          <div class="system-status">
            <el-descriptions :column="1" size="small">
              <el-descriptions-item label="设备总数">{{ aiContext.systemStatus.totalDevices }}</el-descriptions-item>
              <el-descriptions-item label="在线设备">{{ aiContext.systemStatus.onlineDevices }}</el-descriptions-item>
              <el-descriptions-item label="活跃告警">{{ aiContext.systemStatus.activeAlarms }}</el-descriptions-item>
              <el-descriptions-item label="严重告警">{{ aiContext.systemStatus.criticalAlarms }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <el-card class="sidebar-card">
          <template #header>
            <span>使用提示</span>
          </template>
          <div class="usage-tips">
            <el-alert title="你可以提这些问题：" type="info" :closable="false">
              <ul>
                <li>当前有哪些设备在线？</li>
                <li>最近有什么告警？</li>
                <li>总结当前系统风险。</li>
                <li>给我下一步巡检建议。</li>
                <li>传感器异常更应该先检查什么？</li>
              </ul>
            </el-alert>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores'
import { useSensorStore } from '@/stores'
import { chatApi } from '@/api'
import { buildAIContext } from '@/utils/aiContext'

interface ChatMessage {
  type: 'user' | 'ai'
  content: string
  timestamp: string
  confidence?: number
  sources?: string[]
  suggestions?: string[]
}

const appStore = useAppStore()
const sensorStore = useSensorStore()
const { devices, alarms } = storeToRefs(appStore)
const { sensors } = storeToRefs(sensorStore)

const aiContext = computed(() => buildAIContext(devices.value, sensors.value, alarms.value))
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement>()

const quickQuestions = [
  '当前有哪些设备在线？',
  '最近有什么告警？',
  '总结当前系统风险。',
  '给我下一步巡检建议。',
  '传感器异常更应该先检查什么？'
]

const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString()

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return '#67C23A'
  if (confidence >= 0.6) return '#E6A23C'
  return '#F56C6C'
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  const question = inputMessage.value.trim()
  if (!question || isLoading.value) return

  messages.value.push({
    type: 'user',
    content: question,
    timestamp: new Date().toISOString()
  })

  inputMessage.value = ''
  scrollToBottom()
  isLoading.value = true

  try {
    const data = await chatApi.askQuestion({
      question,
      context: aiContext.value
    })

    messages.value.push({
      type: 'ai',
      content: data.answer,
      timestamp: data.timestamp,
      confidence: data.confidence,
      sources: data.sources,
      suggestions: data.suggestions
    })
  } catch (error) {
    console.error('chat ask failed', error)
    const message = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`发送消息失败: ${message}`)
    messages.value.push({
      type: 'ai',
      content: `当前无法获取 AI 回复。错误信息: ${message}`,
      timestamp: new Date().toISOString()
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const askQuestion = (question: string) => {
  inputMessage.value = question
  sendMessage()
}

const askSuggestion = (suggestion: string) => {
  inputMessage.value = suggestion
  sendMessage()
}

const clearChat = () => {
  messages.value = []
  ElMessage.success('对话已清空')
}

onMounted(async () => {
  await Promise.all([
    appStore.initializeData(),
    sensorStore.fetchSensors()
  ])

  messages.value.push({
    type: 'ai',
    content: '已接入当前页面的设备、传感器和告警数据。你可以直接问在线数量、告警摘要、风险总结或巡检建议。',
    timestamp: new Date().toISOString(),
    confidence: 1,
    sources: ['当前页面实时数据'],
    suggestions: quickQuestions.slice(0, 3)
  })

  scrollToBottom()
})
</script>

<style scoped>
.chat-page {
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

.chat-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.empty-chat {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-item {
  margin-bottom: 20px;
}

.user-message {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.ai-message {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

.message-avatar {
  margin: 0 10px;
}

.message-content {
  max-width: 70%;
  background: white;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-message .message-content {
  background: #409EFF;
  color: white;
}

.message-text {
  line-height: 1.6;
  margin-bottom: 8px;
  white-space: pre-wrap;
}

.message-time {
  font-size: 12px;
  color: #909399;
  text-align: right;
}

.user-message .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.confidence-bar {
  display: flex;
  align-items: center;
  margin: 10px 0;
  font-size: 12px;
}

.confidence-label,
.confidence-value,
.sources-label,
.suggestions-label {
  color: #606266;
}

.sources,
.suggestions {
  margin: 10px 0;
}

.source-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.suggestion-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #409EFF;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  background: white;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.sidebar-card {
  margin-bottom: 20px;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-button {
  text-align: left;
  justify-content: flex-start;
}

.usage-tips ul {
  margin: 0;
  padding-left: 20px;
}

.usage-tips li {
  margin-bottom: 5px;
  color: #606266;
}

:deep(.el-card__body) {
  padding: 0;
}

:deep(.chat-card .el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
