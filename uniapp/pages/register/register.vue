<template>
  <view class="container">
    <view class="card form">
      <input class="input" type="number" maxlength="11" placeholder="手机号" v-model="phone" />
      <input class="input" placeholder="昵称（可选）" v-model="nickname" />
      <input class="input" password placeholder="密码（需含字母和数字，至少6位）" v-model="password" />
      <view class="code-row">
        <input class="input code-input" type="number" maxlength="6" placeholder="验证码" v-model="code" />
        <button class="code-btn" :class="{ counting: countdown > 0 }" :disabled="countdown > 0 || !phoneValid" size="mini" @tap="sendVerifyCode">
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </view>
      <picker mode="selector" :range="regionNames" @change="onRegion">
        <view class="picker">校区：{{ regionNames[regionIndex] || '请选择' }}</view>
      </picker>
      <button class="btn-primary btn-block" :loading="loading" @tap="submit">注册</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { register as registerApi, getRegions, sendCode as sendCodeApi } from '@/api/auth'
import { saveSession } from '@/utils/auth'
import { onSessionReady } from '@/utils/unread'

const phone = ref('')
const password = ref('')
const code = ref('')
const nickname = ref('')
const regions = ref([])
const regionNames = ref([])
const regionIndex = ref(0)
const loading = ref(false)
const countdown = ref(0)
let countdownTimer = null

const phoneValid = computed(() => /^1\d{10}$/.test(phone.value))

onMounted(async () => {
  try {
    regions.value = await getRegions()
    regionNames.value = regions.value.map((r) => r.name)
  } catch {
    uni.showToast({ title: '加载校区失败', icon: 'none' })
  }
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

async function sendVerifyCode() {
  if (!phoneValid.value) {
    uni.showToast({ title: '请先填写正确的手机号', icon: 'none' })
    return
  }
  if (countdown.value > 0) return
  try {
    await sendCodeApi(phone.value)
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  }
}

function onRegion(e) {
  regionIndex.value = Number(e.detail.value)
}

async function submit() {
  if (!phone.value || !/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请填写正确的11位手机号', icon: 'none' })
    return
  }
  if (!password.value || password.value.length < 6 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password.value)) {
    uni.showToast({ title: '密码至少6位且需含字母和数字', icon: 'none' })
    return
  }
  if (!code.value) {
    uni.showToast({ title: '请填写验证码', icon: 'none' })
    return
  }
  const regionId = regions.value[regionIndex.value]?._id
  if (!regionId) {
    uni.showToast({ title: '请选择校区', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const data = await registerApi({
      phone: phone.value,
      password: password.value,
      code: code.value,
      regionId,
      nickname: nickname.value,
    })
    saveSession(data)
    onSessionReady()
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/user/index' }), 400)
  } catch (e) {
    uni.showToast({ title: e.message || '注册失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.input, .picker { margin-bottom: 24rpx; }
.picker { color: #606266; }
.btn-primary { background: #409eff; color: #fff; width: 100%; }
.code-row { display: flex; gap: 16rpx; align-items: flex-start; margin-bottom: 24rpx; }
.code-input { flex: 1; margin-bottom: 0; }
.code-btn {
  flex-shrink: 0;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  background: #409eff;
  color: #fff;
  border-radius: 12rpx;
}
.code-btn.counting {
  background: #c0c4cc;
  color: #fff;
}
</style>
