import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElAlert,
  ElAvatar,
  ElButton,
  ElButtonGroup,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElCol,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDivider,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElPagination,
  ElProgress,
  ElRadio,
  ElRadioButton,
  ElRadioGroup,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElSlider,
  ElStatistic,
  ElSwitch,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
  ElTag,
  ElText,
  ElTimeline,
  ElTimelineItem,
  ElTooltip
} from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChatDotRound,
  Check,
  CircleCheck,
  Clock,
  Close,
  Connection,
  CopyDocument,
  Cpu,
  DataAnalysis,
  Delete,
  Document,
  Download,
  Edit,
  Expand,
  Fold,
  Lightning,
  Minus,
  Monitor,
  Mute,
  Operation,
  Plus,
  Promotion,
  Refresh,
  RefreshRight,
  Setting,
  Timer,
  Tools,
  User,
  VideoPause,
  VideoPlay,
  View,
  Warning,
  WarningFilled
} from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('全局错误捕获:', err)
  console.error('错误信息:', info)
  console.error('组件实例:', vm)
}

const components = {
  ElAlert,
  ElAvatar,
  ElButton,
  ElButtonGroup,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElCol,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDivider,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElPagination,
  ElProgress,
  ElRadio,
  ElRadioButton,
  ElRadioGroup,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElSlider,
  ElStatistic,
  ElSwitch,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
  ElTag,
  ElText,
  ElTimeline,
  ElTimelineItem,
  ElTooltip
}

const icons = {
  ArrowDown,
  ArrowUp,
  Bell,
  ChatDotRound,
  Check,
  CircleCheck,
  Clock,
  Close,
  Connection,
  CopyDocument,
  Cpu,
  DataAnalysis,
  Delete,
  Document,
  Download,
  Edit,
  Expand,
  Fold,
  Lightning,
  Minus,
  Monitor,
  Mute,
  Operation,
  Plus,
  Promotion,
  Refresh,
  RefreshRight,
  Setting,
  Timer,
  Tools,
  User,
  VideoPause,
  VideoPlay,
  View,
  Warning,
  WarningFilled
}

for (const [key, component] of Object.entries(components)) {
  app.component(key, component)
}

for (const [key, component] of Object.entries(icons)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
})

app.mount('#app')
