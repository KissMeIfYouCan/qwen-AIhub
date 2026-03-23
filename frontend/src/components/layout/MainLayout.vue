<template>
  <div class="main-layout">
    <!-- 顶部数据可视化区 -->
    <div class="top-panel">
      <TopDataPanel />
    </div>

    <!-- 主内容区域 -->
    <div class="content-wrapper">
      <!-- 左侧边栏功能模块 -->
      <div class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <SidebarModules @toggle-sidebar="toggleSidebar" />
      </div>

      <!-- 中央内容区 -->
      <div class="main-content">
        <slot />
      </div>
    </div>

    <!-- 浮动AI指令输入框 -->
    <BottomAIInput />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TopDataPanel from './TopDataPanel.vue'
import SidebarModules from './SidebarModules.vue'
import BottomAIInput from './BottomAIInput.vue'

const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.top-panel {
  height: 280px; /* 减小高度 */
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  margin-bottom: 16px; /* 增加底部边距 */
}

.content-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
  margin-top: 8px; /* 增加顶部间距，防止与顶部面板重叠 */
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
  transition: width 0.3s ease;
  overflow-y: auto;
}

.sidebar-collapsed {
  width: 60px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 140px; /* Add space for floating AI input */
  background: var(--el-bg-color-page);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-wrapper {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: auto;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .sidebar-collapsed {
    height: 60px;
    width: 100%;
  }

  .top-panel {
    height: 180px; /* 移动端减小高度 */
    margin-bottom: 12px;
  }

  .main-content {
    padding: 12px;
    padding-bottom: 140px; /* Maintain space for floating AI input */
  }
}

@media (max-width: 576px) {
  .top-panel {
    height: 150px; /* 小屏幕进一步减小高度 */
    margin-bottom: 8px;
  }

  .main-content {
    padding: 8px;
    padding-bottom: 140px; /* Maintain space for floating AI input */
  }
}

@media (max-width: 576px) {
  .top-panel {
    height: 150px;
  }

  .bottom-panel {
    height: 60px;
  }

  .main-content {
    padding: 8px;
  }
}
</style>