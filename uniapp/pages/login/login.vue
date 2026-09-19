<template>
  <view class="page">
    <image class="bg" :src="IMG.bg" mode="aspectFill" />

    <view class="safe-top" :style="{ height: statusBarH + 'px' }" />
    <view class="nav" :style="{ height: navBarH + 'px' }">
      <view class="nav-back" @tap="goBack">
        <text class="nav-back-ico">‹</text>
      </view>
      <text class="nav-title">登录</text>
      <view class="nav-placeholder" />
    </view>

    <view class="brand">
      <image class="brand-cap" :src="IMG.cap" mode="aspectFit" />
      <view class="brand-text">
        <text class="brand-name">校园市集</text>
        <text class="brand-slogan">— 让校园生活更简单 —</text>
      </view>
    </view>

    <view class="card">
      <view class="tabs">
        <view class="tab" :class="{ active: mode === 'wechat' }" @tap="mode = 'wechat'">
          <image class="tab-ico" :src="IMG.wechat" mode="aspectFit" />
          <text class="tab-label">微信一键登录</text>
        </view>
        <view class="tab" :class="{ active: mode === 'phone' }" @tap="mode = 'phone'">
          <image class="tab-ico" :src="IMG.phone" mode="aspectFit" />
          <text class="tab-label">手机号登录</text>
        </view>
      </view>

      <view v-if="mode === 'phone'" class="fields">
        <view class="field">
          <image class="field-ico" :src="IMG.phone" mode="aspectFit" />
          <input
            class="field-input"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-class="ph"
            :value="phone"
            @input="onPhoneInput"
          />
        </view>
        <view class="field">
          <image class="field-ico" :src="IMG.lock" mode="aspectFit" />
          <input
            class="field-input"
            :password="!showPassword"
            placeholder="请输入密码"
            placeholder-class="ph"
            :value="password"
            @input="onPasswordInput"
          />
          <view class="pwd-eye" @tap="togglePassword">
            <image
              class="pwd-eye-img"
              :src="showPassword ? IMG.eye : IMG.eyeOff"
              mode="aspectFit"
            />
          </view>
        </view>
      </view>

      <view v-if="errorTip" class="error-tip">{{ errorTip }}</view>

      <view class="agree-row" @tap="agreed = !agreed">
        <view class="agree-box" :class="{ on: agreed }" />
        <text class="agree-text">
          我已阅读并同意
          <text class="agree-link" @tap.stop="openTerms">《用户协议》</text>
          与
          <text class="agree-link" @tap.stop="openPrivacy">《隐私政策》</text>
        </text>
      </view>

      <button
        v-if="mode === 'wechat'"
        class="cta"
        :loading="wxLoading"
        :disabled="wxLoading"
        @tap="wechatLogin"
      >
        <view class="cta-inner">
          <image class="cta-ico" :src="IMG.wechatWhite" mode="aspectFit" />
          <text class="cta-text">微信一键登录</text>
        </view>
      </button>
      <button
        v-else
        class="cta"
        :loading="loading"
        :disabled="loading"
        @tap="submit"
      >
        <text class="cta-text">登录</text>
      </button>

      <view class="links">
        <text class="link-reg" @tap="goRegister">注册账号 ›</text>
        <text v-if="showDevCodeHint" class="link-hint">开发验证码：123456</text>
      </view>
    </view>

    <view class="footer">
      <view class="footer-line" />
      <text class="footer-text">校园市集 · 连接你我</text>
      <view class="footer-line" />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { login as loginApi, wechatLogin as wechatLoginApi } from '@/api/auth'
import { saveSession } from '@/utils/auth'
import { onSessionReady } from '@/utils/unread'
import { getWxLoginCode } from '@/utils/wechat'
import { openPageSafe } from '@/utils/navigate'

/** 运行时字符串路径，避免被编译进缺失的 /assets/*.hash.png */
const IMG = {
  bg: '/static/login/bg.png',
  cap: '/static/login/cap.png',
  wechat: '/static/login/wechat.png',
  wechatWhite: '/static/login/wechat-white.png',
  phone: '/static/login/phone.png',
  lock: '/static/login/lock.png',
  eye: '/static/icons/eye.png',
  eyeOff: '/static/icons/eye-off.png',
}

const phone = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const wxLoading = ref(false)
const errorTip = ref('')
const agreed = ref(false)
const mode = ref('wechat')
const showDevCodeHint = import.meta.env.DEV
const statusBarH = ref(20)
const navBarH = ref(44)

onLoad(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarH.value = sys.statusBarHeight || 20
    // #ifdef MP-WEIXIN
    const menu = uni.getMenuButtonBoundingClientRect?.()
    if (menu?.height && menu?.top) {
      navBarH.value = (menu.top - statusBarH.value) * 2 + menu.height
    }
    // #endif
  } catch {
    /* ignore */
  }
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function openTerms() {
  uni.navigateTo({ url: '/pages/legal/doc?kind=terms' })
}

function openPrivacy() {
  uni.navigateTo({ url: '/pages/legal/doc?kind=privacy' })
}

function ensureAgreed() {
  if (agreed.value) return true
  showError('请先阅读并同意用户协议与隐私政策')
  return false
}

function onPhoneInput(e) {
  phone.value = e.detail.value
  errorTip.value = ''
}

function onPasswordInput(e) {
  password.value = e.detail.value
  errorTip.value = ''
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

function showError(msg) {
  errorTip.value = msg
  uni.showModal({
    title: '登录失败',
    content: msg,
    showCancel: false,
    confirmText: '知道了',
  })
}

async function wechatLogin() {
  errorTip.value = ''
  if (!ensureAgreed()) return
  wxLoading.value = true
  try {
    const code = await getWxLoginCode()
    try {
      const data = await wechatLoginApi({ code })
      saveSession(data)
      onSessionReady()
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => uni.switchTab({ url: '/pages/user/index' }), 400)
    } catch (e) {
      if (e.code === 40010) {
        uni.setStorageSync('wx_login_code', code)
        await openPageSafe(`/pages/auth/wechat-setup?code=${encodeURIComponent(code)}`, '无法打开完善信息页')
        return
      }
      throw e
    }
  } catch (e) {
    showError(e.message || '微信登录失败')
  } finally {
    wxLoading.value = false
  }
}

async function submit() {
  const p = String(phone.value || '').trim()
  const pwd = String(password.value || '')
  if (!p) {
    showError('请输入手机号')
    return
  }
  if (!/^1\d{10}$/.test(p)) {
    showError('请输入正确的11位手机号')
    return
  }
  if (!pwd) {
    showError('请输入密码')
    return
  }
  if (!ensureAgreed()) return
  loading.value = true
  errorTip.value = ''
  try {
    const data = await loginApi({ phone: p, password: pwd })
    saveSession(data)
    onSessionReady()
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/user/index' }), 400)
  } catch (e) {
    const msg = e?.message || '登录失败'
    if (e?.code === 40102 || /手机号或密码/.test(msg)) {
      showError('手机号或密码错误，请重新输入')
    } else {
      showError(msg)
    }
  } finally {
    loading.value = false
  }
}

function goRegister() {
  openPageSafe('/pages/register/register')
}
</script>

<style lang="scss" scoped>
.page {
  position: relative;
  min-height: 100vh;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow: hidden;
}

.bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.safe-top,
.nav,
.brand,
.card,
.footer {
  position: relative;
  z-index: 1;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  box-sizing: border-box;
}

.nav-back,
.nav-placeholder {
  width: 72rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-ico {
  color: #fff;
  font-size: 56rpx;
  line-height: 1;
  font-weight: 300;
  margin-top: -8rpx;
}

.nav-title {
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 48rpx 56rpx;
  text-align: center;
}

.brand-cap {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 12rpx;
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.brand-name {
  color: #fff;
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  text-shadow: 0 6rpx 16rpx rgba(20, 70, 140, 0.4);
}

.brand-slogan {
  color: rgba(255, 255, 255, 0.95);
  font-size: 24rpx;
  letter-spacing: 2rpx;
}

.card {
  margin: 0 40rpx;
  padding: 40rpx 36rpx 32rpx;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 36rpx;
  box-shadow: 0 20rpx 60rpx rgba(40, 100, 180, 0.16);
}

.tabs {
  display: flex;
  margin-bottom: 36rpx;
  border-bottom: 2rpx solid #eef2f7;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding-bottom: 22rpx;
  position: relative;
}

.tab-ico {
  width: 34rpx;
  height: 34rpx;
}

.tab-label {
  font-size: 28rpx;
  color: #909399;
  font-weight: 500;
}

.tab.active .tab-label {
  color: #3a91f7;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: -2rpx;
  height: 6rpx;
  border-radius: 6rpx;
  background: #3a91f7;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
  margin-bottom: 8rpx;
}

.field {
  position: relative;
  display: flex;
  align-items: center;
  height: 92rpx;
  padding: 0 24rpx;
  background: #f5f8fc;
  border: 2rpx solid #e6edf5;
  border-radius: 20rpx;
  box-sizing: border-box;
}

.field-ico {
  width: 36rpx;
  height: 36rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  opacity: 0.75;
}

.field-input {
  flex: 1;
  height: 92rpx;
  font-size: 28rpx;
  color: #303133;
}

.ph {
  color: #c0c4cc;
}

.pwd-eye {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwd-eye-img {
  width: 36rpx;
  height: 36rpx;
}

.error-tip {
  margin: 16rpx 0 8rpx;
  padding: 16rpx 20rpx;
  color: #cf1322;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 12rpx;
  font-size: 24rpx;
  line-height: 1.4;
}

.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin: 28rpx 4rpx 32rpx;
}

.agree-box {
  width: 32rpx;
  height: 32rpx;
  margin-top: 4rpx;
  border: 2rpx solid #c0c4cc;
  border-radius: 8rpx;
  flex-shrink: 0;
  box-sizing: border-box;
}

.agree-box.on {
  border-color: #3a91f7;
  background: #3a91f7;
  position: relative;
}

.agree-box.on::after {
  content: '';
  position: absolute;
  left: 8rpx;
  top: 2rpx;
  width: 10rpx;
  height: 18rpx;
  border: 2rpx solid #fff;
  border-top: 0;
  border-left: 0;
  transform: rotate(45deg);
}

.agree-text {
  flex: 1;
  font-size: 24rpx;
  color: #606266;
  line-height: 1.55;
}

.agree-link {
  color: #3a91f7;
}

.cta {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  padding: 0;
  border: none;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #5eb0ff 0%, #2b7af0 55%, #1f6ae0 100%);
  box-shadow: 0 14rpx 32rpx rgba(43, 122, 240, 0.38);
  color: #fff;
}

.cta::after {
  border: none;
}

.cta[disabled] {
  opacity: 0.7;
}

.cta-inner {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.cta-ico {
  width: 40rpx;
  height: 40rpx;
}

.cta-text {
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}

.links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 28rpx;
  padding: 0 4rpx;
}

.link-reg {
  color: #3a91f7;
  font-size: 26rpx;
}

.link-hint {
  color: #c0c4cc;
  font-size: 22rpx;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 72rpx;
  padding: 0 48rpx;
}

.footer-line {
  width: 64rpx;
  height: 2rpx;
  background: rgba(144, 160, 180, 0.45);
}

.footer-text {
  color: #a0a8b4;
  font-size: 22rpx;
}
</style>
