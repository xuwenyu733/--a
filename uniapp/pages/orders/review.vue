<template>
  <view class="container">
    <view class="card">
      <text class="section-title">评价交易对方</text>
      <text class="muted">评价对象：{{ targetName }}</text>

      <text class="label">评分 *</text>
      <view class="stars">
        <text
          v-for="n in 5"
          :key="n"
          class="star"
          :class="{ active: n <= rating }"
          @tap="rating = n"
        >★</text>
      </view>

      <text class="label">评价内容</text>
      <textarea class="textarea" v-model="content" placeholder="描述交易体验（可选）" />

      <button type="primary" :loading="submitting" @tap="submit">提交评价</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderReviewSummary, submitOrderReview } from '@/api/review'
import { ensureLogin } from '@/utils/auth'

const orderId = ref('')
const targetName = ref('')
const rating = ref(5)
const content = ref('')
const submitting = ref(false)

onLoad((options) => {
  if (!ensureLogin()) return
  orderId.value = options.orderId
  targetName.value = decodeURIComponent(options.targetName || '对方')
  if (!orderId.value) return
  loadSummary()
})

async function loadSummary() {
  try {
    const summary = await getOrderReviewSummary(orderId.value)
    if (summary.myReview) {
      rating.value = summary.myReview.rating
      content.value = summary.myReview.content || ''
    }
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

async function submit() {
  if (!rating.value) {
    uni.showToast({ title: '请选择评分', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await submitOrderReview(orderId.value, { rating: rating.value, content: content.value.trim() })
    uni.showToast({ title: '评价成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.label { display: block; margin: 24rpx 0 12rpx; font-weight: 500; }
.stars { display: flex; gap: 12rpx; }
.star { font-size: 48rpx; color: #dcdfe6; }
.star.active { color: #f7ba2a; }
.textarea { background: #f5f7fa; border-radius: 12rpx; padding: 20rpx; width: 100%; min-height: 160rpx; box-sizing: border-box; }
button[type='primary'] { margin-top: 32rpx; background: #409eff; }
</style>
