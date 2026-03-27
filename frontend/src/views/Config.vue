<template>
  <div class="config-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>系统配置</h2>
      <div class="header-actions">
        <el-button type="primary" @click="saveAllConfigs" :loading="saving">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>

    <!-- 配置分类 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="category-card">
          <template #header>
            <span>配置分类</span>
          </template>
          <el-menu
            :default-active="activeCategory"
            @select="handleCategorySelect"
            class="category-menu"
          >
            <el-menu-item index="general">
              <el-icon><Setting /></el-icon>
              <span>基础配置</span>
            </el-menu-item>
            <el-menu-item index="alarm">
              <el-icon><Warning /></el-icon>
              <span>告警配置</span>
            </el-menu-item>
            <el-menu-item index="inspection">
              <el-icon><Document /></el-icon>
              <span>巡检配置</span>
            </el-menu-item>
            <el-menu-item index="ai">
              <el-icon><Robot /></el-icon>
              <span>AI配置</span>
            </el-menu-item>
            <el-menu-item index="system">
              <el-icon><Monitor /></el-icon>
              <span>系统配置</span>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card class="config-content">
          <template #header>
            <div class="content-header">
              <span>{{ getCategoryTitle(activeCategory) }}</span>
              <el-button size="small" @click="resetCategory">
                <el-icon><RefreshRight /></el-icon>
                重置
              </el-button>
            </div>
          </template>

          <div class="config-form" v-loading="loading">
            <!-- 基础配置 -->
            <div v-if="activeCategory === 'general'" class="config-section">
              <el-form :model="configs.general" label-width="150px">
                <el-form-item label="系统名称">
                  <el-input v-model="configs.general.system_name" placeholder="请输入系统名称" />
                </el-form-item>
                <el-form-item label="系统版本">
                  <el-input v-model="configs.general.system_version" placeholder="请输入系统版本" />
                </el-form-item>
                <el-form-item label="公司名称">
                  <el-input v-model="configs.general.company_name" placeholder="请输入公司名称" />
                </el-form-item>
                <el-form-item label="联系邮箱">
                  <el-input v-model="configs.general.contact_email" placeholder="请输入联系邮箱" />
                </el-form-item>
                <el-form-item label="系统描述">
                  <el-input
                    v-model="configs.general.description"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入系统描述"
                  />
                </el-form-item>
              </el-form>
            </div>

            <!-- 告警配置 -->
            <div v-if="activeCategory === 'alarm'" class="config-section">
              <el-form :model="configs.alarm" label-width="150px">
                <el-form-item label="温度告警阈值">
                  <el-input-number
                    v-model="configs.alarm.temperature_threshold"
                    :min="0"
                    :max="200"
                    :step="1"
                  />
                  <span class="unit">°C</span>
                </el-form-item>
                <el-form-item label="压力告警阈值">
                  <el-input-number
                    v-model="configs.alarm.pressure_threshold"
                    :min="0"
                    :max="10"
                    :step="0.1"
                    :precision="1"
                  />
                  <span class="unit">MPa</span>
                </el-form-item>
                <el-form-item label="流量告警阈值">
                  <el-input-number
                    v-model="configs.alarm.flow_threshold"
                    :min="0"
                    :max="1000"
                    :step="10"
                  />
                  <span class="unit">L/min</span>
                </el-form-item>
                <el-form-item label="告警通知方式">
                  <el-checkbox-group v-model="configs.alarm.notification_methods">
                    <el-checkbox label="email">邮件通知</el-checkbox>
                    <el-checkbox label="sms">短信通知</el-checkbox>
                    <el-checkbox label="webhook">Webhook</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
                <el-form-item label="告警保留天数">
                  <el-input-number
                    v-model="configs.alarm.retention_days"
                    :min="1"
                    :max="365"
                    :step="1"
                  />
                  <span class="unit">天</span>
                </el-form-item>
              </el-form>
            </div>

            <!-- 巡检配置 -->
            <div v-if="activeCategory === 'inspection'" class="config-section">
              <el-form :model="configs.inspection" label-width="150px">
                <el-form-item label="巡检间隔">
                  <el-input-number
                    v-model="configs.inspection.interval_days"
                    :min="1"
                    :max="90"
                    :step="1"
                  />
                  <span class="unit">天</span>
                </el-form-item>
                <el-form-item label="自动生成报告">
                  <el-switch v-model="configs.inspection.auto_generate_report" />
                </el-form-item>
                <el-form-item label="报告模板">
                  <el-select v-model="configs.inspection.report_template" placeholder="请选择报告模板">
                    <el-option label="标准模板" value="standard" />
                    <el-option label="详细模板" value="detailed" />
                    <el-option label="简化模板" value="simple" />
                  </el-select>
                </el-form-item>
                <el-form-item label="巡检提醒">
                  <el-switch v-model="configs.inspection.reminder_enabled" />
                </el-form-item>
                <el-form-item label="提醒提前时间">
                  <el-input-number
                    v-model="configs.inspection.reminder_hours"
                    :min="1"
                    :max="72"
                    :step="1"
                    :disabled="!configs.inspection.reminder_enabled"
                  />
                  <span class="unit">小时</span>
                </el-form-item>
              </el-form>
            </div>

            <!-- AI配置 -->
            <div v-if="activeCategory === 'ai'" class="config-section">
              <el-form :model="configs.ai" label-width="150px">
                <el-form-item label="AI模型服务地址">
                  <el-input v-model="configs.ai.model_endpoint" placeholder="请输入AI模型服务地址" />
                </el-form-item>
                <el-form-item label="API密钥">
                  <el-input
                    v-model="configs.ai.api_key"
                    type="password"
                    placeholder="请输入API密钥"
                    show-password
                  />
                </el-form-item>
                <el-form-item label="模型名称">
                  <el-select v-model="configs.ai.model_name" placeholder="请选择模型">
                    <el-option label="Ollama / Qwen3.5-9B" value="qwen3.5-9b:latest" />
                    <el-option label="GPT-4" value="gpt-4" />
                    <el-option label="Claude-3" value="claude-3" />
                    <el-option label="Qwen" value="qwen" />
                  </el-select>
                </el-form-item>
                <el-form-item label="最大Token数">
                  <el-input-number
                    v-model="configs.ai.max_tokens"
                    :min="100"
                    :max="8000"
                    :step="100"
                  />
                </el-form-item>
                <el-form-item label="温度参数">
                  <el-slider
                    v-model="configs.ai.temperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    show-input
                  />
                </el-form-item>
                <el-form-item label="启用知识库">
                  <el-switch v-model="configs.ai.enable_knowledge_base" />
                </el-form-item>
              </el-form>
            </div>

            <!-- 系统配置 -->
            <div v-if="activeCategory === 'system'" class="config-section">
              <el-form :model="configs.system" label-width="150px">
                <el-form-item label="数据刷新间隔">
                  <el-input-number
                    v-model="configs.system.refresh_interval"
                    :min="5"
                    :max="300"
                    :step="5"
                  />
                  <span class="unit">秒</span>
                </el-form-item>
                <el-form-item label="日志级别">
                  <el-select v-model="configs.system.log_level" placeholder="请选择日志级别">
                    <el-option label="DEBUG" value="debug" />
                    <el-option label="INFO" value="info" />
                    <el-option label="WARNING" value="warning" />
                    <el-option label="ERROR" value="error" />
                  </el-select>
                </el-form-item>
                <el-form-item label="日志保留天数">
                  <el-input-number
                    v-model="configs.system.log_retention_days"
                    :min="1"
                    :max="365"
                    :step="1"
                  />
                  <span class="unit">天</span>
                </el-form-item>
                <el-form-item label="启用调试模式">
                  <el-switch v-model="configs.system.debug_mode" />
                </el-form-item>
                <el-form-item label="数据库备份">
                  <el-switch v-model="configs.system.auto_backup" />
                </el-form-item>
                <el-form-item label="备份间隔">
                  <el-select
                    v-model="configs.system.backup_interval"
                    :disabled="!configs.system.auto_backup"
                  >
                    <el-option label="每天" value="daily" />
                    <el-option label="每周" value="weekly" />
                    <el-option label="每月" value="monthly" />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { configApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

// 当前活跃分类
const activeCategory = ref<keyof typeof configs>('general')
const loading = ref(false)
const saving = ref(false)

// 配置数据
const configs = reactive({
  general: {
    system_name: 'AI中控平台',
    system_version: '1.0.0',
    company_name: '',
    contact_email: '',
    description: ''
  },
  alarm: {
    temperature_threshold: 80,
    pressure_threshold: 2.5,
    flow_threshold: 100,
    notification_methods: ['email'],
    retention_days: 30
  },
  inspection: {
    interval_days: 30,
    auto_generate_report: true,
    report_template: 'standard',
    reminder_enabled: true,
    reminder_hours: 24
  },
  ai: {
    model_endpoint: 'http://localhost:11434/api/chat',
    api_key: '',
    model_name: 'qwen3.5-9b:latest',
    max_tokens: 2000,
    temperature: 0.7,
    enable_knowledge_base: true
  },
  system: {
    refresh_interval: 30,
    log_level: 'info',
    log_retention_days: 30,
    debug_mode: false,
    auto_backup: true,
    backup_interval: 'daily'
  }
})

// 原始配置（用于重置）
const originalConfigs = ref<Record<string, Record<string, unknown>>>({})

// 工具函数
const getCategoryTitle = (category: string) => {
  const titleMap: Record<string, string> = {
    general: '基础配置',
    alarm: '告警配置',
    inspection: '巡检配置',
    ai: 'AI配置',
    system: '系统配置'
  }
  return titleMap[category] || '配置'
}

// 事件处理
const handleCategorySelect = (category: keyof typeof configs) => {
  activeCategory.value = category
}

const resetCategory = async () => {
  try {
    await ElMessageBox.confirm('确认要重置当前分类的配置吗？', '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 重置当前分类的配置
    const categoryConfigs = originalConfigs.value[activeCategory.value]
    if (categoryConfigs) {
      Object.assign(configs[activeCategory.value], categoryConfigs)
      ElMessage.success('配置已重置')
    }
  } catch (error) {
    // 用户取消
  }
}

const saveAllConfigs = async () => {
  saving.value = true
  try {
    // 模拟保存所有配置
    const configPromises = Object.entries(configs).map(([category, categoryConfigs]) => {
      return Object.entries(categoryConfigs).map(([key, value]) => {
        const configKey = `${category}_${key}`
        return configApi.updateConfig(configKey, { value, description: `${category}配置项` })
      })
    }).flat()

    await Promise.all(configPromises)

    // 更新原始配置
    originalConfigs.value = JSON.parse(JSON.stringify(configs))

    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error('配置保存失败')
  } finally {
    saving.value = false
  }
}

// 加载配置
const loadConfigs = async () => {
  loading.value = true
  try {
    const { data } = await configApi.getConfigs()
    const configList = data.configs || []

    // 解析配置到对应分类
    configList.forEach((config: any) => {
      const [category, key] = config.key.split('_', 2)
      const categoryConfig = configs[category as keyof typeof configs]
      if (categoryConfig && key in categoryConfig) {
        ;(categoryConfig as Record<string, unknown>)[key] = config.value
      }
    })

    // 保存原始配置
    originalConfigs.value = JSON.parse(JSON.stringify(configs))
  } catch (error) {
    console.error('加载配置失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.config-page {
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

.category-card {
  height: calc(100vh - 200px);
}

.category-menu {
  border: none;
}

.config-content {
  height: calc(100vh - 200px);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-form {
  height: calc(100vh - 280px);
  overflow-y: auto;
  padding: 20px;
}

.config-section {
  max-width: 600px;
}

.unit {
  margin-left: 10px;
  color: #909399;
  font-size: 14px;
}

:deep(.el-form-item) {
  margin-bottom: 25px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-input-number) {
  width: 200px;
}

:deep(.el-select) {
  width: 200px;
}

:deep(.el-slider) {
  width: 300px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.el-card__body) {
  height: calc(100% - 60px);
  overflow: hidden;
}
</style>
