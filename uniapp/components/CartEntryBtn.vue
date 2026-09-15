<template>
  <view class="cart-entry" :class="[`is-${variant}`]" @tap.stop="goCart">
    <view class="cart-icon-wrap">
      <text class="cart-glyph">🛒</text>
      <view v-if="badgeText" class="cart-badge">{{ badgeText }}</view>
    </view>
    <text v-if="label" class="cart-label">{{ label }}</text>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCartCount } from '@/api/cart'
import { ensureLogin, isLoggedIn } from '@/utils/auth'

defineProps({
  /** footer：详情底栏；toolbar：市集搜索栏旁 */
  variant: {
    type: String,
    default: 'footer',
  },
  label: {
    type: String,
    default: '',
  },
})

const count = ref(0)

const badgeText = computed(() => {
  const n = Number(count.value) || 0
  if (n <= 0) return ''
  return n > 99 ? '99+' : String(n)
})

async function refresh() {
  if (!isLoggedIn()) {
    count.value = 0
    return
  }
  try {
    const data = await getCartCount()
    count.value = Number(data?.count) || 0
  } catch {
    count.value = 0
  }
}

function goCart() {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/cart/index' })
}

onMounted(refresh)

defineExpose({ refresh })
</script>

<style lang="scss" scoped>
.cart-entry {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.cart-entry.is-footer {
  width: 88rpx;
  height: 88rpx;
}

.cart-entry.is-toolbar {
  width: 72rpx;
  height: 72rpx;
  margin-right: 12rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  gap: 0;
}

.cart-icon-wrap {
  position: relative;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-glyph {
  font-size: 34rpx;
  line-height: 1;
}

.cart-label {
  font-size: 20rpx;
  color: #909399;
  line-height: 1;
}

.cart-badge {
  position: absolute;
  top: -8rpx;
  right: -14rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  border-radius: 28rpx;
  background: #f56c6c;
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  line-height: 28rpx;
  text-align: center;
  box-sizing: border-box;
  border: 2rpx solid #fff;
}
</style>
