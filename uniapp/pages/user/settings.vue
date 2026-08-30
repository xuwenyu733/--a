<template>
  <view class="page page-with-footer">
    <view v-if="loadError" class="error-banner" @tap="loadProfile">
      <text class="error-text">{{ loadError }}</text>
      <text class="retry-link">重试</text>
    </view>
    <view v-if="loading" class="sync-hint">
      <text>同步资料中…</text>
    </view>

    <!-- 基本信息 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">基本信息</text>
      </view>

      <view class="avatar-row" @tap="chooseAvatar">
        <view class="avatar-wrap">
          <image v-if="avatarPreview" class="avatar-img" :src="avatarPreview" mode="aspectFill" />
          <view v-else class="avatar-placeholder">{{ avatarLetter }}</view>
          <view class="avatar-badge">📷</view>
        </view>
        <view class="avatar-meta">
          <text class="avatar-title">点击更换头像</text>
          <text class="avatar-desc">支持 JPG/PNG，建议正方形</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">昵称</text>
        <input class="field-input" v-model="form.nickname" placeholder="展示给其他用户" />
      </view>

      <view class="field" v-if="friendCode">
        <text class="field-label">我的好友号</text>
        <view class="friend-code-row">
          <text class="friend-code">{{ friendCode }}</text>
          <text class="friend-code-copy" @tap="copyFriendCode">复制</text>
        </view>
        <text class="field-hint">同学可通过好友号搜索添加你</text>
      </view>

      <view class="field">
        <text class="field-label">个人简介</text>
        <textarea
          class="field-textarea"
          v-model="form.bio"
          placeholder="选填，简单介绍一下自己"
          maxlength="120"
          :show-confirm-bar="false"
        />
        <text class="field-counter">{{ (form.bio || '').length }}/120</text>
      </view>
    </view>

    <!-- 通知 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">通知设置</text>
      </view>

      <view class="field">
        <text class="field-label">通知邮箱</text>
        <input
          class="field-input"
          v-model="form.email"
          type="text"
          placeholder="选填，离线时接收邮件通知"
        />
      </view>
      <view class="tip-box">
        <text class="tip-icon">💡</text>
        <text class="tip-text">配置 SMTP 后，不在线时可收到订单/消息邮件提醒</text>
      </view>
    </view>

    <!-- 收款码 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">收款码</text>
        <text class="card-sub">买家面交时可扫码付款</text>
      </view>

      <view v-if="qrPreview" class="qr-preview">
        <image class="qr-img" :src="qrPreview" mode="aspectFit" />
        <view class="qr-actions">
          <view class="qr-btn" @tap="chooseQr">更换</view>
          <view class="qr-btn danger" @tap="removeQr">删除</view>
        </view>
      </view>
      <view v-else class="qr-upload" @tap="chooseQr">
        <text class="qr-upload-icon">+</text>
        <text class="qr-upload-text">上传收款码</text>
        <text class="qr-upload-hint">微信 / 支付宝收款码图片</text>
      </view>
    </view>

    <!-- 底部保存 -->
    <view class="footer-bar">
      <button class="save-btn" type="primary" :loading="saving" @tap="save">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMe } from '@/api/auth'
import { updateProfile } from '@/api/user'
import { uploadProductImage, pickUploadPath } from '@/utils/upload'
import { getFileUrl } from '@/utils/fileUrl'
import { profileFromUser, profileToUpdatePayload } from '@/utils/profileForm'
import { ensureLogin, getUser, saveSession, getAccessToken, getRefreshToken } from '@/utils/auth'

const saving = ref(false)
const loading = ref(false)
const loadError = ref('')
const uploadingAvatar = ref(false)
const form = ref({ nickname: '', bio: '', email: '', paymentQrUrl: '', avatar: '' })
const qrPreview = ref('')
const avatarPreview = ref('')
const friendCode = ref('')

const avatarLetter = computed(() => (form.value.nickname || '?')[0])

function applyUserToForm(user) {
  form.value = profileFromUser(user)
  friendCode.value = user?.friendCode || ''
  qrPreview.value = form.value.paymentQrUrl ? getFileUrl(form.value.paymentQrUrl) : ''
  avatarPreview.value = form.value.avatar ? getFileUrl(form.value.avatar) : ''
}

function copyFriendCode() {
  if (!friendCode.value) return
  uni.setClipboardData({
    data: friendCode.value,
    success: () => uni.showToast({ title: '已复制好友号', icon: 'success' }),
  })
}

onShow(loadProfile)

async function loadProfile() {
  if (!ensureLogin()) return
  loadError.value = ''
  applyUserToForm(getUser())
  loading.value = true
  try {
    const data = await getMe()
    if (data?.user) {
      saveSession({
        user: data.user,
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      })
      applyUserToForm(data.user)
    }
  } catch (e) {
    loadError.value = e.message || '加载资料失败'
    console.warn('[settings] getMe failed', e)
  } finally {
    loading.value = false
  }
}

function chooseAvatar() {
  if (uploadingAvatar.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uploadingAvatar.value = true
      try {
        const data = await uploadProductImage(res.tempFilePaths[0])
        const path = pickUploadPath(data)
        if (!path) throw new Error('上传失败')
        form.value.avatar = path
        avatarPreview.value = getFileUrl(path)
        uni.showToast({ title: '头像已更新，请保存', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
      } finally {
        uploadingAvatar.value = false
      }
    },
  })
}

function chooseQr() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      try {
        const data = await uploadProductImage(res.tempFilePaths[0])
        const path = pickUploadPath(data)
        form.value.paymentQrUrl = path
        qrPreview.value = getFileUrl(path)
        uni.showToast({ title: '已上传，请保存', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
      }
    },
  })
}

function removeQr() {
  uni.showModal({
    title: '删除收款码',
    content: '确定要删除当前收款码吗？',
    success: (res) => {
      if (res.confirm) {
        form.value.paymentQrUrl = ''
        qrPreview.value = ''
      }
    },
  })
}

async function save() {
  const payload = profileToUpdatePayload(form.value)
  if (!payload.nickname) {
    uni.showToast({ title: '请填写昵称', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const user = await updateProfile(payload)
    saveSession({ user, accessToken: getAccessToken(), refreshToken: getRefreshToken() })
    applyUserToForm(user)
    loadError.value = ''
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  box-sizing: border-box;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
  background: #fef0f0;
  border: 1rpx solid #fde2e2;
  border-radius: 16rpx;
}

.error-text {
  flex: 1;
  font-size: 26rpx;
  color: #f56c6c;
  line-height: 1.4;
}

.retry-link {
  font-size: 26rpx;
  color: #409eff;
  flex-shrink: 0;
}

.sync-hint {
  margin-bottom: 16rpx;
  text-align: center;
  font-size: 24rpx;
  color: #909399;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.card-head {
  margin-bottom: 28rpx;
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.card-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #909399;
}

/* 头像 */
.avatar-row {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding-bottom: 32rpx;
  margin-bottom: 8rpx;
  border-bottom: 1rpx solid #f5f7fa;
}

.avatar-row:active {
  opacity: 0.85;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar-img,
.avatar-placeholder {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  border: 4rpx solid #ecf5ff;
  box-shadow: 0 4rpx 16rpx rgba(64, 158, 255, 0.15);
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #409eff, #667eea);
  color: #fff;
  font-size: 48rpx;
  font-weight: 600;
}

.avatar-img {
  background: #eef2f7;
}

.avatar-badge {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.avatar-meta {
  flex: 1;
  min-width: 0;
}

.avatar-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #303133;
}

.avatar-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #909399;
  line-height: 1.4;
}

/* 表单字段 */
.field {
  margin-top: 28rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #606266;
}

.field-input {
  display: block;
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: #f9fafb;
  border: 1rpx solid #ebeef5;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #303133;
  box-sizing: border-box;
}

.friend-code-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 88rpx;
  padding: 0 24rpx;
  background: #f9fafb;
  border: 1rpx solid #ebeef5;
  border-radius: 16rpx;
  box-sizing: border-box;
}

.friend-code {
  flex: 1;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #303133;
}

.friend-code-copy {
  font-size: 26rpx;
  color: #409eff;
}

.field-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #909399;
}

.field-textarea {
  display: block;
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  background: #f9fafb;
  border: 1rpx solid #ebeef5;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #303133;
  line-height: 1.5;
  box-sizing: border-box;
}

.field-counter {
  display: block;
  margin-top: 8rpx;
  text-align: right;
  font-size: 22rpx;
  color: #c0c4cc;
}

/* 提示框 */
.tip-box {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #f4f8ff;
  border-radius: 12rpx;
}

.tip-icon {
  font-size: 28rpx;
  line-height: 1.4;
  flex-shrink: 0;
}

.tip-text {
  flex: 1;
  font-size: 24rpx;
  color: #606266;
  line-height: 1.5;
}

/* 收款码 */
.qr-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
  background: #f9fafb;
  border: 1rpx solid #ebeef5;
  border-radius: 16rpx;
}

.qr-img {
  width: 280rpx;
  height: 280rpx;
  border-radius: 12rpx;
  background: #fff;
}

.qr-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
}

.qr-btn {
  padding: 12rpx 40rpx;
  font-size: 26rpx;
  color: #409eff;
  background: #ecf5ff;
  border-radius: 999rpx;
}

.qr-btn:active {
  opacity: 0.8;
}

.qr-btn.danger {
  color: #f56c6c;
  background: #fef0f0;
}

.qr-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  background: #f9fafb;
  border: 2rpx dashed #dcdfe6;
  border-radius: 16rpx;
}

.qr-upload:active {
  background: #f0f2f5;
}

.qr-upload-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 68rpx;
  text-align: center;
  font-size: 48rpx;
  color: #909399;
  background: #fff;
  border: 1rpx solid #ebeef5;
  border-radius: 50%;
}

.qr-upload-text {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #409eff;
  font-weight: 500;
}

.qr-upload-hint {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #909399;
}

/* 底部保存 */
.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #409eff, #667eea);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.3);
}

.save-btn::after {
  border: none;
}
</style>
