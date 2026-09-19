<template>
  <view class="page">
    <view class="hero">
      <view class="hero-bg" />
      <view class="hero-body">
        <text class="hero-emoji">📄</text>
        <view class="hero-text">
          <text class="hero-title">我的简历</text>
          <text class="hero-sub">小程序仅支持查看，创作请使用 PC 端</text>
        </view>
      </view>
    </view>

    <view class="main">
      <!-- PC 端创作提示 -->
      <view class="pc-card">
        <view class="pc-head">
          <text class="pc-icon">💻</text>
          <view class="pc-head-text">
            <text class="pc-title">请在电脑端创作简历</text>
            <text class="pc-desc">AI 生成、模板编辑、导出 PDF / Word 等功能请在 PC 浏览器中使用</text>
          </view>
        </view>
        <view class="pc-url-box">
          <text class="pc-url-label">PC 端地址</text>
          <text class="pc-url" selectable>{{ pcResumeUrl }}</text>
        </view>
        <view class="pc-actions">
          <view class="pc-btn pc-btn-ghost" @tap="copyPcUrl">复制链接</view>
          <view class="pc-btn pc-btn-primary" @tap="showPcTip">如何打开</view>
        </view>
      </view>

      <!-- 简历列表 -->
      <view class="form-card">
        <view class="form-head">
          <text class="form-head-icon">🕐</text>
          <text class="form-head-title">我的简历记录</text>
          <text v-if="history.length" class="form-head-count">{{ history.length }} 份</text>
        </view>

        <view v-if="loading" class="state-box">
          <text class="state-text muted">加载中…</text>
        </view>

        <view v-else-if="!history.length" class="state-box">
          <text class="state-emoji">📭</text>
          <text class="state-text">暂无简历记录</text>
          <text class="state-hint">请先在 PC 端创建并保存，保存后可在此查看</text>
        </view>

        <view v-else>
        <view
          v-for="h in history"
          :key="h._id"
          class="history-item"
            @tap="openResume(h)"
        >
          <view class="history-left">
              <text class="history-name">{{ resumeTitle(h) }}</text>
              <text class="history-meta">{{ resumeMeta(h) }}</text>
              <text class="history-time">{{ formatTime(h.updatedAt || h.createdAt) }} · 点击查看 PDF</text>
          </view>
          <text class="history-arrow">›</text>
        </view>
      </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import config from '@/config/index'
import { listResumeHistory, getResumeHistory } from '@/api/resume'
import { ensureLogin } from '@/utils/auth'
import { formatTime } from '@/utils/format'
import { resumeExportPayload } from '@/utils/resumeFormat'
import { exportAndOpenResumePdf } from '@/utils/resumeExport'

const loading = ref(false)
const exporting = ref(false)
const history = ref([])

const pcResumeUrl = computed(() => `${config.WEB_BASE}/resume/build`)

const STYLE_LABELS = {
  professional: '专业',
  creative: '创意',
  concise: '简洁',
}

onShow(async () => {
  if (!ensureLogin()) return
  await loadHistoryList()
})

async function loadHistoryList() {
  loading.value = true
  try {
    const res = await listResumeHistory({ pageSize: 20 })
    history.value = res.list || []
  } catch {
    history.value = []
  } finally {
    loading.value = false
  }
}

function resumeTitle(item) {
  return item.fileName?.trim()
    || item.builderData?.name
    || item.builderData?.targetRole
    || '未命名简历'
}

function resumeMeta(item) {
  const parts = []
  const role = item.builderData?.targetRole
  if (role) parts.push(role)
  if (item.style && STYLE_LABELS[item.style]) parts.push(STYLE_LABELS[item.style])
  if (item.sourceType === 'builder') parts.push('表单创作')
  else if (item.sourceType === 'upload') parts.push('文件上传')
  return parts.join(' · ') || 'PC 端创建'
}

function openResume(item) {
  if (exporting.value) return
  const title = resumeTitle(item)
  uni.showModal({
    title: '查看 PDF 样式',
    content: `打开「${title}」的 PDF 预览？`,
    confirmText: '查看',
    cancelText: '取消',
    success(res) {
      if (res.confirm) previewResumePdf(item)
    },
  })
}

async function previewResumePdf(item) {
  if (exporting.value) return
  exporting.value = true
  uni.showLoading({ title: '生成 PDF…', mask: true })
  try {
    const detail = await getResumeHistory(item._id)
    const payload = resumeExportPayload(detail, resumeTitle(detail))
    await exportAndOpenResumePdf(payload)
  } catch (e) {
    uni.showToast({ title: e.message || 'PDF 预览失败', icon: 'none' })
  } finally {
    exporting.value = false
    uni.hideLoading()
  }
}

function copyPcUrl() {
  uni.setClipboardData({
    data: pcResumeUrl.value,
    success: () => uni.showToast({ title: '已复制 PC 端链接', icon: 'success' }),
  })
}

function showPcTip() {
  uni.showModal({
    title: '如何在 PC 端创作',
    content: '1. 在电脑浏览器打开已复制的链接\n2. 使用相同账号登录\n3. 填写信息并 AI 生成简历\n4. 保存后可在小程序查看',
    showCancel: false,
    confirmText: '知道了',
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.hero {
  position: relative;
  padding: 40rpx 32rpx 56rpx;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
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

.pc-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  border: 2rpx solid #eef2ff;
}

.pc-head {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}

.pc-icon {
  font-size: 44rpx;
  flex-shrink: 0;
}

.pc-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.pc-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #909399;
  line-height: 1.5;
}

.pc-url-box {
  margin-top: 24rpx;
  padding: 20rpx;
  background: #f8f9ff;
  border-radius: 14rpx;
}

.pc-url-label {
  display: block;
  font-size: 22rpx;
  color: #909399;
  margin-bottom: 8rpx;
}

.pc-url {
  display: block;
  font-size: 24rpx;
  color: #667eea;
  word-break: break-all;
  line-height: 1.5;
}

.pc-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.pc-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 36rpx;
  font-size: 26rpx;
  font-weight: 500;
}

.pc-btn-ghost {
  background: #f5f7fa;
  color: #606266;
  border: 2rpx solid #ebeef5;
}

.pc-btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.form-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 12rpx;
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
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.form-head-count {
  font-size: 22rpx;
  color: #909399;
}

.state-box {
  padding: 48rpx 0 36rpx;
  text-align: center;
}

.state-emoji {
  display: block;
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.state-text {
  display: block;
  font-size: 28rpx;
  color: #303133;
}

.state-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #909399;
  line-height: 1.5;
  padding: 0 24rpx;
}

.muted {
  color: #909399;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f2f5;
}

.history-item:last-child {
  border-bottom: none;
  padding-bottom: 16rpx;
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

.history-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #667eea;
}

.history-time {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #909399;
}

.history-arrow {
  font-size: 32rpx;
  color: #c0c4cc;
  flex-shrink: 0;
  margin-left: 16rpx;
}
</style>
