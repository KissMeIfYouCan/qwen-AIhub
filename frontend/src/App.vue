<template>
  <div id="app" class="app-shell">
    <aside class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-brand">
        <button class="sidebar-toggle" type="button" @click="sidebarCollapsed = !sidebarCollapsed">
          <el-icon><Fold v-if="!sidebarCollapsed" /><Expand v-else /></el-icon>
        </button>
        <div v-if="!sidebarCollapsed" class="brand-copy">
          <span class="brand-kicker">AI Workbench</span>
          <h1>AI中控平台</h1>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in navigationItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
          type="button"
          @click="handleMenuSelect(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
        </button>
      </nav>

      <div v-if="!sidebarCollapsed" class="sidebar-footer">
        <p>轻量 AI 工作台界面</p>
        <span>{{ currentPageDescription }}</span>
      </div>
    </aside>

    <div class="app-main">
      <header class="topbar">
        <div class="topbar-copy">
          <span class="topbar-kicker">{{ currentPageKicker }}</span>
          <h2>{{ currentPageTitle }}</h2>
          <p>{{ currentPageDescription }}</p>
        </div>

        <div class="topbar-actions">
          <div class="topbar-meta">
            <span class="meta-pill">{{ currentDateLabel }}</span>
          </div>
          <button class="profile-chip" type="button">
            <el-icon><User /></el-icon>
            <span>管理员</span>
          </button>
        </div>
      </header>

      <main class="app-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Monitor,
  Setting,
  Warning,
  Tools,
  Document,
  ChatDotRound,
  Operation,
  User,
  DataAnalysis,
  Timer,
  Fold,
  Expand
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const sidebarCollapsed = ref(false)

const navigationItems = [
  { path: '/dashboard', label: '驾驶舱', icon: Monitor },
  { path: '/new-dashboard', label: 'AI监控台', icon: DataAnalysis },
  { path: '/devices', label: '设备管理', icon: Setting },
  { path: '/alarms', label: '告警管理', icon: Warning },
  { path: '/reports', label: '报告生成', icon: Document },
  { path: '/polling-config', label: '轮询配置', icon: Timer },
  { path: '/diagnosis', label: '异常诊断', icon: Tools },
  { path: '/inspection', label: '巡检管理', icon: Document },
  { path: '/chat', label: '知识问答', icon: ChatDotRound },
  { path: '/config', label: '系统配置', icon: Operation }
]

const currentRouteMeta = computed(() => route.meta ?? {})

const currentPageTitle = computed(() => {
  if (typeof currentRouteMeta.value.title === 'string') {
    return currentRouteMeta.value.title
  }

  const match = navigationItems.find(item => item.path === route.path)
  return match?.label ?? '工作台'
})

const currentPageDescription = computed(() => {
  if (typeof currentRouteMeta.value.description === 'string') {
    return currentRouteMeta.value.description
  }
  return '围绕监控、分析与 AI 协作的统一工作区。'
})

const currentPageKicker = computed(() => (route.path === '/new-dashboard' ? 'AI Monitoring Workspace' : 'Platform Workspace'))

const currentDateLabel = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date())
)

const handleMenuSelect = async (path: string) => {
  if (route.path === path) {
    return
  }
  await router.push(path)
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: auto 1fr;
  background: var(--app-bg);
}

.app-sidebar {
  width: 248px;
  padding: 20px 16px;
  background: rgba(252, 252, 250, 0.92);
  border-right: 1px solid var(--app-border);
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.app-sidebar.collapsed {
  width: 84px;
}

.sidebar-brand {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sidebar-toggle {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-kicker,
.topbar-kicker {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-text-muted);
}

.brand-copy h1,
.topbar-copy h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  color: var(--app-text);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--app-text-soft);
  cursor: pointer;
  text-align: left;
  font-size: 14px;
}

.nav-item:hover {
  background: var(--app-surface-muted);
  color: var(--app-text);
}

.nav-item.active {
  background: var(--app-surface);
  border-color: var(--app-border);
  color: var(--app-text);
  box-shadow: var(--app-shadow-soft);
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface);
}

.sidebar-footer p,
.sidebar-footer span,
.topbar-copy p {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.sidebar-footer p {
  color: var(--app-text);
  font-weight: 600;
  margin-bottom: 6px;
}

.app-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 32px 8px;
}

.topbar-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-pill,
.profile-chip {
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text-soft);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
}

.profile-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.app-content {
  flex: 1;
  padding: 8px 32px 32px;
}

@media (max-width: 1100px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    position: static;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--app-border);
  }

  .app-sidebar.collapsed {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .topbar,
  .app-content {
    padding-left: 16px;
    padding-right: 16px;
  }

  .topbar {
    flex-direction: column;
  }

  .topbar-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
