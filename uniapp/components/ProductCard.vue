<template>
  <view class="product-card" :class="{ compact }" @tap="goDetail">
    <view class="cover-wrap">
      <image
        v-if="displayUrl"
        class="cover"
        :src="displayUrl"
        mode="aspectFill"
        lazy-load
        @error="onImageError"
      />
      <view v-else class="cover empty">
        <text class="empty-icon">📷</text>
        <text class="empty-text">暂无图</text>
      </view>
      <view v-if="product.tradeMode === 'exchange'" class="badge warn">换物</view>
      <view v-else-if="groupBuy" class="badge danger">拼单</view>
      <view v-else-if="product.sellerType === 'merchant'" class="badge warn">商家</view>
    </view>
    <view class="info">
      <text class="title">{{ product.title }}</text>
      <view class="price-row">
        <text class="price">{{ priceText }}</text>
        <text v-if="origPriceText" class="orig">{{ origPriceText }}</text>
      </view>
      <text class="meta muted" @tap.stop="goSeller">{{ sellerName }} · {{ conditionText }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getFileUrl, getThumbUrl } from '@/utils/fileUrl'
import { CONDITIONS, formatPrice } from '@/utils/format'

const props = defineProps({
  product: { type: Object, required: true },
  compact: { type: Boolean, default: true },
})

const preferThumb = ref(true)
const imageError = ref(false)

const rawPath = computed(() => props.product.cover || props.product.images?.[0])

const displayUrl = computed(() => {
  if (!rawPath.value || imageError.value) return ''
  return preferThumb.value ? getThumbUrl(rawPath.value) : getFileUrl(rawPath.value)
})

watch(
  () => `${props.product._id || ''}-${rawPath.value || ''}`,
  () => {
    preferThumb.value = true
    imageError.value = false
  }
)

function onImageError() {
  if (preferThumb.value) {
    preferThumb.value = false
  } else {
    imageError.value = true
  }
}

const groupBuy = computed(
  () =>
    props.product.tradeMode !== 'exchange' &&
    props.product.groupBuy?.enabled &&
    props.product.groupBuy?.status === 'open' &&
    props.product.groupBuy?.groupPrice > 0
)

const priceText = computed(() => {
  if (groupBuy.value) return `拼 ¥${props.product.groupBuy.groupPrice}`
  return formatPrice(props.product.price, props.product.tradeMode)
})

const origPriceText = computed(() => {
  if (!groupBuy.value || !props.product.price) return ''
  return `¥${props.product.price}`
})

const conditionText = computed(() => CONDITIONS[props.product.condition] || props.product.condition || '')
const sellerName = computed(() => props.product.sellerId?.nickname || '卖家')

function goDetail() {
  uni.navigateTo({ url: `/pages/products/detail?id=${props.product._id}` })
}

function goSeller() {
  const id = props.product.sellerId?._id || props.product.sellerId
  if (!id) return
  if (props.product.sellerType === 'merchant') {
    uni.navigateTo({ url: `/pages/shop/index?userId=${id}` })
  } else {
    uni.navigateTo({ url: `/pages/user/profile?id=${id}` })
  }
}
</script>

<script>
export default {
  options: {
    styleIsolation: 'shared',
  },
}
</script>

<style lang="scss" scoped>
.product-card {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.cover-wrap {
  position: relative;
  height: 240rpx;
}

.compact .cover-wrap {
  height: 220rpx;
}

.cover {
  width: 100%;
  height: 100%;
  background: #eef2f7;
}

.cover.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #f5f7fa, #eef2f7);
  gap: 8rpx;
}

.empty-icon {
  font-size: 40rpx;
  opacity: 0.5;
}

.empty-text {
  color: #c0c4cc;
  font-size: 22rpx;
}

.badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  color: #fff;
}

.badge.warn { background: #e6a23c; }
.badge.danger { background: #f56c6c; }

.info {
  padding: 14rpx 16rpx 18rpx;
}

.title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-row {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}

.price {
  color: #f56c6c;
  font-size: 30rpx;
  font-weight: 700;
  margin-right: 8rpx;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orig {
  color: #c0c4cc;
  font-size: 22rpx;
  text-decoration: line-through;
}

.meta {
  display: block;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
