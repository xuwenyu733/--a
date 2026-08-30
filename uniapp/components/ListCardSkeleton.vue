<template>
  <view class="list-sk">
    <view v-for="i in count" :key="i" class="card sk-card">
      <view v-if="showHead" class="sk-head">
        <view class="sk-pill shimmer" />
        <view class="sk-pill sk-pill-sm shimmer" />
      </view>
      <view class="sk-body">
        <view class="sk-thumb shimmer" />
        <view class="sk-lines">
          <view class="sk-line shimmer" />
          <view class="sk-line sk-line-short shimmer" />
          <view class="sk-line sk-line-xs shimmer" />
        </view>
      </view>
      <view v-if="showActions" class="sk-actions">
        <view class="sk-btn shimmer" />
        <view class="sk-btn shimmer" />
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 4 },
  showHead: { type: Boolean, default: true },
  showActions: { type: Boolean, default: true },
})
</script>

<style scoped>
.list-sk {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.sk-card {
  padding: 24rpx;
}

.sk-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.sk-pill {
  width: 120rpx;
  height: 32rpx;
  border-radius: 8rpx;
  background: #eef2f7;
}

.sk-pill-sm {
  width: 160rpx;
}

.sk-body {
  display: flex;
  gap: 20rpx;
}

.sk-thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #eef2f7;
  flex-shrink: 0;
}

.sk-lines {
  flex: 1;
  padding-top: 4rpx;
}

.sk-line {
  height: 28rpx;
  margin-bottom: 16rpx;
  border-radius: 8rpx;
  background: #eef2f7;
}

.sk-line-short {
  width: 45%;
}

.sk-line-xs {
  width: 65%;
  height: 22rpx;
  margin-bottom: 0;
}

.sk-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.sk-btn {
  width: 120rpx;
  height: 52rpx;
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
