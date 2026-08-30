<template>
  <view v-if="loading && !hasData" class="state-box">
    <text class="state-icon">⏳</text>
    <text class="state-text">加载中…</text>
  </view>
  <view v-else-if="error && !hasData" class="state-box">
    <text class="state-icon">😕</text>
    <text class="state-text">{{ error }}</text>
    <view class="state-btn" @tap="$emit('retry')">点击重试</view>
  </view>
  <view v-else-if="showEmpty && !hasData" class="state-box">
    <text class="state-icon">📭</text>
    <text class="state-text">{{ emptyText }}</text>
    <text v-if="emptyHint" class="state-hint">{{ emptyHint }}</text>
  </view>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hasData: { type: Boolean, default: false },
  showEmpty: { type: Boolean, default: true },
  emptyText: { type: String, default: '暂无数据' },
  emptyHint: { type: String, default: '' },
})

defineEmits(['retry'])
</script>

<style scoped>
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  text-align: center;
}
.state-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}
.state-text {
  font-size: 28rpx;
  color: #606266;
  line-height: 1.5;
}
.state-hint {
  font-size: 24rpx;
  color: #909399;
  margin-top: 8rpx;
}
.state-btn {
  margin-top: 28rpx;
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}
</style>
