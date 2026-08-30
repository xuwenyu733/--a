<template>
  <view class="grid-2">
    <view v-for="i in count" :key="i" class="grid-2-item">
      <view class="sk-card">
        <view class="sk-cover shimmer" />
        <view class="sk-line shimmer" />
        <view class="sk-line sk-line-short shimmer" />
        <view class="sk-meta">
          <view class="sk-line sk-line-xs shimmer" />
          <view class="sk-line sk-line-xs shimmer" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 6 },
})
</script>

<style scoped>
.grid-2 {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.grid-2-item {
  width: calc(50% - 10rpx);
  margin-bottom: 20rpx;
  box-sizing: border-box;
}

.sk-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.sk-cover {
  width: 100%;
  height: 280rpx;
  background: #eef2f7;
}

.sk-line {
  height: 28rpx;
  margin: 16rpx 16rpx 0;
  border-radius: 8rpx;
  background: #eef2f7;
}

.sk-line-short {
  width: 55%;
  margin-bottom: 16rpx;
}

.sk-meta {
  display: flex;
  justify-content: space-between;
  padding: 0 16rpx 16rpx;
}

.sk-line-xs {
  width: 30%;
  height: 22rpx;
  margin: 0;
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
