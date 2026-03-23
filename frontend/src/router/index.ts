import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: {
        title: '驾驶舱',
        description: '查看全局设备状态、监控概览与关键告警。'
      }
    },
    {
      path: '/new-dashboard',
      name: 'NewDashboard',
      component: () => import('@/views/NewDashboard.vue'),
      meta: {
        title: 'AI智能监控平台',
        description: '新版传感器监控控制台'
      }
    },
    {
      path: '/devices',
      name: 'Devices',
      component: () => import('@/views/Devices.vue'),
      meta: {
        title: '设备管理',
        description: '管理设备台账、运行状态与维护动作。'
      }
    },
    {
      path: '/alarms',
      name: 'Alarms',
      component: () => import('@/views/Alarms.vue'),
      meta: {
        title: '告警管理',
        description: '集中查看告警级别、处理状态与流转记录。'
      }
    },
    {
      path: '/quick-commands',
      name: 'QuickCommands',
      component: () => import('@/views/QuickCommands.vue'),
      meta: {
        title: '快捷指令',
        description: '通过预设操作快速执行高频监控与诊断任务。'
      }
    },
    {
      path: '/reports',
      name: 'Reports',
      component: () => import('@/views/Reports.vue'),
      meta: {
        title: '报告生成',
        description: '组合模板、筛选条件与输出格式生成监控报告。'
      }
    },
    {
      path: '/polling-config',
      name: 'PollingConfig',
      component: () => import('@/views/PollingConfig.vue'),
      meta: {
        title: '轮询配置',
        description: '配置轮询频率、任务策略与调度行为。'
      }
    },
    {
      path: '/diagnosis',
      name: 'Diagnosis',
      component: () => import('@/views/Diagnosis.vue'),
      meta: {
        title: '异常诊断',
        description: '对关键异常进行定位、分析与建议输出。'
      }
    },
    {
      path: '/inspection',
      name: 'Inspection',
      component: () => import('@/views/Inspection.vue'),
      meta: {
        title: '巡检管理',
        description: '组织巡检任务、记录结果并跟踪处理闭环。'
      }
    },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('@/views/Chat.vue'),
      meta: {
        title: '知识问答',
        description: '在统一界面中发起 AI 问答与知识检索。'
      }
    },
    {
      path: '/config',
      name: 'Config',
      component: () => import('@/views/Config.vue'),
      meta: {
        title: '系统配置',
        description: '维护平台设置、阈值规则与基础参数。'
      }
    }
  ]
})

router.afterEach(to => {
  if (typeof to.meta.title === 'string') {
    document.title = to.meta.title
  }
})

export default router
