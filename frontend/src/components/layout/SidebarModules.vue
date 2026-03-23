<template>
  <div class="sidebar-modules">
    <div class="sidebar-header">
      <div>
        <span class="section-kicker">Modules</span>
        <h3>辅助模块</h3>
      </div>
      <button class="collapse-button" type="button" @click="toggleCollapse">
        <el-icon><Fold v-if="!isCollapsed" /><Expand v-else /></el-icon>
      </button>
    </div>

    <div v-if="!isCollapsed" class="modules-container">
      <div v-for="module in moduleSections" :key="module.key" class="module-section">
        <button class="module-header" type="button" @click="toggleModule(module.key)">
          <div class="module-title">
            <el-icon><component :is="module.icon" /></el-icon>
            <span>{{ module.title }}</span>
          </div>
          <el-icon class="toggle-icon" :class="{ expanded: expandedModules[module.key] }">
            <ArrowDown />
          </el-icon>
        </button>
        <div v-show="expandedModules[module.key]" class="module-content">
          <component :is="module.component" />
        </div>
      </div>
    </div>

    <div v-else class="collapsed-state">
      <el-icon><Operation /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  Fold,
  Expand,
  Lightning,
  Document,
  Setting,
  Bell,
  ArrowDown,
  Operation
} from '@element-plus/icons-vue'
import QuickCommands from '../modules/QuickCommands.vue'
import ReportGenerator from '../modules/ReportGenerator.vue'
import PollingConfig from '../modules/PollingConfig.vue'
import AlarmManager from '../modules/AlarmManager.vue'

const isCollapsed = ref(false)

const expandedModules = reactive<Record<string, boolean>>({
  commands: true,
  reports: false,
  polling: false,
  alarms: false
})

const moduleSections = [
  { key: 'commands', title: '快捷指令', icon: Lightning, component: QuickCommands },
  { key: 'reports', title: '报告生成', icon: Document, component: ReportGenerator },
  { key: 'polling', title: '轮询配置', icon: Setting, component: PollingConfig },
  { key: 'alarms', title: '告警管理', icon: Bell, component: AlarmManager }
]

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleModule = (key: string) => {
  expandedModules[key] = !expandedModules[key]
}
</script>

<style scoped>
.sidebar-modules {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sidebar-header,
.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-header h3 {
  margin: 4px 0 0;
  font-size: 20px;
  color: var(--app-text);
}

.collapse-button,
.module-header {
  border: 1px solid var(--app-border);
  background: var(--app-surface-muted);
  border-radius: 12px;
  color: var(--app-text);
}

.collapse-button .el-icon,
.module-header .el-icon,
.module-header span {
  color: inherit;
}

.collapse-button {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modules-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-section {
  border: 1px solid var(--app-border-subtle);
  background: var(--app-surface-muted);
  border-radius: var(--app-radius-md);
  overflow: hidden;
}

.module-header {
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 0;
  cursor: pointer;
}

.module-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--app-text-soft);
}

.toggle-icon {
  transition: transform 0.2s ease;
  color: var(--app-text-muted);
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.module-content {
  padding: 0 14px 14px;
}

.collapsed-state {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-radius-md);
  background: var(--app-surface-muted);
  color: var(--app-text-muted);
}
</style>
