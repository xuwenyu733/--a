<template>
  <view class="delivery-order-card" :class="{ 'delivery-order-card--muted': muted }">
    <view class="doc-head">
      <view class="doc-head__left">
        <text class="tag">{{ typeLabel }}</text>
        <text v-if="statusLabel" class="tag" :class="statusClass">{{ statusLabel }}</text>
        <text v-if="extraTag" class="tag tag-extra">{{ extraTag }}</text>
      </view>
      <view class="doc-fee">
        <text class="doc-fee__symbol">¥</text>
        <text class="doc-fee__num">{{ fee }}</text>
      </view>
    </view>

    <text v-if="title" class="doc-title">{{ title }}</text>

    <view v-if="showTimeRow" class="doc-time-row">
      <view class="doc-time-cell">
        <text class="doc-time-cell__label">预计送达</text>
        <text class="doc-time-cell__value">{{ deliveryTimeLabel || '--' }}</text>
      </view>
      <view class="doc-time-cell">
        <text class="doc-time-cell__label">实际送达</text>
        <text class="doc-time-cell__value">{{ actualDeliveryLabel || '--' }}</text>
      </view>
    </view>

    <view v-if="deliveryTimeLabel && !showTimeRow" class="doc-time-row doc-time-row--single">
      <view class="doc-time-cell">
        <text class="doc-time-cell__label">预计送达</text>
        <text class="doc-time-cell__value doc-time-cell__value--accent">{{ deliveryTimeLabel }}</text>
      </view>
    </view>

    <view v-if="warnText" class="doc-warn">{{ warnText }}</view>

    <view class="doc-route">
      <view class="doc-route__item">
        <view class="doc-route__dot doc-route__dot--pick">取</view>
        <text class="doc-route__text">{{ pickupAddress }}</text>
      </view>
      <view class="doc-route__connector" />
      <view class="doc-route__item">
        <view class="doc-route__dot doc-route__dot--drop">送</view>
        <text class="doc-route__text">{{ dropoffAddress }}</text>
      </view>
    </view>

    <view v-if="infoLines.length" class="doc-info">
      <view v-for="(line, idx) in infoLines" :key="idx" class="doc-info__item">
        <text class="doc-info__label">{{ line.label }}</text>
        <text class="doc-info__value">{{ line.value }}</text>
      </view>
    </view>

    <text v-if="description" class="doc-desc">{{ description }}</text>
    <text v-if="remark" class="doc-remark">备注：{{ remark }}</text>

    <view class="doc-foot">
      <view class="doc-foot__meta">
        <text v-if="zoneName" class="doc-foot__zone">{{ zoneName }}</text>
        <text v-if="createdAt" class="doc-foot__time">{{ createdAt }}</text>
      </view>
      <view v-if="$slots.actions" class="doc-foot__actions">
        <slot name="actions" />
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  typeLabel: { type: String, default: '' },
  statusLabel: { type: String, default: '' },
  statusClass: { type: String, default: '' },
  extraTag: { type: String, default: '' },
  fee: { type: [String, Number], default: '' },
  title: { type: String, default: '' },
  showTimeRow: { type: Boolean, default: false },
  deliveryTimeLabel: { type: String, default: '' },
  actualDeliveryLabel: { type: String, default: '' },
  warnText: { type: String, default: '' },
  pickupAddress: { type: String, default: '' },
  dropoffAddress: { type: String, default: '' },
  infoLines: { type: Array, default: () => [] },
  description: { type: String, default: '' },
  remark: { type: String, default: '' },
  zoneName: { type: String, default: '' },
  createdAt: { type: String, default: '' },
  muted: { type: Boolean, default: false },
})
</script>

<style lang="scss" scoped>
.delivery-order-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 28rpx rgba(15, 23, 42, 0.06);
  border: 1rpx solid rgba(235, 238, 245, 0.9);
}

.delivery-order-card--muted {
  background: #fafbfc;
  border-color: #e4e7ed;
}

.doc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.doc-head__left {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}

.tag-extra {
  background: #f4f4f5;
  color: #909399;
}

.doc-fee {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  color: #f56c6c;
  line-height: 1;
}

.doc-fee__symbol {
  font-size: 24rpx;
  font-weight: 600;
  margin-right: 2rpx;
}

.doc-fee__num {
  font-size: 40rpx;
  font-weight: 700;
}

.doc-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  line-height: 1.45;
  margin-bottom: 16rpx;
  word-break: break-all;
}

.doc-time-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #f5f9ff 0%, #f0f7ff 100%);
  border-radius: 14rpx;
}

.doc-time-row--single {
  .doc-time-cell {
    flex: 1;
  }
}

.doc-time-cell {
  flex: 1;
  min-width: 0;
}

.doc-time-cell__label {
  display: block;
  font-size: 22rpx;
  color: #909399;
  margin-bottom: 6rpx;
}

.doc-time-cell__value {
  display: block;
  font-size: 26rpx;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}

.doc-time-cell__value--accent {
  color: #409eff;
}

.doc-warn {
  display: block;
  margin-bottom: 12rpx;
  padding: 10rpx 16rpx;
  font-size: 24rpx;
  color: #f56c6c;
  background: #fef0f0;
  border-radius: 10rpx;
}

.doc-route {
  padding: 20rpx;
  margin-bottom: 16rpx;
  background: #f8fafc;
  border-radius: 16rpx;
}

.doc-route__item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.doc-route__dot {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.doc-route__dot--pick {
  background: linear-gradient(135deg, #409eff, #36cfc9);
}

.doc-route__dot--drop {
  background: linear-gradient(135deg, #67c23a, #95d475);
}

.doc-route__connector {
  width: 2rpx;
  height: 20rpx;
  margin: 6rpx 0 6rpx 21rpx;
  background: #dcdfe6;
}

.doc-route__text {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #303133;
  line-height: 1.5;
  word-break: break-all;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.doc-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 24rpx;
  margin-bottom: 12rpx;
}

.doc-info__item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  max-width: 100%;
}

.doc-info__label {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #909399;
  padding: 4rpx 10rpx;
  background: #f4f4f5;
  border-radius: 6rpx;
}

.doc-info__value {
  font-size: 26rpx;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-desc,
.doc-remark {
  font-size: 24rpx;
  color: #909399;
  line-height: 1.55;
  margin-bottom: 8rpx;
  word-break: break-all;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.doc-foot {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f2f5;
}

.doc-foot__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.doc-foot__zone {
  font-size: 24rpx;
  color: #606266;
  padding: 6rpx 14rpx;
  background: #f4f4f5;
  border-radius: 999rpx;
}

.doc-foot__time {
  font-size: 22rpx;
  color: #c0c4cc;
}

.doc-foot__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: flex-end;
}

.doc-foot__actions :deep(button) {
  margin: 0;
}
</style>
