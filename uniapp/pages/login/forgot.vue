<template>
  <view class="container">
    <view class="card form">
      <view class="tip">通过手机验证码重置密码后，可用新密码登录</view>
      <input
        class="input"
        type="number"
        maxlength="11"
        placeholder="手机号"
        :value="phone"
        @input="onPhoneInput"
      />
      <view class="code-row">
        <input
          class="input code-input"
          type="number"
          maxlength="6"
          placeholder="验证码"
          :value="code"
          @input="onCodeInput"
        />
        <button
          class="code-btn"
          :class="{ counting: countdown > 0 }"
          :disabled="countdown > 0 || sending || !phoneValid"
          size="mini"
          @tap="sendVerifyCode"
        >
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </view>
      <view class="pwd-wrap">
        <input
          class="input pwd-input"
          :password="!showPassword"
          placeholder="新密码（需含字母和数字，至少6位）"
          :value="password"
          @input="onPasswordInput"
        />
        <view class="pwd-eye" @tap="showPassword = !showPassword">
          <image
            class="pwd-eye-img"
            :src="showPassword ? '/static/icons/eye.png' : '/static/icons/eye-off.png'"
            mode="aspectFit"
          />
        </view>
      </view>
      <view class="pwd-wrap">
        <input
          class="input pwd-input"
          :password="!showConfirm"
          placeholder="确认新密码"
          :value="confirmPassword"
          @input="onConfirmInput"
        />
        <view class="pwd-eye" @tap="showConfirm = !showConfirm">
          <image
            class="pwd-eye-img"
            :src="showConfirm ? '/static/icons/eye.png' : '/static/icons/eye-off.png'"
            mode="aspectFit"
          />
        </view>
      </view>
      <button class="btn-primary btn-block" :loading="loading" @tap="submit">重置密码</button>
      <view class="back" @tap="goLogin">返回登录</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { sendCode as sendCodeApi, resetPassword as resetPasswordApi } from '@/api/auth'

const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let countdownTimer = null

const phoneValid = computed(() => /^1\d{10}$/.test(String(phone.value || '').trim()))

onLoad((query) => {
  const p = String(query?.phone || '').trim()
  if (/^1\d{10}$/.test(p)) phone.value = p
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

function onPhoneInput(e) {
  phone.value = e.detail.value
}

function onCodeInput(e) {
  code.value = e.detail.value
}

function onPasswordInput(e) {
  password.value = e.detail.value
}

function onConfirmInput(e) {
  confirmPassword.value = e.detail.value
}

function startCountdown(seconds) {
  countdown.value = seconds
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function sendVerifyCode() {
  if (!phoneValid.value) {
    uni.showToast({ title: '请先填写正确的手机号', icon: 'none' })
    return
  }
  if (countdown.value > 0 || sending.value) return
  sending.value = true
  try {
    await sendCodeApi(String(phone.value).trim(), 'reset')
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    startCountdown(60)
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

async function submit() {
  const p = String(phone.value || '').trim()
  const c = String(code.value || '').trim()
  const pwd = String(password.value || '')
  const confirm = String(confirmPassword.value || '')
  if (!/^1\d{10}$/.test(p)) {
    uni.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
    return
  }
  if (!c) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  if (pwd.length < 6 || !/[a-zA-Z]/.test(pwd) || !/\d/.test(pwd)) {
    uni.showToast({ title: '新密码需含字母和数字，至少6位', icon: 'none' })
    return
  }
  if (pwd !== confirm) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await resetPasswordApi({ phone: p, code: c, newPassword: pwd })
    uni.showToast({ title: '重置成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/login/login` })
    }, 500)
  } catch (e) {
    uni.showToast({ title: e.message || '重置失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goLogin() {
  uni.navigateBack({
    fail: () => uni.redirectTo({ url: '/pages/login/login' }),
  })
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  padding: 40rpx 32rpx;
  box-sizing: border-box;
  background: #f5f7fa;
}
.card.form {
  padding: 36rpx 28rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 35, 80, 0.06);
}
.tip {
  margin-bottom: 28rpx;
  font-size: 26rpx;
  color: #909399;
  line-height: 1.5;
}
.input {
  height: 88rpx;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
  background: #f5f8fc;
  border: 2rpx solid #e6edf5;
  border-radius: 16rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.code-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
  align-items: center;
}
.code-input {
  flex: 1;
  margin-bottom: 0;
}
.code-btn {
  flex-shrink: 0;
  margin: 0;
  padding: 0 20rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #2f7ff0;
  color: #fff;
  font-size: 24rpx;
  border-radius: 12rpx;
}
.code-btn.counting,
.code-btn[disabled] {
  opacity: 0.55;
}
.pwd-wrap {
  position: relative;
  margin-bottom: 20rpx;
}
.pwd-input {
  width: 100%;
  margin-bottom: 0;
  padding-right: 80rpx;
}
.pwd-eye {
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  padding: 12rpx;
}
.pwd-eye-img {
  width: 36rpx;
  height: 36rpx;
  opacity: 0.65;
}
.btn-primary.btn-block {
  margin-top: 12rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #5eb0ff 0%, #2b7af0 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
}
.btn-primary.btn-block::after {
  border: none;
}
.back {
  margin-top: 28rpx;
  text-align: center;
  color: #3a91f7;
  font-size: 26rpx;
}
</style>
