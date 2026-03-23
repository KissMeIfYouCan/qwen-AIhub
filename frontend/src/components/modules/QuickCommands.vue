<template>
  <div class="quick-commands">
    <!-- 指令分类 -->
    <div class="command-categories">
      <el-tabs v-model="activeCategory" size="small" class="category-tabs">
        <el-tab-pane label="系统" name="system">
          <div class="commands-grid">
            <el-button
              v-for="cmd in systemCommands"
              :key="cmd.id"
              size="small"
              :type="cmd.type"
              :loading="executingCommand === cmd.id"
              @click="executeCommand(cmd)"
              class="command-btn"
            >
              <el-icon><component :is="cmd.icon" /></el-icon>
              <span>{{ cmd.label }}</span>
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="设备" name="device">
          <div class="commands-grid">
            <el-button
              v-for="cmd in deviceCommands"
              :key="cmd.id"
              size="small"
              :type="cmd.type"
              :loading="executingCommand === cmd.id"
              @click="executeCommand(cmd)"
              class="command-btn"
            >
              <el-icon><component :is="cmd.icon" /></el-icon>
              <span>{{ cmd.label }}</span>
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="自定义" name="custom">
          <div class="custom-commands">
            <!-- 自定义指令列表 -->
            <div class="custom-list" v-if="customCommands.length > 0">
              <div
                v-for="cmd in customCommands"
                :key="cmd.id"
                class="custom-command-item"
              >
                <el-button
                  size="small"
                  type="info"
                  :loading="executingCommand === cmd.id"
                  @click="executeCommand(cmd)"
                  class="custom-btn"
                >
                  {{ cmd.label }}
                </el-button>
                <el-button
                  size="small"
                  text
                  @click="editCustomCommand(cmd)"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button
                  size="small"
                  text
                  type="danger"
                  @click="deleteCustomCommand(cmd.id)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <!-- 添加自定义指令 -->
            <el-button
              size="small"
              type="primary"
              plain
              @click="showAddDialog = true"
              class="add-custom-btn"
            >
              <el-icon><Plus /></el-icon>
              添加指令
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 执行历史 -->
    <div class="execution-history" v-if="executionHistory.length > 0">
      <el-divider content-position="left">
        <span class="history-title">执行历史</span>
      </el-divider>
      <div class="history-list">
        <div
          v-for="item in executionHistory.slice(0, 3)"
          :key="item.id"
          class="history-item"
        >
          <div class="history-info">
            <span class="history-command">{{ item.command }}</span>
            <span class="history-time">{{ formatTime(item.timestamp) }}</span>
          </div>
          <el-tag :type="item.status === 'success' ? 'success' : 'danger'" size="small">
            {{ item.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 添加自定义指令对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="添加自定义指令"
      width="400px"
      :before-close="handleCloseDialog"
    >
      <el-form :model="customCommandForm" label-width="80px">
        <el-form-item label="指令名称">
          <el-input v-model="customCommandForm.label" placeholder="请输入指令名称" />
        </el-form-item>
        <el-form-item label="指令内容">
          <el-input
            v-model="customCommandForm.command"
            type="textarea"
            :rows="3"
            placeholder="请输入指令内容"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="customCommandForm.description" placeholder="请输入指令描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCustomCommand">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  Plus,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Command {
  id: string
  label: string
  command: string
  type?: string
  icon?: string
  description?: string
}

interface ExecutionRecord {
  id: string
  command: string
  timestamp: number
  status: 'success' | 'error'
}

// 当前分类
const activeCategory = ref('system')

// 执行中的指令
const executingCommand = ref<string | null>(null)

// 系统指令
const systemCommands = ref<Command[]>([
  {
    id: 'refresh-all',
    label: '刷新数据',
    command: '刷新所有传感器数据',
    icon: 'Refresh',
    description: '刷新所有传感器的实时数据'
  },
  {
    id: 'system-status',
    label: '系统状态',
    command: '查看系统运行状态',
    icon: 'Monitor',
    description: '查看系统整体运行状态'
  },
  {
    id: 'export-data',
    label: '导出数据',
    command: '导出当前数据',
    icon: 'Download',
    description: '导出当前显示的数据'
  },
  {
    id: 'check-alerts',
    label: '检查告警',
    command: '检查系统告警',
    icon: 'Warning',
    description: '检查当前系统告警情况'
  }
])

// 设备指令
const deviceCommands = ref<Command[]>([
  {
    id: 'scan-devices',
    label: '扫描设备',
    command: '扫描所有设备',
    icon: 'Connection',
    description: '扫描网络中的所有设备'
  },
  {
    id: 'device-health',
    label: '设备健康',
    command: '检查设备健康状态',
    icon: 'View',
    description: '检查所有设备的健康状态'
  },
  {
    id: 'optimize-polling',
    label: '优化轮询',
    command: '优化设备轮询策略',
    icon: 'Setting',
    description: '根据当前状态优化轮询策略'
  },
  {
    id: 'analyze-performance',
    label: '性能分析',
    command: '分析设备性能',
    icon: 'DataAnalysis',
    description: '分析设备性能指标'
  }
])

// 自定义指令
const customCommands = ref<Command[]>([
  {
    id: 'custom-1',
    label: '重启服务',
    command: '重启监控服务',
    description: '重启系统监控服务'
  }
])

// 执行历史
const executionHistory = ref<ExecutionRecord[]>([])

// 自定义指令表单
const customCommandForm = reactive({
  label: '',
  command: '',
  description: ''
})

// 对话框显示状态
const showAddDialog = ref(false)

// 编辑模式
const editingCommand = ref<Command | null>(null)

// 执行指令
const executeCommand = async (command: Command) => {
  executingCommand.value = command.id

  try {
    // 模拟指令执行
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 添加到执行历史
    executionHistory.value.unshift({
      id: Date.now().toString(),
      command: command.label,
      timestamp: Date.now(),
      status: 'success'
    })

    // 限制历史记录数量
    if (executionHistory.value.length > 10) {
      executionHistory.value = executionHistory.value.slice(0, 10)
    }

    ElMessage.success(`指令"${command.label}"执行成功`)

  } catch (error) {
    executionHistory.value.unshift({
      id: Date.now().toString(),
      command: command.label,
      timestamp: Date.now(),
      status: 'error'
    })

    ElMessage.error(`指令"${command.label}"执行失败`)
  } finally {
    executingCommand.value = null
  }
}

// 编辑自定义指令
const editCustomCommand = (command: Command) => {
  editingCommand.value = command
  customCommandForm.label = command.label
  customCommandForm.command = command.command
  customCommandForm.description = command.description || ''
  showAddDialog.value = true
}

// 删除自定义指令
const deleteCustomCommand = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个自定义指令吗？', '确认删除', {
      type: 'warning'
    })

    const index = customCommands.value.findIndex(cmd => cmd.id === id)
    if (index > -1) {
      customCommands.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  } catch {
    // 用户取消删除
  }
}

// 保存自定义指令
const saveCustomCommand = () => {
  if (!customCommandForm.label.trim() || !customCommandForm.command.trim()) {
    ElMessage.warning('请填写指令名称和内容')
    return
  }

  if (editingCommand.value) {
    // 编辑模式
    const index = customCommands.value.findIndex(cmd => cmd.id === editingCommand.value!.id)
    if (index > -1) {
      customCommands.value[index] = {
        ...customCommands.value[index],
        label: customCommandForm.label,
        command: customCommandForm.command,
        description: customCommandForm.description
      }
    }
    ElMessage.success('指令更新成功')
  } else {
    // 新增模式
    const newCommand: Command = {
      id: `custom-${Date.now()}`,
      label: customCommandForm.label,
      command: customCommandForm.command,
      description: customCommandForm.description
    }
    customCommands.value.push(newCommand)
    ElMessage.success('指令添加成功')
  }

  handleCloseDialog()
}

// 关闭对话框
const handleCloseDialog = () => {
  showAddDialog.value = false
  editingCommand.value = null
  customCommandForm.label = ''
  customCommandForm.command = ''
  customCommandForm.description = ''
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.quick-commands {
  padding: 8px;
}

.category-tabs {
  --el-tabs-header-height: 32px;
}

.category-tabs :deep(.el-tabs__header) {
  margin: 0 0 12px 0;
}

.category-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 4px;
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 8px;
}

.command-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 60px;
  margin: 0;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.3;
  white-space: normal;
  color: var(--el-text-color-primary);
  background: var(--app-surface-muted);
  border: 1px solid var(--el-border-color-light);
  box-shadow: none;
}

.command-btn:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-extra-light);
  border-color: var(--el-color-primary-light-7);
}

.command-btn:focus-visible {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.command-btn :deep(.el-icon) {
  flex-shrink: 0;
}

.command-btn span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  text-align: center;
  line-height: 1.3;
}

.custom-commands {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.custom-command-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.custom-btn {
  flex: 1;
  justify-content: flex-start;
}

.add-custom-btn {
  width: 100%;
  justify-content: center;
}

.execution-history {
  margin-top: 16px;
}

.history-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
  font-size: 12px;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.history-command {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.history-time {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .commands-grid {
    grid-template-columns: 1fr;
  }

  .command-btn {
    min-height: 48px;
    justify-content: flex-start;
    padding: 10px 12px;
  }

  .command-btn span {
    justify-content: flex-start;
    min-height: auto;
    text-align: left;
  }

  .custom-command-item {
    flex-wrap: wrap;
  }

  .custom-btn {
    min-width: 120px;
  }
}
</style>