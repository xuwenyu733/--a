<template>
  <view class="page">
    <!-- 顶部引导 -->
    <view class="hero">
      <view class="hero-bg" />
      <view class="hero-body">
        <text class="hero-emoji">✨</text>
        <view class="hero-text">
          <text class="hero-title">AI 简历优化</text>
          <text class="hero-sub">填写信息 → 智能生成 → Web 端导出 PDF</text>
        </view>
      </view>
    </view>

    <view class="main">
      <!-- 基本信息 -->
      <view class="form-card">
        <view class="form-head">
          <text class="form-head-icon">👤</text>
          <text class="form-head-title">基本信息</text>
        </view>

        <view class="field">
          <text class="field-label">姓名<text class="required">*</text></text>
          <input
            class="field-input"
            v-model="form.name"
            placeholder="请输入真实姓名"
            placeholder-class="ph"
          />
        </view>

        <view class="field-row">
          <view class="field field-half">
            <text class="field-label">手机号</text>
            <input
              class="field-input"
              type="number"
              v-model="form.phone"
              placeholder="11 位手机号"
              placeholder-class="ph"
            />
          </view>
          <view class="field field-half">
            <text class="field-label">邮箱</text>
            <input
              class="field-input"
              v-model="form.email"
              placeholder="name@school.edu.cn"
              placeholder-class="ph"
            />
          </view>
        </view>

        <view class="field">
          <text class="field-label">意向岗位</text>
          <input
            class="field-input"
            v-model="form.targetRole"
            placeholder="如：前端开发工程师"
            placeholder-class="ph"
          />
        </view>

        <view class="field">
          <text class="field-label">个人简介</text>
          <textarea
            class="field-textarea"
            v-model="form.summary"
            placeholder="简要介绍自己的优势、经历与求职意向"
            placeholder-class="ph"
            :maxlength="500"
          />
          <text class="field-hint">{{ (form.summary || '').length }}/500</text>
        </view>
      </view>

      <!-- 能力与经历 -->
      <view class="form-card">
        <view class="form-head">
          <text class="form-head-icon">💼</text>
          <text class="form-head-title">能力与经历</text>
        </view>

        <view class="field">
          <text class="field-label">技能特长</text>
          <text class="field-tip">多个技能用逗号分隔</text>
          <input
            class="field-input"
            v-model="skillsText"
            placeholder="Vue, Node.js, Python"
            placeholder-class="ph"
          />
        </view>

        <view class="field">
          <text class="field-label">教育经历</text>
          <textarea
            class="field-textarea field-textarea-sm"
            v-model="form.educationsText"
            placeholder="学校、专业、起止时间"
            placeholder-class="ph"
          />
        </view>

        <view class="field">
          <text class="field-label">项目经历</text>
          <textarea
            class="field-textarea field-textarea-sm"
            v-model="form.projectsText"
            placeholder="项目名称、职责、成果"
            placeholder-class="ph"
          />
        </view>
      </view>

      <!-- 模板样式 -->
      <view class="form-card">
        <view class="form-head">
          <text class="form-head-icon">🎨</text>
          <text class="form-head-title">模板样式</text>
        </view>

        <view class="field">
          <text class="field-label">模板</text>
          <scroll-view scroll-x class="template-scroll" :show-scrollbar="false" enable-flex>
            <view class="template-row">
              <view
                v-for="t in templates"
                :key="t.value"
                class="template-chip"
                :class="{ active: form.template === t.value }"
                @tap="form.template = t.value"
              >
                <view class="template-dot" :style="{ background: t.color }" />
                <text>{{ t.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="field field-last">
          <text class="field-label">风格</text>
          <view class="style-row">
            <view
              v-for="s in styles"
              :key="s.value"
              class="style-chip"
              :class="{ active: form.style === s.value }"
              @tap="form.style = s.value"
            >{{ s.label }}</view>
          </view>
        </view>
      </view>

      <!-- AI 优化 -->
      <view class="form-card">
        <view class="form-head">
          <text class="form-head-icon">🤖</text>
          <text class="form-head-title">AI 优化参考</text>
        </view>
        <view class="field field-last">
          <text class="field-label">目标岗位 JD</text>
          <text class="field-tip">粘贴招聘描述，AI 将针对性优化简历</text>
          <textarea
            class="field-textarea"
            v-model="form.jobDescription"
            placeholder="粘贴目标岗位的职位描述…"
            placeholder-class="ph"
          />
        </view>
      </view>

      <!-- 生成结果 -->
      <view v-if="result" class="form-card result-card">
        <view class="form-head">
          <text class="form-head-icon">📄</text>
          <text class="form-head-title">生成结果</text>
        </view>
        <scroll-view scroll-y class="result-scroll">
          <text class="result-text">{{ result }}</text>
        </scroll-view>
        <text class="result-hint">完整 PDF / Word / 在线预览请使用 Web 端查看</text>
      </view>

      <!-- 历史记录 -->
      <view v-if="history.length" class="form-card">
        <view class="form-head">
          <text class="form-head-icon">🕐</text>
          <text class="form-head-title">历史记录</text>
        </view>
        <view
          v-for="h in history"
          :key="h._id"
          class="history-item"
          @tap="loadHistory(h)"
        >
          <view class="history-left">
            <text class="history-name">{{ h.title || h.formData?.name || '未命名' }}</text>
            <text class="history-time">{{ formatTime(h.updatedAt || h.createdAt) }}</text>
          </view>
          <text class="history-arrow">›</text>
        </view>
      </view>

      <view class="footer-spacer" />
    </view>

    <!-- 底部操作栏 -->
    <view class="footer-bar">
      <view class="footer-btn footer-btn-ghost" @tap="saveHistory">保存草稿</view>
      <view
        class="footer-btn footer-btn-primary"
        :class="{ loading: generating }"
        @tap="generate"
      >
        {{ generating ? '生成中…' : 'AI 生成简历' }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listResumeHistory, createResumeHistory, generateResume } from '@/api/resume'
import { ensureLogin, getUser } from '@/utils/auth'
import { formatTime } from '@/utils/format'

const generating = ref(false)
const result = ref('')
const history = ref([])
const skillsText = ref('')

const templates = [
  { value: 'classic-green', label: '经典绿', color: '#67c23a' },
  { value: 'modern-blue', label: '现代蓝', color: '#409eff' },
  { value: 'minimal-gray', label: '极简灰', color: '#909399' },
]
const styles = [
  { value: 'professional', label: '专业' },
  { value: 'creative', label: '创意' },
  { value: 'simple', label: '简洁' },
]
const form = ref({
  name: '',
  phone: '',
  email: '',
  targetRole: '',
  summary: '',
  educationsText: '',
  projectsText: '',
  jobDescription: '',
  template: 'classic-green',
  style: 'professional',
})

onShow(async () => {
  if (!ensureLogin()) return
  const u = getUser()
  form.value.name = form.value.name || u?.nickname || ''
  form.value.phone = form.value.phone || u?.phone || ''
  loadHistoryList()
})

async function loadHistoryList() {
  try {
    const res = await listResumeHistory({ pageSize: 10 })
    history.value = res.list || []
  } catch {
    history.value = []
  }
}

function buildPayload() {
  const skills = skillsText.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
  const educations = form.value.educationsText
    ? [{ school: form.value.educationsText, major: '', period: '' }]
    : []
  const projects = form.value.projectsText
    ? [{ name: form.value.projectsText, role: '', description: form.value.projectsText }]
    : []
  return {
    ...form.value,
    skills,
    educations,
    projects,
    experiences: [],
  }
}

async function saveHistory() {
  if (!form.value.name?.trim()) {
    uni.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }
  try {
    const payload = buildPayload()
    await createResumeHistory({
      title: `${form.value.name}的简历`,
      formData: payload,
      content: result.value || '',
    })
    uni.showToast({ title: '已保存', icon: 'success' })
    loadHistoryList()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

async function generate() {
  if (generating.value) return
  if (!form.value.name?.trim()) {
    uni.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }
  if (!form.value.phone?.trim() && !form.value.email?.trim()) {
    uni.showToast({ title: '请填写手机号或邮箱', icon: 'none' })
    return
  }
  generating.value = true
  try {
    const res = await generateResume(buildPayload())
    result.value = res.optimizedContent || ''
    uni.showToast({ title: '生成成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '生成失败', icon: 'none' })
  } finally {
    generating.value = false
  }
}

function loadHistory(h) {
  const data = h.formData || {}
  form.value = {
    ...form.value,
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    targetRole: data.targetRole || '',
    summary: data.summary || '',
    jobDescription: data.jobDescription || '',
    educationsText: data.educations?.[0]?.school || '',
    projectsText: data.projects?.[0]?.name || '',
  }
  skillsText.value = (data.skills || []).join(', ')
  result.value = h.content || ''
  uni.showToast({ title: '已加载草稿', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

/* 顶部 */
.hero {
  position: relative;
  padding: 40rpx 32rpx 56rpx;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0 0 32rpx 32rpx;
}

.hero-body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.hero-emoji {
  font-size: 64rpx;
}

.hero-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.hero-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.main {
  margin-top: -24rpx;
  padding: 0 24rpx;
  position: relative;
  z-index: 1;
}

/* 表单卡片 */
.form-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 8rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.form-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.form-head-icon {
  font-size: 32rpx;
}

.form-head-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

/* 表单项 */
.field {
  margin-bottom: 28rpx;
}

.field-last {
  margin-bottom: 20rpx;
}

.field-row {
  display: flex;
  gap: 20rpx;
}

.field-half {
  flex: 1;
  min-width: 0;
}

.field-label {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12rpx;
}

.required {
  color: #f56c6c;
  margin-left: 4rpx;
}

.field-tip {
  display: block;
  font-size: 22rpx;
  color: #c0c4cc;
  margin: -4rpx 0 10rpx;
}

.field-input {
  display: block;
  width: 100%;
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 24rpx;
  background: #fafbfc;
  border: 2rpx solid #ebeef5;
  border-radius: 14rpx;
  font-size: 28rpx;
  color: #303133;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.field-input:focus {
  border-color: #667eea;
  background: #fff;
}

.field-textarea {
  display: block;
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx 24rpx;
  line-height: 1.6;
  background: #fafbfc;
  border: 2rpx solid #ebeef5;
  border-radius: 14rpx;
  font-size: 28rpx;
  color: #303133;
  box-sizing: border-box;
}

.field-textarea-sm {
  min-height: 140rpx;
}

.field-hint {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #c0c4cc;
  margin-top: 8rpx;
}

/* placeholder 颜色（小程序专用 class） */
:deep(.ph),
.ph {
  color: #c0c4cc;
  font-size: 26rpx;
}

/* 生成结果 */
.result-card {
  padding-bottom: 24rpx;
}

.result-scroll {
  max-height: 480rpx;
  background: #fafbfc;
  border: 2rpx solid #ebeef5;
  border-radius: 14rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}

.result-text {
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
  color: #303133;
}

.result-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #909399;
  text-align: center;
}

/* 历史记录 */
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f2f5;
}

.history-item:last-child {
  border-bottom: none;
  padding-bottom: 12rpx;
}

.history-item:active {
  opacity: 0.7;
}

.history-name {
  display: block;
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
}

.history-time {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #909399;
}

.history-arrow {
  font-size: 36rpx;
  color: #c0c4cc;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.footer-spacer {
  height: 24rpx;
}

/* 底部操作栏 */
.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.footer-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.footer-btn-ghost {
  background: #f5f7fa;
  color: #606266;
  border: 2rpx solid #ebeef5;
  flex: 0.8;
}

.footer-btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, 0.4);
}

.footer-btn-primary.loading {
  opacity: 0.7;
}

.footer-btn:active {
  opacity: 0.88;
}

.template-scroll {
  white-space: nowrap;
}
.template-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 4rpx 0;
}
.template-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 24rpx;
  background: #f5f7fa;
  border: 2rpx solid transparent;
  border-radius: 14rpx;
  font-size: 26rpx;
  color: #606266;
}
.template-chip.active {
  border-color: #667eea;
  background: #f4f6ff;
  color: #667eea;
}
.template-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
}
.style-row {
  display: flex;
  gap: 16rpx;
}
.style-chip {
  padding: 14rpx 32rpx;
  background: #f5f7fa;
  border: 2rpx solid transparent;
  border-radius: 14rpx;
  font-size: 26rpx;
  color: #606266;
}
.style-chip.active {
  border-color: #667eea;
  background: #f4f6ff;
  color: #667eea;
}
</style>
