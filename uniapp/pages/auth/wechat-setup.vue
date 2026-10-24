<template>
  <view class="container">
    <view class="card">
      <text class="tip">首次微信登录请选择校区</text>
      <picker mode="selector" :range="regionNames" @change="onRegion">
        <view class="picker">校区：{{ regionNames[regionIndex] || '请选择' }}</view>
      </picker>
      <input class="input" v-model="nickname" placeholder="昵称（可选）" />
      <button type="primary" :loading="loading" @tap="submit">完成登录</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getRegions, wechatLogin } from '@/api/auth'
import { saveSession } from '@/utils/auth'
import { onSessionReady } from '@/utils/unread'
import { getWxLoginCode } from '@/utils/wechat'

const regions = ref([])
const regionNames = ref([])
const regionIndex = ref(0)
const nickname = ref('')
const loading = ref(false)

onMounted(async () => {
  // 首次探测登录时 code 已被用掉，此处不再复用；完成登录时重新 uni.login
  uni.removeStorageSync('wx_login_code')
  try {
    regions.value = await getRegions()
    regionNames.value = regions.value.map((r) => r.name)
  } catch {
    uni.showToast({ title: '加载校区失败', icon: 'none' })
  }
})

function onRegion(e) {
  regionIndex.value = Number(e.detail.value)
}

async function submit() {
  const regionId = regions.value[regionIndex.value]?._id
  if (!regionId) {
    uni.showToast({ title: '请选择校区', icon: 'none' })
    return
  }
  loading.value = true
  try {
    // code 只能用一次：完善信息时必须重新获取
    const code = await getWxLoginCode()
    const data = await wechatLogin({
      code,
      regionId,
      nickname: nickname.value,
    })
    saveSession(data)
    onSessionReady()
    if (data?.user?.needsPhoneBind) {
      uni.showToast({ title: '请绑定手机号以同步地址', icon: 'none' })
      setTimeout(() => uni.redirectTo({ url: '/pages/auth/bind-phone' }), 400)
      return
    }
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/user/index' }), 400)
  } catch (e) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.tip { display: block; margin-bottom: 24rpx; color: #606266; }
.picker, .input { margin-bottom: 24rpx; }
button { background: #409eff; }
</style>
