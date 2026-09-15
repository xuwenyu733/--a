<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!list.length" class="empty-box">
      <text class="empty-title">购物车是空的</text>
      <button class="btn-primary" @tap="goMarket">去逛逛</button>
    </view>
    <view v-else class="list">
      <view v-for="item in list" :key="item._id" class="item">
        <view class="check" @tap="toggleSelect(item)">
          <text class="check-box" :class="{ on: selected[item._id], off: !isBuyable(item) }">{{ selected[item._id] ? '✓' : '' }}</text>
        </view>
        <image
          class="thumb"
          :src="thumb(item)"
          mode="aspectFill"
          @tap="goDetail(item)"
        />
        <view class="info">
          <text class="title" @tap="goDetail(item)">{{ item.productId?.title || '商品已失效' }}</text>
          <view class="meta">
            <text class="price">¥{{ item.productId?.price ?? '-' }}</text>
            <text v-if="!isBuyable(item)" class="warn">不可购买</text>
            <text v-else class="stock">库存 {{ item.productId?.stock ?? 0 }}</text>
          </view>
          <view class="row">
            <view class="stepper">
              <text class="step-btn" @tap="changeQty(item, -1)">−</text>
              <text class="step-num">{{ item.quantity }}</text>
              <text class="step-btn" @tap="changeQty(item, 1)">+</text>
            </view>
            <text class="del" @tap="removeItem(item)">删除</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="list.length" class="footer">
      <view class="check" @tap="toggleAll">
        <text class="check-box" :class="{ on: allSelected }">{{ allSelected ? '✓' : '' }}</text>
        <text class="all-label">全选</text>
      </view>
      <view class="summary">
        <text>合计 </text>
        <text class="price">¥{{ totalPrice }}</text>
      </view>
      <button class="checkout-btn" :disabled="!selectedIds.length || checkingOut" @tap="checkout">
        结算{{ selectedIds.length ? `(${selectedIds.length})` : '' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getCart,
  updateCartItem,
  removeCartItem,
  checkoutCart,
} from '@/api/cart'
import { ensureLogin } from '@/utils/auth'
import { getFileUrl } from '@/utils/fileUrl'

const loading = ref(true)
const checkingOut = ref(false)
const list = ref([])
const selected = reactive({})

function isBuyable(item) {
  const p = item.productId
  return p && p.status === 'on_sale' && Number(p.stock) >= 1
}

function thumb(item) {
  return getFileUrl(item.productId?.images?.[0]) || ''
}

const buyableList = computed(() => list.value.filter(isBuyable))
const selectedIds = computed(() =>
  list.value.filter((i) => selected[i._id] && isBuyable(i)).map((i) => i._id)
)
const allSelected = computed(
  () => buyableList.value.length > 0 && buyableList.value.every((i) => selected[i._id])
)
const totalPrice = computed(() =>
  list.value
    .filter((i) => selected[i._id] && isBuyable(i))
    .reduce((sum, i) => sum + Number(i.productId?.price || 0) * Number(i.quantity || 1), 0)
    .toFixed(2)
)

function toggleSelect(item) {
  if (!isBuyable(item)) return
  selected[item._id] = !selected[item._id]
}

function toggleAll() {
  const next = !allSelected.value
  buyableList.value.forEach((i) => {
    selected[i._id] = next
  })
}

function goMarket() {
  uni.switchTab({ url: '/pages/products/list' })
}

function goDetail(item) {
  const id = item.productId?._id
  if (id) uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}

async function load() {
  if (!ensureLogin()) return
  loading.value = true
  try {
    const data = await getCart()
    list.value = data.list || []
    list.value.forEach((i) => {
      if (selected[i._id] === undefined) selected[i._id] = isBuyable(i)
    })
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function changeQty(item, delta) {
  if (!isBuyable(item)) return
  const max = Math.max(1, Number(item.productId?.stock) || 1)
  const next = Math.min(max, Math.max(1, Number(item.quantity) + delta))
  if (next === item.quantity) return
  try {
    const updated = await updateCartItem(item._id, { quantity: next })
    item.quantity = updated.quantity
  } catch (e) {
    uni.showToast({ title: e.message || '更新失败', icon: 'none' })
    load()
  }
}

function removeItem(item) {
  uni.showModal({
    title: '提示',
    content: '从购物车移除？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await removeCartItem(item._id)
        delete selected[item._id]
        uni.showToast({ title: '已移除', icon: 'none' })
        load()
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

async function checkout() {
  if (!selectedIds.value.length) return
  checkingOut.value = true
  try {
    const data = await checkoutCart({ itemIds: selectedIds.value })
    uni.showToast({
      title: data.failedCount
        ? `成功${data.successCount}件，失败${data.failedCount}件`
        : '下单成功',
      icon: 'none',
    })
    setTimeout(() => uni.navigateTo({ url: '/pages/orders/index' }), 500)
  } catch (e) {
    uni.showToast({ title: e.message || '结算失败', icon: 'none' })
    load()
  } finally {
    checkingOut.value = false
  }
}

onShow(load)
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 24rpx 24rpx 160rpx; background: #f5f6f8; box-sizing: border-box; }
.empty, .empty-box { padding: 120rpx 0; text-align: center; color: #909399; }
.empty-title { display: block; margin-bottom: 24rpx; }
.btn-primary { background: #409eff; color: #fff; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.item {
  display: flex; gap: 16rpx; align-items: flex-start;
  padding: 20rpx; background: #fff; border-radius: 16rpx;
}
.check { padding-top: 28rpx; }
.check-box {
  width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #c0c4cc;
  display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #fff;
}
.check-box.on { background: #409eff; border-color: #409eff; }
.check-box.off { opacity: 0.35; }
.thumb { width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #eef2f7; flex-shrink: 0; }
.info { flex: 1; min-width: 0; }
.title { display: block; font-size: 28rpx; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { display: flex; gap: 16rpx; margin: 12rpx 0; font-size: 24rpx; color: #909399; }
.price { color: #f56c6c; font-weight: 700; }
.warn { color: #e6a23c; }
.row { display: flex; justify-content: space-between; align-items: center; }
.stepper { display: flex; align-items: center; gap: 16rpx; background: #f2f3f5; border-radius: 8rpx; padding: 4rpx 12rpx; }
.step-btn { width: 44rpx; text-align: center; font-size: 32rpx; color: #606266; }
.step-num { min-width: 40rpx; text-align: center; }
.del { color: #f56c6c; font-size: 24rpx; }
.footer {
  position: fixed; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff; border-top: 1rpx solid #ebeef5; z-index: 20;
}
.all-label { margin-left: 8rpx; font-size: 26rpx; }
.summary { flex: 1; text-align: right; font-size: 26rpx; }
.checkout-btn {
  margin: 0; background: #f56c6c; color: #fff; font-size: 28rpx;
  padding: 0 36rpx; height: 72rpx; line-height: 72rpx; border-radius: 36rpx;
}
.checkout-btn[disabled] { opacity: 0.5; }
</style>
