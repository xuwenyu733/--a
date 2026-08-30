<template>
  <view class="page">
    <!-- 顶部用户卡片 -->
    <view class="hero" @tap="onProfileTap">
      <view class="hero-bg" />
      <view class="hero-body">
        <view class="avatar-wrap" @tap.stop="onAvatarTap">
          <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill" />
          <view v-else class="avatar-placeholder">{{ avatarText }}</view>
          <view v-if="loggedIn" class="avatar-edit-badge">📷</view>
        </view>
        <view class="hero-info">
          <text class="nickname">{{ user?.nickname || '未登录' }}</text>
          <text class="subtitle">{{ userSubtitle }}</text>
          <view v-if="loggedIn && badges.length" class="badges">
            <text v-for="b in badges" :key="b.text" class="badge-tag" :class="b.type">{{ b.text }}</text>
          </view>
        </view>
        <text class="hero-arrow">›</text>
      </view>
    </view>

    <view class="main">
      <!-- 好友号 -->
      <view v-if="loggedIn && friendCode" class="friend-code-card">
        <view class="friend-code-row">
          <text class="friend-code-label">我的好友号</text>
          <text class="friend-code-value">{{ friendCode }}</text>
          <text class="friend-code-copy" @tap="copyFriendCode">复制</text>
        </view>
        <text class="friend-code-hint">把好友号发给同学，对方可搜索添加你</text>
      </view>

      <!-- 快捷入口 -->
      <view v-if="loggedIn" class="quick-grid">
        <view class="quick-item" @tap="goPublish">
          <image class="quick-icon-img" :src="mineIcon('publish')" mode="aspectFit" />
          <text class="quick-label">发布</text>
        </view>
        <view class="quick-item" @tap="goOrders">
          <image class="quick-icon-img" :src="mineIcon('orders')" mode="aspectFit" />
          <text class="quick-label">订单</text>
        </view>
        <view class="quick-item" @tap="goFavorites">
          <image class="quick-icon-img" :src="mineIcon('favorites')" mode="aspectFit" />
          <text class="quick-label">收藏</text>
        </view>
        <view class="quick-item" @tap="goNotifications">
          <view class="quick-icon-wrap">
            <image class="quick-icon-img" :src="mineIcon('notifications')" mode="aspectFit" />
            <text v-if="unreadCount" class="quick-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
          </view>
          <text class="quick-label">通知</text>
        </view>
      </view>

      <!-- 服务 -->
      <view class="menu-card">
        <view class="menu-head">
          <text class="menu-head-title">校园服务</text>
        </view>
        <view class="menu-item" @tap="goFriendSearch">
          <image class="menu-icon-img" :src="menuIcon('add-friend')" mode="aspectFit" />
          <text class="menu-label">添加好友</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goDelivery">
          <image class="menu-icon-img" :src="menuIcon('campus-errand')" mode="aspectFit" />
          <text class="menu-label">校园跑腿</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goResume">
          <image class="menu-icon-img" :src="menuIcon('ai-resume')" mode="aspectFit" />
          <text class="menu-label">AI 简历创作</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goNotifications">
          <image class="menu-icon-img" :src="menuIcon('notifications')" mode="aspectFit" />
          <text class="menu-label">通知中心</text>
          <view class="menu-right">
            <text v-if="unreadCount" class="menu-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 交易 -->
      <view v-if="loggedIn" class="menu-card">
        <view class="menu-head">
          <text class="menu-head-title">我的交易</text>
        </view>
        <view class="menu-item" @tap="goMyProducts">
          <image class="menu-icon-img" :src="menuIcon('my-listings')" mode="aspectFit" />
          <text class="menu-label">我的发布</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goOrders">
          <image class="menu-icon-img" :src="menuIcon('orders')" mode="aspectFit" />
          <text class="menu-label">我的订单</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goAddress">
          <image class="menu-icon-img" :src="menuIcon('delivery-address')" mode="aspectFit" />
          <text class="menu-label">收货地址</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goFavorites">
          <image class="menu-icon-img" :src="menuIcon('favorites')" mode="aspectFit" />
          <text class="menu-label">我的收藏</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 认证 -->
      <view v-if="loggedIn" class="menu-card">
        <view class="menu-head">
          <text class="menu-head-title">认证与账号</text>
        </view>
        <view v-if="showStudentVerify" class="menu-item" @tap="goVerifyStudent">
          <text class="menu-icon">🎓</text>
          <text class="menu-label">学生认证</text>
          <view class="menu-right">
            <text v-if="verifyStatus?.student?.status === 'pending'" class="status-tag warning">待审核</text>
            <text v-else-if="verifyStatus?.student?.status === 'rejected'" class="status-tag danger">已拒绝</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>
        <view v-if="showMerchantVerify" class="menu-item" @tap="goVerifyMerchant">
          <image class="menu-icon-img" :src="menuIcon('merchant-onboarding')" mode="aspectFit" />
          <text class="menu-label">商家入驻</text>
          <view class="menu-right">
            <text v-if="verifyStatus?.merchant?.status === 'pending'" class="status-tag warning">待审核</text>
            <text v-else-if="verifyStatus?.merchant?.status === 'rejected'" class="status-tag danger">已拒绝</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>
        <view v-if="showCourierVerify" class="menu-item" @tap="goVerifyCourier">
          <image class="menu-icon-img" :src="menuIcon('campus-errand')" mode="aspectFit" />
          <text class="menu-label">骑手认证</text>
          <view class="menu-right">
            <text v-if="verifyStatus?.courier?.status === 'pending'" class="status-tag warning">待审核</text>
            <text v-else-if="verifyStatus?.courier?.status === 'rejected'" class="status-tag danger">已拒绝</text>
            <text v-else-if="user?.courierVerified" class="status-tag success">已认证</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>
        <view v-if="user?.role === 'merchant'" class="menu-item" @tap="goShopSettings">
          <image class="menu-icon-img" :src="menuIcon('account-settings')" mode="aspectFit" />
          <text class="menu-label">店铺设置</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goSettings">
          <image class="menu-icon-img" :src="menuIcon('account-settings')" mode="aspectFit" />
          <text class="menu-label">账号设置</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view v-if="loggedIn" class="logout-wrap">
        <view class="logout-btn" @tap="logout">退出登录</view>
      </view>
      <view v-else class="login-wrap">
        <view class="login-btn" @tap="goLogin">登录 / 注册</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUser, isLoggedIn, clearSession, ensureLogin, saveSession, getAccessToken, getRefreshToken } from '@/utils/auth'
import { disconnectWs } from '@/utils/ws'
import { refreshUserAndVerify } from '@/utils/verify'
import { notifyUnread, refreshNotifyUnread, clearUnreadBadges } from '@/utils/unread'
import { getFileUrl } from '@/utils/fileUrl'
import { updateProfile } from '@/api/user'
import { uploadProductImage, pickUploadPath } from '@/utils/upload'
import { getMyFriendCode } from '@/api/friend'

const loggedIn = ref(false)
const user = ref(null)
const verifyStatus = ref(null)
const avatarText = ref('?')
const userSubtitle = ref('点击登录')
const friendCode = ref('')
const unreadCount = computed(() => notifyUnread.value)
const avatarUrl = computed(() => getFileUrl(user.value?.avatar))

const showStudentVerify = computed(
  () => user.value?.role === 'student' && !user.value?.studentVerified
)
const showMerchantVerify = computed(
  () => user.value?.role === 'student' && user.value?.studentVerified
)
const showCourierVerify = computed(() => !user.value?.courierVerified)

const badges = computed(() => {
  const list = []
  const u = user.value
  if (!u) return list
  if (u.studentVerified) list.push({ text: '学生认证', type: 'success' })
  if (u.role === 'merchant') list.push({ text: '商家', type: 'warning' })
  if (u.courierVerified) list.push({ text: '骑手', type: 'success' })
  return list
})

onShow(refreshUser)

async function refreshUser() {
  loggedIn.value = isLoggedIn()
  if (loggedIn.value) {
    try {
      const data = await refreshUserAndVerify()
      user.value = data.user
      verifyStatus.value = data.status
      friendCode.value = data.user?.friendCode || ''
      if (!friendCode.value) {
        const codeData = await getMyFriendCode().catch(() => null)
        friendCode.value = codeData?.friendCode || ''
      }
      await refreshNotifyUnread()
    } catch {
      user.value = getUser() || {}
      friendCode.value = user.value?.friendCode || ''
    }
  } else {
    user.value = null
    verifyStatus.value = null
    friendCode.value = ''
    clearUnreadBadges()
  }
  avatarText.value = (user.value?.nickname || '?')[0]
  userSubtitle.value = buildSubtitle(user.value, verifyStatus.value)
}

function copyFriendCode() {
  if (!friendCode.value) return
  uni.setClipboardData({
    data: friendCode.value,
    success: () => uni.showToast({ title: '已复制好友号', icon: 'success' }),
  })
}

function buildSubtitle(u, vs) {
  if (!u) return '点击登录，开启校园生活'
  if (u.role === 'merchant') return '商家账号 · 可发布店铺商品'
  if (u.studentVerified && u.courierVerified) return '已认证学生 · 已认证骑手'
  if (u.studentVerified) return '已认证学生 · 可发布与购买'
  if (vs?.student?.status === 'pending') return '学生认证审核中…'
  if (vs?.merchant?.status === 'pending') return '商家入驻审核中…'
  if (vs?.courier?.status === 'pending') return '骑手认证审核中…'
  return '完成认证，解锁更多功能'
}

function mineIcon(name) {
  return `/static/mine/${name}.png`
}

function menuIcon(name) {
  return `/static/mine/menu/${name}.png`
}

function onProfileTap() {
  if (!loggedIn.value) goLogin()
  else if (user.value?._id) uni.navigateTo({ url: `/pages/user/profile?id=${user.value._id}` })
}

function onAvatarTap() {
  if (!loggedIn.value) {
    goLogin()
    return
  }
  const hasAvatar = !!avatarUrl.value
  const itemList = hasAvatar ? ['更改头像', '保存头像'] : ['更改头像']
  uni.showActionSheet({
    itemList,
    success(res) {
      if (res.tapIndex === 0) changeAvatar()
      else if (hasAvatar && res.tapIndex === 1) saveAvatar()
    },
  })
}

function changeAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      try {
        uni.showLoading({ title: '上传中…', mask: true })
        const data = await uploadProductImage(res.tempFilePaths[0])
        const path = pickUploadPath(data)
        if (!path) throw new Error('上传失败')
        const updated = await updateProfile({ avatar: path })
        saveSession({
          user: updated,
          accessToken: getAccessToken(),
          refreshToken: getRefreshToken(),
        })
        user.value = updated
        uni.showToast({ title: '头像已更新', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

function saveAvatar() {
  const url = avatarUrl.value
  if (!url) {
    uni.showToast({ title: '暂无头像可保存', icon: 'none' })
    return
  }
  uni.showLoading({ title: '保存中…', mask: true })
  uni.downloadFile({
    url,
    success(dl) {
      if (dl.statusCode !== 200 || !dl.tempFilePath) {
        uni.hideLoading()
        uni.showToast({ title: '下载头像失败', icon: 'none' })
        return
      }
      uni.saveImageToPhotosAlbum({
        filePath: dl.tempFilePath,
        success() {
          uni.hideLoading()
          uni.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail(err) {
          uni.hideLoading()
          const msg = err?.errMsg || ''
          if (/auth deny|authorize|permission/i.test(msg)) {
            uni.showModal({
              title: '需要相册权限',
              content: '请在设置中允许保存到相册后重试',
              confirmText: '去设置',
              success(r) {
                if (r.confirm) uni.openSetting({})
              },
            })
          } else {
            uni.showToast({ title: '保存失败', icon: 'none' })
          }
        },
      })
    },
    fail() {
      uni.hideLoading()
      uni.showToast({ title: '下载头像失败', icon: 'none' })
    },
  })
}
function goLogin() { uni.navigateTo({ url: '/pages/login/login' }) }
function goFriendSearch() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/friend-search' }) }
function goPublish() { if (ensureLogin()) uni.navigateTo({ url: '/pages/products/publish' }) }
function goMyProducts() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/my-products' }) }
function goOrders() { if (ensureLogin()) uni.navigateTo({ url: '/pages/orders/index' }) }
function goFavorites() { if (ensureLogin()) uni.navigateTo({ url: '/pages/favorites/index' }) }
function goAddress() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/address' }) }
function goNotifications() { if (ensureLogin()) uni.navigateTo({ url: '/pages/notifications/index' }) }
function goDelivery() { if (ensureLogin()) uni.navigateTo({ url: '/pages/delivery/index' }) }
function goResume() { if (ensureLogin()) uni.navigateTo({ url: '/pages/resume/build' }) }
function goVerifyStudent() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/verify-student' }) }
function goVerifyMerchant() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/verify-merchant' }) }
function goVerifyCourier() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/verify-courier' }) }
function goShopSettings() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/shop-settings' }) }
function goSettings() { if (ensureLogin()) uni.navigateTo({ url: '/pages/user/settings' }) }

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出？',
    success(res) {
      if (!res.confirm) return
      clearSession()
      disconnectWs()
      clearUnreadBadges()
      refreshUser()
      uni.showToast({ title: '已退出', icon: 'none' })
    },
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 48rpx;
}

/* 顶部用户区 */
.hero {
  position: relative;
  padding: 48rpx 32rpx 56rpx;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
  border-radius: 0 0 40rpx 40rpx;
}

.hero-body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar-edit-badge {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.avatar-img,
.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.avatar-placeholder {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 700;
}

.avatar-img {
  background: #eef2f7;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.nickname {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}

.badge-tag {
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.badge-tag.success { background: rgba(103, 194, 58, 0.5); }
.badge-tag.warning { background: rgba(230, 162, 60, 0.5); }

.hero-arrow {
  font-size: 40rpx;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.main {
  margin-top: -28rpx;
  padding: 0 24rpx;
  position: relative;
  z-index: 1;
}

.friend-code-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.friend-code-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.friend-code-label {
  font-size: 26rpx;
  color: #606266;
}

.friend-code-value {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #303133;
}

.friend-code-copy {
  font-size: 24rpx;
  color: #409eff;
  padding: 8rpx 12rpx;
}

.friend-code-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #909399;
}

/* 快捷入口 */
.quick-grid {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx 12rpx 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.quick-item:active {
  opacity: 0.7;
}

.quick-icon-wrap {
  position: relative;
}

.quick-icon-img {
  width: 112rpx;
  height: 112rpx;
  display: block;
}

.quick-badge {
  position: absolute;
  top: -6rpx;
  right: -14rpx;
  background: #f56c6c;
  color: #fff;
  font-size: 18rpx;
  min-width: 28rpx;
  height: 28rpx;
  line-height: 28rpx;
  text-align: center;
  border-radius: 14rpx;
  padding: 0 6rpx;
  z-index: 1;
}

.quick-label {
  font-size: 24rpx;
  color: #606266;
}

/* 菜单卡片 */
.menu-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 8rpx 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.menu-head {
  padding: 20rpx 0 8rpx;
  border-bottom: 1rpx solid #f5f7fa;
  margin-bottom: 4rpx;
}

.menu-head-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #909399;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f5f7fa;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  opacity: 0.7;
}

.menu-icon {
  font-size: 36rpx;
  width: 48rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
  text-align: center;
}

.menu-icon-img {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.menu-label {
  flex: 1;
  font-size: 30rpx;
  color: #303133;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.menu-badge {
  background: #f56c6c;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  min-width: 32rpx;
  text-align: center;
}

.menu-arrow {
  color: #c0c4cc;
  font-size: 36rpx;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  white-space: nowrap;
}

.status-tag.warning { background: #fdf6ec; color: #e6a23c; }
.status-tag.danger { background: #fef0f0; color: #f56c6c; }
.status-tag.success { background: #f0f9eb; color: #67c23a; }

/* 底部按钮 */
.logout-wrap,
.login-wrap {
  margin-top: 16rpx;
  padding: 0 8rpx;
}

.logout-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #fff;
  color: #f56c6c;
  font-size: 30rpx;
  border-radius: 44rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.login-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: linear-gradient(135deg, #409eff, #667eea);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.35);
}

.logout-btn:active,
.login-btn:active {
  opacity: 0.85;
}
</style>
