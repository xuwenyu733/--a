<template>
  <view class="container login-page">
    <text class="logo">🎓 校园市集</text>

    <button class="wx-btn" :loading="wxLoading" @tap="wechatLogin">
      微信一键登录
    </button>

    <view class="divider"><text class="muted">或使用手机号</text></view>

    <view class="card form">
      <input
        class="input"
        type="number"
        maxlength="11"
        placeholder="手机号"
        :value="phone"
        @input="onPhoneInput"
      />
      <view class="pwd-wrap">
        <input
          class="input pwd-input"
          :password="!showPassword"
          placeholder="密码"
          :value="password"
          @input="onPasswordInput"
        />
        <view class="pwd-eye" @tap="togglePassword">
          <image
            class="pwd-eye-img"
            :src="showPassword ? '/static/icons/eye.png' : '/static/icons/eye-off.png'"
            mode="aspectFit"
          />
        </view>
      </view>
      <view v-if="errorTip" class="error-tip">{{ errorTip }}</view>
      <button class="btn-primary btn-block" :loading="loading" :disabled="loading" @tap="submit">登录</button>
      <view class="links">
        <text @tap="goRegister">注册账号</text>
        <text class="muted">开发验证码：123456</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { login as loginApi, wechatLogin as wechatLoginApi } from '@/api/auth'
import { saveSession } from '@/utils/auth'
import { onSessionReady } from '@/utils/unread'
import { getWxLoginCode } from '@/utils/wechat'
import { openPageSafe } from '@/utils/navigate'

const phone = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const wxLoading = ref(false)
const errorTip = ref('')

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
  // 小程序 toast 在 button loading 时经常不显示，弹窗更稳
  uni.showModal({
    title: '登录失败',
    content: msg,
    showCancel: false,
    confirmText: '知道了',
  })
}

async function wechatLogin() {
  errorTip.value = ''
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
.login-page { padding-top: calc(60rpx + env(safe-area-inset-top)); padding-bottom: env(safe-area-inset-bottom); }
.logo { display: block; text-align: center; font-size: 48rpx; font-weight: 700; margin-bottom: 40rpx; }
.wx-btn {
  background: #07c160; color: #fff; border-radius: 12rpx; margin-bottom: 32rpx;
}
.divider { text-align: center; margin: 24rpx 0; font-size: 24rpx; }
.form .input { margin-bottom: 24rpx; }
.pwd-wrap {
  position: relative;
  margin-bottom: 24rpx;
}
.pwd-wrap .pwd-input {
  margin-bottom: 0;
  padding-right: 88rpx;
  box-sizing: border-box;
  background: #fff;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
}
.pwd-wrap .pwd-input:focus {
  border-color: #409eff;
}
.pwd-eye {
  position: absolute;
  right: 8rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.pwd-eye:active {
  opacity: 0.65;
}
.pwd-eye-img {
  width: 40rpx;
  height: 40rpx;
}
.error-tip {
  margin: 0 0 24rpx;
  padding: 16rpx 20rpx;
  color: #cf1322;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8rpx;
  font-size: 26rpx;
  line-height: 1.4;
}
.btn-primary { background: #409eff; color: #fff; }
.btn-block { width: 100%; }
.links { display: flex; justify-content: space-between; margin-top: 24rpx; font-size: 24rpx; color: #409eff; }
</style>
