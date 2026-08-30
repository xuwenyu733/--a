<template>
  <view class="notify-sk-list">
    <view v-for="i in count" :key="i" class="card notify-sk">
      <view class="sk-head">
        <view class="sk-tag shimmer" />
        <view class="sk-title shimmer" />
      </view>
      <view class="sk-line shimmer" />
      <view class="sk-line sk-line-short shimmer" />
      <view class="sk-time shimmer" />
    </view>
  </view>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 5 },
})
</script>

<style scoped>
.notify-sk-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.notify-sk {
  padding: 24rpx;
}

.sk-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.sk-tag {
  width: 80rpx;
  height: 28rpx;
  border-radius: 8rpx;
  background: #eef2f7;
  flex-shrink: 0;
}

.sk-title {
  flex: 1;
  height: 28rpx;
  border-radius: 8rpx;
  background: #eef2f7;
}

.sk-line {
  height: 24rpx;
  margin-bottom: 12rpx;
  border-radius: 8rpx;
  background: #eef2f7;
}

.sk-line-short {
  width: 70%;
}

.sk-time {
  width: 140rpx;
  height: 20rpx;
  border-radius: 8rpx;
  background: #eef2f7;
}

@keyframes shimmer {
  0% { opacity: 0.55; }
  50% { opacity: 1; }
  100% { opacity: 0.55; }
}

.shimmer {
  animation: shimmer 1.2s ease-in-out infinite;
}
</style>
