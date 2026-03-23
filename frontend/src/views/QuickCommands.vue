<template>
  <div class="quick-commands-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>快捷指令</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加指令
        </el-button>
        <el-button @click="refreshCommands">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 指令分类 -->
    <el-card class="category-card">
      <template #header>
        <span>指令分类</span>
      </template>
      <el-radio-group v-model="selectedCategory" @change="filterCommands">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="system">系统指令</el-radio-button>
        <el-radio-button label="sensor">传感器指令</el-radio-button>
        <el-radio-button label="report">报告指令</el-radio-button>
        <el-radio-button label="custom">自定义指令</el-radio-button>
      </el-radio-group>
    </el-card>

    <!-- 指令网格 -->
    <div class="commands-grid">
      <el-card
        v-for="command in filteredCommands"
        :key="command.id"
        class="command-card"
        :class="{ 'executing': command.executing }"
        @click="executeCommand(command)"
      >
        <div class="command-icon">
          <el-icon><component :is="command.icon" /></el-icon>
        </div>
        <div class="command-info">
          <h4>{{ command.name }}</h4>
          <p>{{ command.description }}</p>
          <div class="command-meta">
            <el-tag size="small" :type="getCategoryType(command.category)">
              {{ getCategoryName(command.category) }}
            </el-tag>
            <span class="usage-count">使用 {{ command.usageCount }} 次</span>
          </div>
        </div>
        <div class="command-actions">
          <el-tooltip content="编辑指令">
            <el-button
              size="small"
              text
              aria-label="编辑指令"
              @click.stop="editCommand(command)"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除指令">
            <el-button
              size="small"
              text
              type="danger"
              aria-label="删除指令"
              @click.stop="deleteCommand(command)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </el-card>
    </div>

    <!-- 添加/编辑指令对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingCommand ? '编辑指令' : '添加指令'"
      width="500px"
    >
      <el-form :model="commandForm" label-width="80px">
        <el-form-item label="指令名称">
          <el-input v-model="commandForm.name" placeholder="请输入指令名称" />
        </el-form-item>
        <el-form-item label="指令描述">
          <el-input
            v-model="commandForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入指令描述"
          />
        </el-form-item>
        <el-form-item label="指令分类">
          <el-select v-model="commandForm.category" placeholder="请选择分类">
            <el-option label="系统指令" value="system" />
            <el-option label="传感器指令" value="sensor" />
            <el-option label="报告指令" value="report" />
            <el-option label="自定义指令" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="指令内容">
          <el-input
            v-model="commandForm.command"
            type="textarea"
            :rows="4"
            placeholder="请输入具体的指令内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCommand">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Edit, Delete } from '@element-plus/icons-vue'

interface Command {
  id: string
  name: string
  description: string
  category: string
  command: string
  icon: string
  usageCount: number
  executing?: boolean
}

// 响应式数据
const commands = ref<Command[]>([])
const selectedCategory = ref('all')
const showAddDialog = ref(false)
const editingCommand = ref<Command | null>(null)

const commandForm = ref({
  name: '',
  description: '',
  category: '',
  command: ''
})

// 计算属性
const filteredCommands = computed(() => {
  if (selectedCategory.value === 'all') {
    return commands.value
  }
  return commands.value.filter(cmd => cmd.category === selectedCategory.value)
})

// 方法
const getCategoryType = (category: string) => {
  const typeMap: Record<string, string> = {
    system: 'primary',
    sensor: 'success',
    report: 'warning',
    custom: 'info'
  }
  return typeMap[category] || 'info'
}

const getCategoryName = (category: string) => {
  const nameMap: Record<string, string> = {
    system: '系统',
    sensor: '传感器',
    report: '报告',
    custom: '自定义'
  }
  return nameMap[category] || category
}

const filterCommands = () => {
  // 筛选逻辑已在计算属性中处理
}

const executeCommand = async (command: Command) => {
  command.executing = true

  try {
    // 模拟指令执行
    await new Promise(resolve => setTimeout(resolve, 2000))

    command.usageCount++
    ElMessage.success(`指令 "${command.name}" 执行成功`)
  } catch (error) {
    ElMessage.error(`指令执行失败: ${error}`)
  } finally {
    command.executing = false
  }
}

const editCommand = (command: Command) => {
  editingCommand.value = command
  commandForm.value = {
    name: command.name,
    description: command.description,
    category: command.category,
    command: command.command
  }
  showAddDialog.value = true
}

const deleteCommand = async (command: Command) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除指令 "${command.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const index = commands.value.findIndex(cmd => cmd.id === command.id)
    if (index > -1) {
      commands.value.splice(index, 1)
      ElMessage.success('指令删除成功')
    }
  } catch {
    // 用户取消删除
  }
}

const saveCommand = () => {
  if (!commandForm.value.name || !commandForm.value.command) {
    ElMessage.warning('请填写完整的指令信息')
    return
  }

  if (editingCommand.value) {
    // 编辑现有指令
    Object.assign(editingCommand.value, commandForm.value)
    ElMessage.success('指令更新成功')
  } else {
    // 添加新指令
    const newCommand: Command = {
      id: `cmd-${Date.now()}`,
      ...commandForm.value,
      icon: getIconByCategory(commandForm.value.category),
      usageCount: 0
    }
    commands.value.push(newCommand)
    ElMessage.success('指令添加成功')
  }

  showAddDialog.value = false
  editingCommand.value = null
  commandForm.value = {
    name: '',
    description: '',
    category: '',
    command: ''
  }
}

const getIconByCategory = (category: string) => {
  const iconMap: Record<string, string> = {
    system: 'Setting',
    sensor: 'Lightning',
    report: 'Document',
    custom: 'Tools'
  }
  return iconMap[category] || 'Lightning'
}

const refreshCommands = () => {
  // 模拟刷新
  ElMessage.success('指令列表已刷新')
}

const initializeCommands = () => {
  commands.value = [
    {
      id: 'cmd-1',
      name: '查看系统状态',
      description: '显示所有传感器的当前状态和系统健康度',
      category: 'system',
      command: 'show system status',
      icon: 'Setting',
      usageCount: 15
    },
    {
      id: 'cmd-2',
      name: '生成日报',
      description: '生成过去24小时的设备运行报告',
      category: 'report',
      command: 'generate daily report',
      icon: 'Document',
      usageCount: 8
    },
    {
      id: 'cmd-3',
      name: '重启传感器',
      description: '重启指定的传感器设备',
      category: 'sensor',
      command: 'restart sensor',
      icon: 'Lightning',
      usageCount: 3
    },
    {
      id: 'cmd-4',
      name: '清理日志',
      description: '清理系统日志文件',
      category: 'system',
      command: 'clean logs',
      icon: 'Setting',
      usageCount: 12
    },
    {
      id: 'cmd-5',
      name: '导出数据',
      description: '导出传感器历史数据',
      category: 'custom',
      command: 'export sensor data',
      icon: 'Tools',
      usageCount: 5
    }
  ]
}

onMounted(() => {
  initializeCommands()
})
</script>

<style scoped>
.quick-commands-page {
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
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.category-card {
  margin-bottom: 20px;
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.command-card {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.command-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow-light);
}

.command-card.executing {
  opacity: 0.7;
  pointer-events: none;
}

.command-card.executing::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 4px;
}

.command-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 24px;
  color: var(--el-color-primary);
}

.command-info h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 16px;
}

.command-info p {
  margin: 0 0 12px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.4;
}

.command-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.usage-count {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.command-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.command-card:hover .command-actions {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .commands-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }
}
</style>