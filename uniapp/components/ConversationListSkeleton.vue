<template>
  <view class="conv-sk-list">
    <view v-for="i in count" :key="i" class="card conv-sk">
      <view class="avatar shimmer" />
      <view class="body">
        <view class="row">
          <view class="sk-line sk-name shimmer" />
          <view class="sk-line sk-time shimmer" />
        </view>
        <view class="sk-line sk-preview shimmer" />
        <view class="sk-line sk-product shimmer" />
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 5 },
})
</script>

<style scoped>
.conv-sk-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.conv-sk {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #eef2f7;
  flex-shrink: 0;
}

.body {
  flex: 1;
  min-width: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
}

.sk-line {
  height: 24rpx;
  border-radius: 8rpx;
  background: #eef2f7;
}

.sk-name {
  width: 140rpx;
  height: 28rpx;
}

.sk-time {
  width: 100rpx;
}

.sk-preview {
  margin-top: 12rpx;
  width: 85%;
}

.sk-product {
  margin-top: 10rpx;
  width: 55%;
  height: 20rpx;
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
