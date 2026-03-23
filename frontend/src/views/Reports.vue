<template>
  <div class="reports-page">
    <section class="hero app-panel">
      <div>
        <span class="section-kicker">Report Studio</span>
        <h2>报告中心</h2>
        <p>把模板、进度、下载和归档放到一个更现代的工作台里，减少老式表格页的割裂感。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            创建报告
          </el-button>
          <el-button size="large" @click="refreshReports">
            <el-icon><Refresh /></el-icon>
            刷新列表
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <span class="hero-label">{{ featuredGeneratingReport ? '当前生成任务' : '最近交付' }}</span>
        <h3>{{ (featuredGeneratingReport || featuredReport)?.name || '模板已准备就绪' }}</h3>
        <p>{{ featuredHint }}</p>
        <el-progress
          v-if="featuredGeneratingReport"
          :percentage="featuredGeneratingReport.progress"
          :stroke-width="10"
        />
        <div v-else class="hero-meta">
          <span>{{ reports.length }} 份报告</span>
          <span>{{ completedReports.length }} 份已完成</span>
        </div>
      </div>
    </section>

    <section class="stats">
      <article v-for="item in summaryCards" :key="item.label" class="stat-card app-panel" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.desc }}</p>
      </article>
    </section>

    <section class="workspace">
      <div class="templates app-panel">
        <div class="section-head">
          <div>
            <span class="section-kicker">Templates</span>
            <h3>模板库</h3>
          </div>
          <p>点击模板直接带出推荐周期和内容组合。</p>
        </div>

        <div class="template-grid">
          <button
            v-for="template in reportTemplates"
            :key="template.id"
            type="button"
            class="template-card"
            @click="createFromTemplate(template)"
          >
            <div class="template-top">
              <div class="template-icon" :class="template.tone">
                <el-icon><component :is="template.icon" /></el-icon>
              </div>
              <span>{{ template.category }}</span>
            </div>
            <strong>{{ template.name }}</strong>
            <p>{{ template.description }}</p>
          </button>
        </div>
      </div>

      <aside class="side app-panel">
        <div class="section-head slim">
          <div>
            <span class="section-kicker">Queue</span>
            <h3>生成队列</h3>
          </div>
        </div>

        <div v-if="generatingReports.length" class="queue">
          <article v-for="report in generatingReports.slice(0, 3)" :key="report.id" class="queue-item">
            <strong>{{ report.name }}</strong>
            <span>{{ getTypeName(report.type) }} · {{ report.format.toUpperCase() }}</span>
            <el-progress :percentage="report.progress" :stroke-width="8" :show-text="false" />
          </article>
        </div>
        <div v-else class="empty-note">
          <strong>当前没有生成中的报告</strong>
          <p>创建新报告后，这里会实时显示进度。</p>
        </div>
      </aside>
    </section>

    <section class="library app-panel">
      <div class="library-head">
        <div>
          <span class="section-kicker">Library</span>
          <h3>报告档案</h3>
        </div>
        <div class="filters">
          <el-select v-model="statusFilter" clearable placeholder="状态筛选" size="large">
            <el-option label="全部状态" value="" />
            <el-option label="生成中" value="generating" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
          </el-select>
          <el-select v-model="typeFilter" clearable placeholder="类型筛选" size="large">
            <el-option label="全部类型" value="" />
            <el-option label="日报" value="daily" />
            <el-option label="周报" value="weekly" />
            <el-option label="月报" value="monthly" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </div>
      </div>

      <div v-if="reportsLoading" class="loading-wrap">
        <el-skeleton :rows="8" animated />
      </div>
      <div v-else-if="filteredReports.length" class="report-grid">
        <article v-for="report in filteredReports" :key="report.id" class="report-card" :class="getReportTone(report.type)">
          <div class="report-cover" :class="getReportTone(report.type)">
            <span class="cover-kicker">{{ getTypeName(report.type) }} REPORT</span>
            <strong>{{ report.name }}</strong>
            <p>{{ getReportCoverCopy(report) }}</p>
            <div class="cover-meta">
              <span>{{ report.format.toUpperCase() }}</span>
              <span>{{ formatShortTime(report.createdAt) }}</span>
            </div>
          </div>

          <div class="report-top">
            <div>
              <div class="chips">
                <span class="chip type">{{ getTypeName(report.type) }}</span>
                <span class="chip">{{ report.format.toUpperCase() }}</span>
              </div>
              <h4>交付摘要</h4>
            </div>
            <span class="status" :class="report.status">{{ getStatusName(report.status) }}</span>
          </div>

          <p class="caption">{{ buildReportCaption(report) }}</p>

          <el-progress
            v-if="report.status === 'generating'"
            :percentage="report.progress"
            :stroke-width="9"
          />

          <div class="meta-grid">
            <div>
              <span>创建时间</span>
              <strong>{{ formatTime(report.createdAt) }}</strong>
            </div>
            <div>
              <span>文件大小</span>
              <strong>{{ report.size || '待生成' }}</strong>
            </div>
          </div>

          <div v-if="report.content?.length" class="content-tags">
            <span v-for="item in report.content" :key="item" class="content-tag">{{ getContentLabel(item) }}</span>
          </div>

          <div v-if="report.status === 'failed' && report.errorMessage" class="error-box">
            {{ report.errorMessage }}
          </div>

          <div class="actions">
            <el-button @click="previewReport(report)" :disabled="report.status !== 'completed'">预览</el-button>
            <el-button type="primary" @click="downloadReport(report)" :disabled="report.status !== 'completed'">下载</el-button>
            <el-button type="danger" plain @click="deleteReport(report)">删除</el-button>
          </div>
        </article>
      </div>
      <div v-else class="empty-wrap">
        <el-empty description="当前筛选条件下没有报告">
          <el-button type="primary" @click="showCreateDialog = true">创建第一份报告</el-button>
        </el-empty>
      </div>
    </section>

    <el-dialog v-model="showCreateDialog" title="创建报告" width="680px">
      <div class="dialog-intro">
        <span class="section-kicker">New Delivery</span>
        <h3>定义新的报告交付</h3>
        <p>选择周期、时间范围和包含内容，生成完成后可直接下载为 PDF 或 Excel。</p>
      </div>

      <el-form :model="reportForm" label-position="top" class="report-form">
        <el-form-item label="报告名称">
          <el-input v-model="reportForm.name" placeholder="例如：设备健康周报 · 华东一区" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="报告类型">
            <el-select v-model="reportForm.type" placeholder="请选择报告类型">
              <el-option label="日报" value="daily" />
              <el-option label="周报" value="weekly" />
              <el-option label="月报" value="monthly" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </el-form-item>
          <el-form-item label="输出格式">
            <el-radio-group v-model="reportForm.format">
              <el-radio-button label="pdf">PDF</el-radio-button>
              <el-radio-button label="excel">Excel</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="reportForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="包含内容">
          <div class="picker">
            <label v-for="option in contentOptions" :key="option.value" class="pick-item">
              <input v-model="reportForm.content" :value="option.value" type="checkbox">
              <div>
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </div>
            </label>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="large" @click="showCreateDialog = false">取消</el-button>
        <el-button size="large" type="primary" @click="createReport">生成报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DataAnalysis, Document, Histogram, PieChart, Plus, Refresh } from '@element-plus/icons-vue'
import { reportApi } from '@/api'

interface ReportTemplate { id: string; name: string; description: string; category: string; icon: any; tone: string }
interface Report { id: string; name: string; type: string; status: string; progress: number; createdAt: string; size?: string; format: string; content?: string[]; dateRange?: string[]; errorMessage?: string }
interface ReportForm { name: string; type: string; dateRange: Date[]; content: string[]; format: string }

const reports = ref<Report[]>([])
const reportsLoading = ref(false)
const statusFilter = ref('')
const typeFilter = ref('')
const showCreateDialog = ref(false)
const pollingTimer = ref<number | null>(null)
const pollingInFlight = ref(false)
const POLLING_INTERVAL = 2000

const createDefaultReportForm = (): ReportForm => ({ name: '', type: '', dateRange: [], content: [], format: 'pdf' })
const reportForm = ref<ReportForm>(createDefaultReportForm())

const reportTemplates = ref<ReportTemplate[]>([
  { id: 'template-1', name: '系统日报', description: '适合日常交接的系统与告警总览。', category: '系统总览', icon: Document, tone: 'blue' },
  { id: 'template-2', name: '性能周报', description: '聚焦性能指标、趋势变化与负载表现。', category: '性能洞察', icon: Histogram, tone: 'green' },
  { id: 'template-3', name: '告警月报', description: '关注告警等级、异常趋势与处理回顾。', category: '告警分析', icon: DataAnalysis, tone: 'amber' },
  { id: 'template-4', name: '设备统计', description: '展示设备运行概况与关键参数分布。', category: '设备运营', icon: PieChart, tone: 'slate' }
])

const contentOptions = [
  { value: 'system', label: '系统状态', description: '整体运行状态、服务健康度与配置摘要。' },
  { value: 'sensors', label: '传感器数据', description: '关键采样数据、最新读数和异常点记录。' },
  { value: 'alarms', label: '告警信息', description: '活跃告警、趋势和历史处理记录。' },
  { value: 'performance', label: '性能指标', description: 'CPU、内存、API 响应时间和系统负载。' },
  { value: 'trends', label: '趋势分析', description: '周期变化、峰值区间和整体判断。' }
]

const mapReport = (report: any): Report => ({ id: report.id, name: report.name, type: report.type, status: report.status, progress: report.progress ?? 0, createdAt: report.createdAt || report.created_at || new Date().toISOString(), size: report.size, format: report.format || 'pdf', content: report.content || [], dateRange: report.dateRange || report.date_range || [], errorMessage: report.errorMessage || report.error_message })
const sortReports = (items: Report[]) => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

const filteredReports = computed(() => reports.value.filter(report => (!statusFilter.value || report.status === statusFilter.value) && (!typeFilter.value || report.type === typeFilter.value)))
const generatingReports = computed(() => reports.value.filter(report => report.status === 'generating'))
const completedReports = computed(() => reports.value.filter(report => report.status === 'completed'))
const failedReports = computed(() => reports.value.filter(report => report.status === 'failed'))
const featuredGeneratingReport = computed(() => generatingReports.value[0] ?? null)
const featuredReport = computed(() => reports.value[0] ?? null)
const featuredHint = computed(() => featuredGeneratingReport.value ? `进度 ${featuredGeneratingReport.value.progress}% · ${getTypeName(featuredGeneratingReport.value.type)}` : featuredReport.value ? `${getStatusName(featuredReport.value.status)} · ${formatTime(featuredReport.value.createdAt)}` : '从模板快速创建日报、周报、月报或自定义交付物。')

const summaryCards = computed(() => [
  { label: '全部报告', value: reports.value.length, desc: '当前档案库中的报告数量。', tone: 'primary' },
  { label: '生成中', value: generatingReports.value.length, desc: '自动轮询中，完成后可直接交付。', tone: 'warning' },
  { label: '已完成', value: completedReports.value.length, desc: '已可下载或再次归档。', tone: 'success' },
  { label: '失败任务', value: failedReports.value.length, desc: '建议重新生成并检查条件。', tone: 'danger' }
])

const getTypeName = (type: string) => ({ daily: '日报', weekly: '周报', monthly: '月报', custom: '自定义' }[type] || type)
const getStatusName = (status: string) => ({ generating: '生成中', completed: '已完成', failed: '失败' }[status] || status)
const getContentLabel = (value: string) => ({ system: '系统状态', sensors: '传感器数据', alarms: '告警信息', performance: '性能指标', trends: '趋势分析' }[value] || value)
const getReportTone = (type: string) => ({ daily: 'tone-blue', weekly: 'tone-green', monthly: 'tone-amber', custom: 'tone-slate' }[type] || 'tone-slate')
const formatTime = (time: string) => {
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN')
}
const formatShortTime = (time: string) => {
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? '刚刚生成' : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
const buildReportCaption = (report: Report) => report.status === 'failed' ? '导出过程未成功完成，请检查筛选条件后重新生成。' : report.status === 'generating' ? '系统正在整理数据、生成快照并准备最终导出文件。' : '报告已生成，可用于交付、归档或进一步下载分享。'
const getReportCoverCopy = (report: Report) => report.status === 'failed' ? '本次生成已中断，建议调整条件后重新提交。' : report.status === 'generating' ? `正在汇总 ${report.content?.length || 0} 个内容模块，稍后自动归档。` : '版式与数据已固定，可直接用于交付或归档留存。'
const getSuggestedDateRange = (type: string): Date[] => {
  const end = new Date()
  const start = new Date(end)
  if (type === 'daily') start.setDate(end.getDate() - 1)
  else if (type === 'weekly') start.setDate(end.getDate() - 7)
  else if (type === 'monthly') start.setMonth(end.getMonth() - 1)
  else start.setDate(end.getDate() - 3)
  return [start, end]
}

const stopPolling = () => { if (pollingTimer.value !== null) { window.clearInterval(pollingTimer.value); pollingTimer.value = null } }
const syncPolling = (items: Report[]) => {
  if (!items.some(report => report.status === 'generating')) return stopPolling()
  if (pollingTimer.value !== null) return
  pollingTimer.value = window.setInterval(async () => {
    if (pollingInFlight.value) return
    pollingInFlight.value = true
    try { await fetchReports(false) } finally { pollingInFlight.value = false }
  }, POLLING_INTERVAL)
}

const fetchReports = async (showLoading = true) => {
  reportsLoading.value = showLoading
  try {
    const response: any = await reportApi.getReports()
    reports.value = sortReports((response.reports || response.data || []).map(mapReport))
    syncPolling(reports.value)
    return true
  } catch (error) {
    console.error('获取报告列表失败:', error)
    ElMessage.error('获取报告列表失败')
    return false
  } finally {
    reportsLoading.value = false
  }
}

const createFromTemplate = (template: ReportTemplate) => {
  const nextForm = createDefaultReportForm()
  nextForm.name = `${template.name} - ${new Date().toLocaleDateString()}`
  if (template.id === 'template-1') { nextForm.type = 'daily'; nextForm.content = ['system', 'sensors', 'alarms'] }
  else if (template.id === 'template-2') { nextForm.type = 'weekly'; nextForm.content = ['performance', 'trends'] }
  else if (template.id === 'template-3') { nextForm.type = 'monthly'; nextForm.content = ['alarms', 'trends'] }
  else { nextForm.type = 'custom'; nextForm.content = ['system', 'sensors'] }
  nextForm.dateRange = getSuggestedDateRange(nextForm.type)
  reportForm.value = nextForm
  showCreateDialog.value = true
}

const createReport = async () => {
  if (!reportForm.value.name || !reportForm.value.type) return ElMessage.warning('请填写完整的报告信息')
  try {
    const response: any = await reportApi.createReport({ name: reportForm.value.name, type: reportForm.value.type, format: reportForm.value.format, content: reportForm.value.content, date_range: reportForm.value.dateRange.map(item => item.toISOString()) })
    const createdReport = mapReport(response.report || response.data)
    reports.value = [createdReport, ...reports.value.filter(item => item.id !== createdReport.id)]
    syncPolling(reports.value)
    showCreateDialog.value = false
    reportForm.value = createDefaultReportForm()
    ElMessage.success('报告创建成功，正在生成中')
  } catch (error) {
    console.error('创建报告失败:', error)
    ElMessage.error('创建报告失败')
  }
}

const previewReport = (report: Report) => ElMessage.info(`报告 ${report.name} 已生成，可直接下载查看`)
const getErrorMessage = (error: any, fallback: string) => error?.response?.data?.detail || error?.response?.data?.message || fallback
const getDownloadFilename = (header: string | undefined, fallbackName: string) => {
  if (!header) return fallbackName
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
  const filenameMatch = header.match(/filename="?([^";]+)"?/i)
  return filenameMatch?.[1] || fallbackName
}

const downloadReport = async (report: Report) => {
  try {
    const response: any = await reportApi.downloadReport(report.id)
    const url = window.URL.createObjectURL(response.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getDownloadFilename(response.headers?.['content-disposition'], `${report.name}.${report.format}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success(`下载报告: ${report.name}`)
  } catch (error: any) {
    console.error('下载报告失败:', error)
    ElMessage.error(getErrorMessage(error, '下载报告失败'))
  }
}

const deleteReport = async (report: Report) => {
  try {
    await ElMessageBox.confirm(`确定要删除报告 "${report.name}" 吗？`, '确认删除', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await reportApi.deleteReport(report.id)
    reports.value = reports.value.filter(item => item.id !== report.id)
    syncPolling(reports.value)
    ElMessage.success('报告删除成功')
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除报告失败')
  }
}

const refreshReports = async () => {
  const refreshed = await fetchReports()
  if (refreshed) ElMessage.success('报告列表已刷新')
}

onMounted(() => { fetchReports() })
onBeforeUnmount(() => { stopPolling() })
</script>

<style scoped>
.reports-page{display:flex;flex-direction:column;gap:18px}
.hero,.templates,.side,.library{padding:22px}
.hero{display:grid;grid-template-columns:minmax(0,1.2fr)360px;gap:18px;background:radial-gradient(circle at top right,rgba(79,111,255,.14),transparent 36%),linear-gradient(135deg,rgba(255,255,255,.96),rgba(249,247,241,.94))}
.hero h2,.section-head h3,.library-head h3,.dialog-intro h3{margin:4px 0 0;font-size:30px;color:var(--app-text)}
.hero p,.section-head p,.dialog-intro p{margin:10px 0 0;color:var(--app-text-muted);line-height:1.8}
.hero-actions,.filters,.actions,.hero-meta{display:flex;flex-wrap:wrap;gap:10px}
.hero-panel{padding:22px;border-radius:22px;background:rgba(36,34,28,.92);color:#fff;box-shadow:0 24px 44px rgba(26,21,12,.18)}
.hero-panel h3{margin:8px 0 0;font-size:24px;line-height:1.2}
.hero-panel p{color:rgba(255,255,255,.72);margin:10px 0 16px}
.hero-label,.stat-card span,.template-top span,.meta-grid span{font-size:12px;color:var(--app-text-muted)}
.hero-label{color:rgba(255,255,255,.62);text-transform:uppercase;letter-spacing:.08em}
.hero-meta span{padding:0 12px;min-height:34px;border-radius:999px;background:rgba(255,255,255,.12);display:inline-flex;align-items:center;font-size:12px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.stat-card{padding:18px;display:grid;gap:8px}
.stat-card strong{font-size:30px;line-height:1}
.stat-card p{color:var(--app-text-muted);font-size:13px}
.stat-card.primary{background:linear-gradient(180deg,rgba(79,111,255,.08),rgba(255,255,255,.96))}
.stat-card.warning{background:linear-gradient(180deg,rgba(213,143,42,.1),rgba(255,255,255,.96))}
.stat-card.success{background:linear-gradient(180deg,rgba(47,158,114,.1),rgba(255,255,255,.96))}
.stat-card.danger{background:linear-gradient(180deg,rgba(214,87,69,.1),rgba(255,255,255,.96))}
.workspace{display:grid;grid-template-columns:minmax(0,1.45fr)320px;gap:18px}
.section-head,.library-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:18px}
.section-head.slim{margin-bottom:14px}
.template-grid,.report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.template-card,.queue-item,.report-card,.pick-item{border:1px solid var(--app-border-subtle);background:linear-gradient(180deg,var(--app-surface),var(--app-surface-muted));border-radius:20px}
.template-card{padding:18px;text-align:left;cursor:pointer;transition:.25s}
.template-card:hover{transform:translateY(-3px);box-shadow:var(--app-shadow-float);border-color:rgba(79,111,255,.18)}
.template-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.template-icon{width:52px;height:52px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:24px}
.template-icon.blue{background:rgba(79,111,255,.12);color:var(--app-accent)}
.template-icon.green{background:rgba(47,158,114,.12);color:var(--app-success)}
.template-icon.amber{background:rgba(213,143,42,.14);color:var(--app-warning)}
.template-icon.slate{background:rgba(122,134,154,.12);color:#617086}
.template-card strong,.queue-item strong,.report-card h4{color:var(--app-text)}
.template-card p,.caption,.empty-note p{color:var(--app-text-muted);font-size:13px;line-height:1.7}
.side{display:flex;flex-direction:column}
.queue{display:grid;gap:12px}
.queue-item{padding:14px;display:grid;gap:8px}
.queue-item span{font-size:12px;color:var(--app-text-muted)}
.empty-note{padding:18px;border:1px dashed var(--app-border);border-radius:16px;background:var(--app-surface-muted)}
.empty-note strong{color:var(--app-text)}
.library-head{margin-bottom:18px}
.filters :deep(.el-select){width:160px}
.loading-wrap,.empty-wrap{padding:12px 0}
.report-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.report-card{padding:18px;display:flex;flex-direction:column;gap:14px;background:radial-gradient(circle at top right,rgba(79,111,255,.08),transparent 35%),linear-gradient(180deg,var(--app-surface),var(--app-surface-muted));overflow:hidden;transition:transform .25s,box-shadow .25s}
.report-card:hover{transform:translateY(-4px);box-shadow:0 20px 38px rgba(31,24,13,.09)}
.report-cover{position:relative;overflow:hidden;padding:18px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#4158d0,#657dff 60%,#92a6ff)}
.report-cover::after{content:'';position:absolute;inset:auto -18% -55% auto;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12);filter:blur(2px)}
.report-cover.tone-green{background:linear-gradient(135deg,#177a61,#2f9e72 58%,#7dd1a7)}
.report-cover.tone-amber{background:linear-gradient(135deg,#9b5b00,#d58f2a 58%,#f4ca77)}
.report-cover.tone-slate{background:linear-gradient(135deg,#49566a,#708198 58%,#9eabc0)}
.cover-kicker{position:relative;z-index:1;display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.14);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.report-cover strong,.report-cover p,.cover-meta{position:relative;z-index:1}
.report-cover strong{display:block;margin-top:18px;font-size:22px;line-height:1.2}
.report-cover p{margin:10px 0 18px;color:rgba(255,255,255,.8);font-size:13px;line-height:1.7}
.cover-meta{display:flex;flex-wrap:wrap;gap:8px}
.cover-meta span{min-height:30px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;background:rgba(255,255,255,.14);font-size:12px}
.report-top{display:flex;justify-content:space-between;align-items:start;gap:10px}
.chips,.content-tags{display:flex;flex-wrap:wrap;gap:8px}
.chip,.status,.content-tag{min-height:28px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;font-size:12px}
.chip{background:var(--app-surface-soft);color:var(--app-text-soft)}
.chip.type{background:rgba(79,111,255,.12);color:var(--app-accent)}
.status.generating{background:rgba(213,143,42,.14);color:var(--app-warning)}
.status.completed{background:rgba(47,158,114,.12);color:var(--app-success)}
.status.failed{background:rgba(214,87,69,.12);color:var(--app-danger)}
.caption{min-height:44px;margin:0}
.meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.meta-grid>div{padding:12px;border-radius:14px;background:rgba(255,255,255,.72);border:1px solid var(--app-border-subtle);display:grid;gap:6px}
.meta-grid strong{font-size:13px;line-height:1.5;color:var(--app-text)}
.content-tag{background:rgba(36,34,28,.06);color:var(--app-text-soft)}
.error-box{padding:12px 14px;border-radius:14px;background:rgba(214,87,69,.1);color:var(--app-danger);font-size:12px;line-height:1.7}
.actions{margin-top:auto}
.dialog-intro{margin-bottom:16px}
.report-form{display:grid;gap:8px}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.picker{display:grid;gap:12px}
.pick-item{padding:14px;display:grid;grid-template-columns:20px 1fr;gap:12px;background:var(--app-surface-muted);cursor:pointer}
.pick-item input{margin-top:3px}
.pick-item strong{display:block;color:var(--app-text);margin-bottom:6px}
.pick-item span{font-size:12px;color:var(--app-text-muted);line-height:1.7}
@media (max-width:1200px){.report-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:1100px){.hero,.workspace,.stats{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:768px){.hero,.templates,.side,.library{padding:18px}.template-grid,.report-grid,.form-grid,.stats{grid-template-columns:1fr}.section-head,.library-head{flex-direction:column;align-items:stretch}.filters :deep(.el-select){width:100%}.hero h2{font-size:26px}}
</style>
