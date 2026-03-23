<template>
  <div class="chat-page">
    <!-- 页面头部 -->
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
      <!-- 对话区域 -->
      <el-col :span="16">
        <el-card class="chat-card">
          <!-- 消息列表 -->
          <div class="chat-messages" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-chat">
              <el-empty description="暂无对话记录">
                <template #image>
                  <el-icon size="60" color="#C0C4CC"><ChatDotRound /></el-icon>
                </template>
              </el-empty>
            </div>

            <div
              v-for="(message, index) in messages"
              :key="index"
              :class="['message-item', message.type]"
            >
              <!-- 用户消息 -->
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

              <!-- AI回复 -->
              <div v-else class="ai-message">
                <div class="message-avatar">
                  <el-avatar :size="40" style="background: #409EFF;">
                    <el-icon><Robot /></el-icon>
                  </el-avatar>
                </div>
                <div class="message-content">
                  <div class="message-text">{{ message.content }}</div>

                  <!-- 置信度 -->
                  <div v-if="message.confidence" class="confidence-bar">
                    <span class="confidence-label">置信度:</span>
                    <el-progress
                      :percentage="Math.round(message.confidence * 100)"
                      :color="getConfidenceColor(message.confidence)"
                      :stroke-width="6"
                      :show-text="false"
                      style="width: 100px; margin: 0 10px;"
                    />
                    <span class="confidence-value">{{ Math.round(message.confidence * 100) }}%</span>
                  </div>

                  <!-- 引用来源 -->
                  <div v-if="message.sources?.length" class="sources">
                    <div class="sources-label">引用来源:</div>
                    <el-tag
                      v-for="source in message.sources"
                      :key="source"
                      size="small"
                      class="source-tag"
                    >
                      {{ source }}
                    </el-tag>
                  </div>

                  <!-- 推荐问题 -->
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

            <!-- 加载中 -->
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

          <!-- 输入区域 -->
          <div class="chat-input">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="请输入您的问题..."
              @keydown.ctrl.enter="sendMessage"
              :disabled="isLoading"
            />
            <div class="input-actions">
              <div class="input-tips">
                <el-text size="small" type="info">Ctrl + Enter 发送</el-text>
              </div>
              <el-button
                type="primary"
                @click="sendMessage"
                :loading="isLoading"
                :disabled="!inputMessage.trim()"
              >
                <el-icon><Promotion /></el-icon>
                发送
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 侧边栏 -->
      <el-col :span="8">
        <!-- 快捷问题 -->
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

        <!-- 系统状态 -->
        <el-card class="sidebar-card">
          <template #header>
            <span>系统状态</span>
          </template>
          <div class="system-status">
            <el-descriptions :column="1" size="small">
              <el-descriptions-item label="设备总数">{{ systemStatus.totalDevices }}</el-descriptions-item>
              <el-descriptions-item label="在线设备">{{ systemStatus.onlineDevices }}</el-descriptions-item>
              <el-descriptions-item label="活跃告警">{{ systemStatus.activeAlarms }}</el-descriptions-item>
              <el-descriptions-item label="严重告警">{{ systemStatus.criticalAlarms }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <!-- 使用提示 -->
        <el-card class="sidebar-card">
          <template #header>
            <span>使用提示</span>
          </template>
          <div class="usage-tips">
            <el-alert
              title="您可以询问以下类型的问题："
              type="info"
              :closable="false"
            >
              <ul>
                <li>设备状态查询</li>
                <li>告警信息分析</li>
                <li>故障排查建议</li>
                <li>维护操作指导</li>
                <li>系统配置说明</li>
              </ul>
            </el-alert>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { chatApi } from '@/api'
import { ElMessage } from 'element-plus'

const appStore = useAppStore()
const { systemStatus, devices, alarms } = storeToRefs(appStore)

// 消息相关
interface ChatMessage {
  type: 'user' | 'ai'
  content: string
  timestamp: string
  confidence?: number
  sources?: string[]
  suggestions?: string[]
}

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement>()

// 快捷问题
const quickQuestions = [
  '当前有哪些设备在线？',
  '最近有什么告警？',
  '设备运行状态如何？',
  '如何处理高温告警？',
  '水泵维护注意事项',
  '传感器校准方法'
]

// 工具函数
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString()
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return '#67C23A'
  if (confidence >= 0.6) return '#E6A23C'
  return '#F56C6C'
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 发送消息
const sendMessage = async () => {
  const question = inputMessage.value.trim()
  if (!question || isLoading.value) return

  // 添加用户消息
  messages.value.push({
    type: 'user',
    content: question,
    timestamp: new Date().toISOString()
  })

  // 清空输入框
  inputMessage.value = ''
  scrollToBottom()

  // 发送请求
  isLoading.value = true
  try {
    const data = await chatApi.askQuestion({
      question,
      context: {
        systemStatus: systemStatus.value,
        devices: devices.value,
        alarms: alarms.value
      }
    })

    // 添加AI回复
    messages.value.push({
      type: 'ai',
      content: data.answer,
      timestamp: data.timestamp,
      confidence: data.confidence,
      sources: data.sources,
      suggestions: data.suggestions
    })

    scrollToBottom()
  } catch (error) {
    ElMessage.error('发送消息失败，请重试')

    // 添加错误消息
    messages.value.push({
      type: 'ai',
      content: '抱歉，我暂时无法回答您的问题，请稍后重试。',
      timestamp: new Date().toISOString()
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 询问快捷问题
const askQuestion = (question: string) => {
  inputMessage.value = question
  sendMessage()
}

// 询问推荐问题
const askSuggestion = (suggestion: string) => {
  inputMessage.value = suggestion
  sendMessage()
}

// 清空对话
const clearChat = () => {
  messages.value = []
  ElMessage.success('对话已清空')
}

onMounted(() => {
  // 初始化系统状态
  if (systemStatus.value.totalDevices === 0) {
    appStore.initializeData()
  }

  // 添加欢迎消息
  messages.value.push({
    type: 'ai',
    content: '您好！我是AI中控平台的智能助手。我可以帮您查询设备状态、分析告警信息、提供故障排查建议等。请告诉我您需要了解什么？',
    timestamp: new Date().toISOString(),
    confidence: 1.0,
    sources: ['AI助手'],
    suggestions: ['查看设备状态', '查询告警信息', '获取维护建议']
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

.confidence-label {
  color: #606266;
  margin-right: 8px;
}

.confidence-value {
  color: #606266;
}

.sources {
  margin: 10px 0;
}

.sources-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 5px;
}

.source-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.suggestions {
  margin: 10px 0;
}

.suggestions-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
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