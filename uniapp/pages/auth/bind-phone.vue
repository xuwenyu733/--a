<template>
  <view class="container">
    <view class="card">
      <text class="title">绑定手机号</text>
      <text class="tip muted">
        微信登录与手机号登录目前是两套账号。绑定后地址、订单会合并到该手机号，换登录方式也不会丢。
      </text>
      <text class="label">手机号</text>
      <input class="input" type="number" maxlength="11" v-model="phone" placeholder="请输入手机号" />
      <text class="label">验证码</text>
      <view class="row">
        <input class="input flex" type="number" maxlength="6" v-model="code" placeholder="短信验证码" />
        <button class="code-btn" size="mini" :disabled="countdown > 0 || sending" @tap="send">
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </view>
      <button type="primary" :loading="saving" @tap="submit">确认绑定</button>
      <button @tap="skip">暂不绑定</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { sendCode, bindPhone } from '@/api/auth'
import { saveSession } from '@/utils/auth'
import { onSessionReady } from '@/utils/unread'

const phone = ref('')
const code = ref('')
const sending = ref(false)
const saving = ref(false)
const countdown = ref(0)
let timer = null

onUnload(() => {
  if (timer) clearInterval(timer)
})

async function send() {
  const p = String(phone.value || '').trim()
  if (!/^1\d{10}$/.test(p)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  if (countdown.value > 0 || sending.value) return
  sending.value = true
  try {
    await sendCode(p, 'bind')
    uni.showToast({ title: '验证码已发送', icon: 'none' })
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

async function submit() {
  const p = String(phone.value || '').trim()
  const c = String(code.value || '').trim()
  if (!/^1\d{10}$/.test(p)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  if (!c) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const data = await bindPhone({ phone: p, code: c })
    saveSession(data)
    onSessionReady()
    uni.showToast({
      title: data.merged ? '已合并账号' : '绑定成功',
      icon: 'success',
    })
    setTimeout(() => uni.switchTab({ url: '/pages/user/index' }), 500)
  } catch (e) {
    uni.showToast({ title: e.message || '绑定失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function skip() {
  uni.switchTab({ url: '/pages/user/index' })
}
</script>

<style lang="scss" scoped>
.container { padding: 32rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.title { display: block; font-size: 36rpx; font-weight: 700; margin-bottom: 16rpx; }
.tip { display: block; font-size: 24rpx; line-height: 1.5; margin-bottom: 28rpx; }
.label { display: block; margin: 16rpx 0 8rpx; font-size: 26rpx; }
.input {
  height: 80rpx;
  padding: 0 20rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  margin-bottom: 8rpx;
}
.row { display: flex; gap: 16rpx; align-items: center; margin-bottom: 8rpx; }
.flex { flex: 1; }
.code-btn { flex-shrink: 0; }
.muted { color: #909399; }
button { margin-top: 20rpx; }
</style>
