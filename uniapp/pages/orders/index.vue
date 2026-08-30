<template>
  <view class="container">
    <view class="card flow-hint muted">
      流程：下单 → 付款 → 卖家确认收款 → 确认完成 → 评价
    </view>

    <view class="tabs">
      <view class="tab" :class="{ active: role === 'buy' }" @tap="switchRole('buy')">我买到的</view>
      <view class="tab" :class="{ active: role === 'sell' }" @tap="switchRole('sell')">我卖出的</view>
    </view>

    <scroll-view scroll-x class="status-tabs" show-scrollbar="false">
      <view
        v-for="s in statusOptions"
        :key="s.value"
        class="status-tab"
        :class="{ active: statusFilter === s.value }"
        @tap="setStatusFilter(s.value)"
      >{{ s.label }}</view>
    </scroll-view>

    <ListCardSkeleton v-if="loading && !list.length" :count="4" />
    <LoadState
      v-else
      :loading="false"
      :error="loadError"
      :has-data="list.length > 0"
      empty-text="暂无订单"
      @retry="loadOrders"
    />
    <view v-for="item in list" :key="item._id" class="card order-card">
      <view class="order-head">
        <text class="tag" :class="item.statusClass">{{ ORDER_STATUS[item.status] }}</text>
        <text class="muted">{{ item.createdAtText }}</text>
      </view>
      <view class="order-body" @tap="goProduct(item.productId?._id)">
        <image v-if="item.cover" class="thumb" :src="item.cover" mode="aspectFill" lazy-load />
        <view v-else class="thumb empty">图</view>
        <view class="info">
          <text class="title">{{ item.productId?.title }}</text>
          <text class="price">¥{{ item.price }}</text>
          <text v-if="item.isGroupBuy" class="tag danger inline">拼单价</text>
          <text class="peer muted">{{ item.peerLabel }}：{{ item.peerName }}</text>
          <text v-if="item.paymentHint" class="pay-hint">{{ item.paymentHint }}</text>
        </view>
      </view>
      <view class="actions">
        <button size="mini" @tap="goChat(item)">联系对方</button>
        <button v-if="role === 'sell' && item.status === 'confirmed' && item.paymentStatus === 'buyer_marked'" size="mini" type="primary" @tap="confirmPaid(item._id)">确认收款</button>
        <button v-if="role === 'buy' && item.status === 'confirmed' && item.paymentStatus !== 'paid_online' && item.paymentStatus !== 'seller_confirmed'" size="mini" type="primary" @tap="openPay(item)">去付款</button>
        <button v-if="role === 'buy' && item.status === 'confirmed' && item.paymentStatus !== 'paid_online' && item.paymentStatus !== 'seller_confirmed' && item.paymentStatus !== 'buyer_marked'" size="mini" @tap="markManualPaid(item._id)">我已付款</button>
        <button v-if="item.status === 'confirmed'" size="mini" type="primary" @tap="updateStatus(item._id, 'completed')">确认完成</button>
        <button v-if="item.status === 'confirmed' || item.status === 'pending'" size="mini" @tap="updateStatus(item._id, 'cancelled')">取消订单</button>
        <button v-if="item.status === 'completed' || item.status === 'cancelled'" size="mini" @tap="removeRecord(item._id)">删除记录</button>
        <button v-if="item.status === 'completed' && item.reviewSummary?.canReview" size="mini" type="primary" @tap="goReview(item)">评价对方</button>
        <text v-if="item.status === 'completed' && item.reviewSummary?.myReview" class="tag success">已评价 {{ item.reviewSummary.myReview.rating }} 星</text>
      </view>
    </view>
    <view v-if="!loading && !loadError && !list.length" class="empty">暂无订单</view>

    <view v-if="payVisible" class="pay-mask" @tap="closePay">
      <view class="pay-panel card" @tap.stop>
        <text class="section-title">付款 · ¥{{ payOrder?.price }}</text>
        <view class="pay-tabs">
          <text :class="{ active: payMode === 'online' }" @tap="payMode = 'online'">在线支付</text>
          <text :class="{ active: payMode === 'manual' }" @tap="payMode = 'manual'">线下转账</text>
        </view>
        <template v-if="payMode === 'online'">
          <radio-group @change="onChannel">
            <label v-for="c in channels" :key="c.id" class="channel">
              <radio :value="c.id" :checked="channel === c.id" /> {{ c.name }}
            </label>
          </radio-group>
          <button v-if="!activePayment" type="primary" @tap="createPay">发起支付</button>
          <button v-else type="primary" @tap="simulatePay">模拟支付成功</button>
        </template>
        <template v-else>
          <image v-if="sellerQr" class="pay-qr" :src="sellerQr" mode="aspectFit" @tap="previewQr" />
          <text v-else class="muted manual-tip">卖家尚未上传收款码，请通过「联系对方」协商，或改用在线支付。</text>
          <text class="muted manual-tip">扫码转账后点击「我已付款」，等待卖家确认收款。</text>
          <button type="primary" @tap="markManualPaid(payOrder._id)">我已付款</button>
        </template>
        <button @tap="closePay">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { list as listOrders, updateStatus as updateOrderStatus, markPaid, confirmPayment, hideOrder } from '@/api/order'
import { createConversation } from '@/api/chat'
import { getOrderReviewSummary } from '@/api/review'
import * as paymentApi from '@/api/payment'
import { ensureLogin } from '@/utils/auth'
import { getFileUrl } from '@/utils/fileUrl'
import { ORDER_STATUS, PAYMENT_STATUS, formatTime } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import ListCardSkeleton from '@/components/ListCardSkeleton.vue'

const role = ref('buy')
const statusFilter = ref('')
const list = ref([])
const loading = ref(false)
const loadError = ref('')
const payVisible = ref(false)
const payOrder = ref(null)
const payMode = ref('online')
const channels = ref([])
const channel = ref('wechat')
const activePayment = ref(null)

const sellerQr = computed(() => {
  const url = payOrder.value?.sellerId?.paymentQrUrl
  return url ? getFileUrl(url) : ''
})

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'confirmed', label: '待付款' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

onShow(() => {
  if (ensureLogin()) loadOrders()
})

function switchRole(r) {
  role.value = r
  loadOrders()
}

function setStatusFilter(val) {
  statusFilter.value = val
  loadOrders()
}

async function loadOrders() {
  loading.value = true
  loadError.value = ''
  try {
    const params = { role: role.value }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await listOrders(params)
    const orders = res.list || []
    await loadReviewSummaries(orders)
    list.value = orders.map((o) => ({
      ...o,
      cover: getFileUrl(o.productId?.images?.[0]),
      createdAtText: formatTime(o.createdAt),
      paymentHint: PAYMENT_STATUS[o.paymentStatus] || '',
      peerLabel: role.value === 'buy' ? '卖家' : '买家',
      peerName: role.value === 'buy' ? o.sellerId?.nickname : o.buyerId?.nickname,
      statusClass: o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'info' : 'warning',
    }))
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goProduct(id) {
  if (id) uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}

function goReview(order) {
  const name = role.value === 'buy' ? order.sellerId?.nickname : order.buyerId?.nickname
  uni.navigateTo({
    url: `/pages/orders/review?orderId=${order._id}&targetName=${encodeURIComponent(name || '对方')}`,
  })
}

async function loadReviewSummaries(orders) {
  const completed = orders.filter((o) => o.status === 'completed')
  await Promise.all(
    completed.map(async (order) => {
      try {
        order.reviewSummary = await getOrderReviewSummary(order._id)
      } catch {
        order.reviewSummary = null
      }
    })
  )
}

function previewQr() {
  if (sellerQr.value) uni.previewImage({ urls: [sellerQr.value] })
}

async function goChat(order) {
  const peerId = role.value === 'buy' ? order.sellerId?._id : order.buyerId?._id
  if (!peerId) return
  try {
    const conv = await createConversation({
      receiverId: peerId,
      productId: order.productId?._id,
    })
    uni.navigateTo({ url: `/pages/chat/room?id=${conv._id}` })
  } catch (e) {
    uni.showToast({ title: e.message || '无法发起聊天', icon: 'none' })
  }
}

function updateStatus(id, status) {
  const title = status === 'cancelled' ? '确定取消订单？' : '确认操作？'
  uni.showModal({
    title,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await updateOrderStatus(id, { status })
        uni.showToast({ title: '操作成功', icon: 'success' })
        loadOrders()
      } catch (err) {
        uni.showToast({ title: err.message || '失败', icon: 'none' })
      }
    },
  })
}

async function markManualPaid(id) {
  try {
    await markPaid(id)
    uni.showToast({ title: '已标记付款', icon: 'success' })
    closePay()
    loadOrders()
  } catch (e) {
    uni.showToast({ title: e.message || '失败', icon: 'none' })
  }
}

async function confirmPaid(id) {
  uni.showModal({
    title: '确认收款',
    content: '确认已收到买家付款？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await confirmPayment(id)
        uni.showToast({ title: '已确认收款', icon: 'success' })
        loadOrders()
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    },
  })
}

function removeRecord(id) {
  uni.showModal({
    title: '删除记录',
    content: '从列表中移除该订单？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await hideOrder(id)
        uni.showToast({ title: '已删除', icon: 'none' })
        loadOrders()
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    },
  })
}

async function openPay(order) {
  payOrder.value = null
  activePayment.value = null
  try {
    const cfg = await paymentApi.getConfig()
    payOrder.value = order
    payMode.value = cfg.enabled ? 'online' : 'manual'
    channels.value = cfg.channels || []
    channel.value = cfg.channels?.[0]?.id || 'wechat'
    if (cfg.enabled) {
      const active = await paymentApi.getActive(order._id)
      activePayment.value = active.payment?.status === 'pending' ? active.payment : null
    } else {
      activePayment.value = null
    }
    payVisible.value = true
  } catch (err) {
    payOrder.value = null
    uni.showToast({ title: err.message || '失败', icon: 'none' })
  }
}

function onChannel(e) { channel.value = e.detail.value }

async function createPay() {
  try {
    const res = await paymentApi.create(payOrder.value._id, { channel: channel.value })
    activePayment.value = res.payment
    uni.showToast({ title: '支付单已创建', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '失败', icon: 'none' })
  }
}

async function simulatePay() {
  const no = activePayment.value?.paymentNo
  if (!no) return
  try {
    await paymentApi.simulate(no)
    uni.showToast({ title: '支付成功', icon: 'success' })
    closePay()
    loadOrders()
  } catch (e) {
    uni.showToast({ title: e.message || '失败', icon: 'none' })
  }
}

function closePay() {
  payVisible.value = false
  payOrder.value = null
  activePayment.value = null
}
</script>

<style lang="scss" scoped>
.flow-hint { font-size: 24rpx; padding: 16rpx 20rpx; margin-bottom: 16rpx; line-height: 1.5; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.pay-qr { width: 320rpx; height: 320rpx; margin: 16rpx auto; display: block; border: 1rpx solid #ebeef5; border-radius: 12rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx; background: #fff; border-radius: 12rpx; font-size: 28rpx; }
.tab.active { background: #409eff; color: #fff; }
.status-tabs { white-space: nowrap; margin-bottom: 20rpx; }
.status-tab {
  display: inline-block; padding: 8rpx 20rpx; margin-right: 12rpx;
  background: #fff; border-radius: 999rpx; font-size: 24rpx;
}
.status-tab.active { background: #ecf5ff; color: #409eff; }
.order-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.order-body { display: flex; gap: 16rpx; }
.thumb { width: 140rpx; height: 140rpx; border-radius: 12rpx; background: #eef2f7; flex-shrink: 0; }
.thumb.empty { display: flex; align-items: center; justify-content: center; color: #909399; font-size: 24rpx; }
.info { flex: 1; min-width: 0; }
.info .title { display: block; font-size: 28rpx; font-weight: 500; }
.info .price { display: block; margin-top: 8rpx; color: #f56c6c; font-weight: 700; }
.tag.inline { display: inline-block; margin-top: 8rpx; }
.peer { display: block; margin-top: 8rpx; }
.pay-hint { display: block; margin-top: 8rpx; color: #e6a23c; font-size: 24rpx; }
.actions { margin-top: 16rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.pay-tabs { display: flex; gap: 24rpx; margin: 20rpx 0; font-size: 28rpx; }
.pay-tabs .active { color: #409eff; font-weight: 600; border-bottom: 4rpx solid #409eff; padding-bottom: 4rpx; }
.channel { display: block; padding: 16rpx 0; }
.manual-tip { display: block; margin: 16rpx 0 24rpx; line-height: 1.5; }
.pay-panel button { margin-top: 16rpx; }
</style>
