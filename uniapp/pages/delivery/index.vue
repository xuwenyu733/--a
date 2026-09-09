<template>
  <view class="page">
    <!-- 顶部品牌区 -->
    <view class="hero">
      <view class="hero-bg" />
      <view class="hero-body">
        <text class="hero-emoji">🛵</text>
        <view class="hero-text">
          <text class="hero-title">校园跑腿</text>
          <text class="hero-sub">外卖代取 · 快递代取 · 校内互助配送</text>
        </view>
      </view>
    </view>

    <view class="main">
      <!-- 流程步骤 -->
      <view class="steps card">
        <view v-for="(step, i) in steps" :key="step" class="step-item">
          <view class="step-dot">{{ i + 1 }}</view>
          <text class="step-label">{{ step }}</text>
          <text v-if="i < steps.length - 1" class="step-arrow">›</text>
        </view>
      </view>

      <!-- 动态提示 -->
      <view v-if="loading && loggedIn" class="stats-loading card">
        <text class="stats-loading-text">加载订单统计…</text>
      </view>
      <view v-else-if="statsError && loggedIn" class="alert alert-warn" @tap="retryStats">
        <text class="alert-icon">⚠️</text>
        <text class="alert-text">{{ statsError }}</text>
        <text class="alert-link">重试 ›</text>
      </view>
      <view v-else-if="verifyError && loggedIn" class="alert alert-warn" @tap="refresh">
        <text class="alert-icon">⚠️</text>
        <text class="alert-text">{{ verifyError }}</text>
        <text class="alert-link">重试 ›</text>
      </view>
      <template v-else>
      <view v-if="loggedIn && myActiveCount > 0" class="alert alert-info" @tap="goMyActive">
        <text class="alert-icon">📋</text>
        <text class="alert-text">您有 {{ myActiveCount }} 个进行中的跑腿单</text>
        <text class="alert-link">查看 ›</text>
      </view>
      <view v-if="user?.courierVerified && openCount > 0" class="alert alert-success" @tap="goHall">
        <text class="alert-icon">🔔</text>
        <text class="alert-text">当前有 {{ openCount }} 单待接</text>
        <text class="alert-link">去接单 ›</text>
      </view>
      </template>

      <!-- 功能入口 -->
      <view class="section-title">快捷入口</view>
      <view class="action-list">
        <view class="action-card" @tap="goPost">
          <view class="action-icon action-icon-post">📦</view>
          <view class="action-body">
            <text class="action-title">发布需求</text>
            <text class="action-desc">填写取件/送达地址与酬劳</text>
          </view>
          <view class="action-btn action-btn-primary">我要下单</view>
        </view>

        <view class="action-card" @tap="goHall">
          <view class="action-icon action-icon-hall">🛵</view>
          <view class="action-body">
            <text class="action-title">骑手接单</text>
            <text class="action-desc">认证骑手可浏览待接订单</text>
          </view>
          <view class="action-btn action-btn-primary">
            {{ user?.courierVerified ? '进入大厅' : '申请骑手' }}
          </view>
        </view>

        <view class="action-card" @tap="goOrders">
          <view class="action-icon action-icon-order">📋</view>
          <view class="action-body">
            <text class="action-title">我的订单</text>
            <text class="action-desc">查看发布或接取的跑腿单</text>
          </view>
          <view class="action-btn action-btn-ghost">查看订单</view>
        </view>
      </view>

      <!-- 底部引导 -->
      <view v-if="loggedIn && !user?.courierVerified" class="footer-cta card">
        <text class="footer-text">完成骑手认证后可接单赚取酬劳</text>
        <view class="footer-btn" @tap="goCourierVerify">去申请骑手</view>
      </view>
      <view v-else-if="!loggedIn" class="footer-cta card">
        <text class="footer-text">登录后即可发布跑腿需求或申请成为骑手</text>
        <view class="footer-btn" @tap="goLogin">去登录</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getOpenDeliveryOrders, getMyDeliveryOrders } from '@/api/delivery'
import { isLoggedIn, ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify } from '@/utils/verify'
import { openPageSafe } from '@/utils/navigate'

const steps = ['发布需求', '骑手接单', '配送中', '完成']

const loggedIn = ref(false)
const user = ref(null)
const openCount = ref(0)
const myActiveCount = ref(0)
const loading = ref(false)
const statsError = ref('')
const verifyError = ref('')

onShow(refresh)

async function refresh() {
  loggedIn.value = isLoggedIn()
  if (!loggedIn.value) {
    user.value = null
    openCount.value = 0
    myActiveCount.value = 0
    loading.value = false
    statsError.value = ''
    verifyError.value = ''
    return
  }
  loading.value = true
  statsError.value = ''
  verifyError.value = ''
  try {
    const data = await refreshUserAndVerify()
    user.value = data.user
    verifyError.value = data.verifyError || ''
    if (!verifyError.value) {
      await loadCounts()
    }
  } catch (e) {
    statsError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retryStats() {
  if (!loggedIn.value) return
  loading.value = true
  statsError.value = ''
  try {
    await loadCounts()
  } catch (e) {
    statsError.value = e.message || '加载统计失败'
  } finally {
    loading.value = false
  }
}

async function loadCounts() {
  let myFailed = false
  let openFailed = false
  try {
    const res = await getMyDeliveryOrders({ role: 'poster', pageSize: 50 })
    const list = res.list || []
    myActiveCount.value = list.filter((o) => ['open', 'accepted', 'delivering'].includes(o.status)).length
  } catch (e) {
    myFailed = true
    myActiveCount.value = 0
    console.warn('[delivery/index] load my orders failed', e)
  }
  if (user.value?.courierVerified) {
    try {
      const res = await getOpenDeliveryOrders({ pageSize: 1 })
      openCount.value = res.pagination?.acceptableTotal ?? 0
    } catch (e) {
      openFailed = true
      openCount.value = 0
      console.warn('[delivery/index] load open orders failed', e)
    }
  } else {
    openCount.value = 0
  }
  if (myFailed || openFailed) {
    throw new Error('订单统计加载失败，请稍后重试')
  }
}

function goPost() {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/delivery/post' })
}
function goHall() {
  if (!ensureLogin()) return
  if (!user.value?.courierVerified) {
    uni.navigateTo({ url: '/pages/user/verify-courier' })
    return
  }
  uni.navigateTo({ url: '/pages/delivery/hall' })
}
function goOrders() {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/delivery/orders' })
}
function goMyActive() {
  uni.navigateTo({ url: '/pages/delivery/orders?role=poster' })
}
function goCourierVerify() {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/user/verify-courier' })
}
function goLogin() {
  openPageSafe('/pages/login/login')
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 顶部渐变品牌区 */
.hero {
  position: relative;
  padding: 48rpx 32rpx 64rpx;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  border-radius: 0 0 32rpx 32rpx;
}

.hero-body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.hero-emoji {
  font-size: 72rpx;
  line-height: 1;
}

.hero-text {
  flex: 1;
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
}

.hero-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.5;
}

.main {
  margin-top: -32rpx;
  padding: 0 24rpx 48rpx;
  position: relative;
  z-index: 1;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

/* 流程步骤 */
.steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 20rpx;
  margin-bottom: 24rpx;
}

.step-item {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.step-dot {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-label {
  font-size: 22rpx;
  color: #606266;
  margin-left: 8rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-arrow {
  margin: 0 6rpx;
  color: #c0c4cc;
  font-size: 28rpx;
  flex-shrink: 0;
}

/* 提示条 */
.alert {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.alert-info {
  background: #ecf5ff;
  border: 1rpx solid #d9ecff;
}

.alert-success {
  background: #f0f9eb;
  border: 1rpx solid #e1f3d8;
}

.alert-warn {
  background: #fdf6ec;
  border: 1rpx solid #faecd8;
}

.stats-loading {
  padding: 24rpx;
  margin-bottom: 20rpx;
  text-align: center;
}

.stats-loading-text {
  font-size: 26rpx;
  color: #909399;
}

.alert-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.alert-text {
  flex: 1;
  font-size: 26rpx;
  color: #303133;
}

.alert-link {
  font-size: 24rpx;
  color: #409eff;
  font-weight: 500;
  flex-shrink: 0;
}

.alert-success .alert-link {
  color: #67c23a;
}

.alert-warn .alert-link {
  color: #e6a23c;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  margin: 8rpx 0 20rpx 8rpx;
}

/* 功能卡片 */
.action-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.action-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 20rpx;
}

.action-card:active {
  opacity: 0.92;
  transform: scale(0.995);
}

.action-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  flex-shrink: 0;
}

.action-icon-post {
  background: linear-gradient(135deg, #fff7e6, #ffe7ba);
}

.action-icon-hall {
  background: linear-gradient(135deg, #e6f7ff, #bae7ff);
}

.action-icon-order {
  background: linear-gradient(135deg, #f6ffed, #d9f7be);
}

.action-body {
  flex: 1;
  min-width: 0;
  padding-top: 4rpx;
}

.action-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.action-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #909399;
  line-height: 1.4;
}

.action-btn {
  width: 100%;
  margin-top: 4rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 36rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.action-btn-primary {
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  box-shadow: 0 6rpx 16rpx rgba(64, 158, 255, 0.35);
}

.action-btn-ghost {
  background: #f5f7fa;
  color: #606266;
  border: 1rpx solid #ebeef5;
}

/* 底部引导 */
.footer-cta {
  margin-top: 32rpx;
  padding: 32rpx 28rpx;
  text-align: center;
}

.footer-text {
  display: block;
  font-size: 26rpx;
  color: #909399;
  line-height: 1.5;
  margin-bottom: 24rpx;
}

.footer-btn {
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #67c23a, #95de64);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(103, 194, 58, 0.35);
}

.footer-btn:active {
  opacity: 0.9;
}
</style>
