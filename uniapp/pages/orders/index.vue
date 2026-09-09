<template>
  <view class="page-orders">
    <view class="header-bar">
      <view class="flow-hint muted">
        <text>流程：下单 - 付款 - 卖家确认收款 - 确认完成 - 评价</text>
      </view>

      <view class="tabs">
        <view class="tab" :class="{ active: role === 'buy' }" @tap="switchRole('buy')">我买到的</view>
        <view class="tab" :class="{ active: role === 'sell' }" @tap="switchRole('sell')">我卖出的</view>
      </view>

      <view class="status-tabs">
        <view
          v-for="s in statusOptions"
          :key="s.value"
          class="status-tab"
          :class="{ active: statusFilter === s.value }"
          @tap="setStatusFilter(s.value)"
        >{{ s.label }}</view>
      </view>
    </view>

    <scroll-view scroll-y class="orders-scroll" enable-back-to-top>
      <view class="orders-body">
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
      </view>
    </scroll-view>

    <view v-if="payVisible" class="pay-mask" @tap="closePay">
      <view class="pay-panel card" @tap.stop>
        <text class="section-title">付款 · ¥{{ payOrder?.price }}</text>
        <view class="pay-tabs">
          <text :class="{ active: payMode === 'online' }" @tap="payMode = 'online'">在线支付</text>
          <text :class="{ active: payMode === 'manual' }" @tap="payMode = 'manual'">线下转账</text>
        </view>
        <template v-if="payMode === 'online'">
          <text v-if="payTip" class="pay-tip">{{ payTip }}</text>
          <text v-if="!payConfig.domainReady" class="pay-tip muted">
            正式支付回调域名尚未配置（当前可用沙箱联调）。买好域名和 HTTPS 后填写 PAYMENT_NOTIFY_BASE_URL。
          </text>
          <radio-group v-if="channels.length" @change="onChannel">
            <label v-for="c in channels" :key="c.id" class="channel">
              <radio :value="c.id" :checked="channel === c.id" /> {{ c.name }}
            </label>
          </radio-group>
          <view v-if="activePayment" class="pay-meta muted">
            支付单 {{ activePayment.paymentNo }} · ¥{{ activePayment.amount }}
          </view>
          <button v-if="!activePayment" type="primary" :loading="paying" @tap="createPay">发起支付</button>
          <button
            v-else-if="payConfig.sandboxSimulate"
            type="primary"
            :loading="paying"
            @tap="simulatePay"
          >模拟支付成功</button>
          <button
            v-else-if="activePayment.payParams"
            type="primary"
            :loading="paying"
            @tap="invokeWechatPay"
          >继续微信支付</button>
          <button v-else type="primary" :loading="paying" @tap="createPay">重新发起</button>
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
import { requestWechatPayment } from '@/utils/pay'
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
const paying = ref(false)
const payConfig = ref({
  enabled: false,
  mode: 'sandbox',
  sandboxSimulate: true,
  domainReady: false,
  tip: '',
})

const payTip = computed(() => payConfig.value.tip || '')
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
    payConfig.value = {
      enabled: !!cfg.enabled,
      mode: cfg.mode || 'sandbox',
      sandboxSimulate: !!cfg.sandboxSimulate,
      domainReady: !!cfg.domainReady,
      tip: cfg.tip || '',
    }
    payOrder.value = order
    payMode.value = cfg.enabled ? 'online' : 'manual'
    channels.value = (cfg.channels || []).filter((c) => c.available !== false)
    channel.value = channels.value[0]?.id || 'wechat'
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
  if (paying.value) return
  paying.value = true
  try {
    const res = await paymentApi.create(payOrder.value._id, { channel: channel.value })
    activePayment.value = {
      ...res.payment,
      payParams: res.payment?.payParams || null,
    }
    if (res.clientAction === 'requestPayment' && res.payment?.payParams) {
      await requestWechatPayment(res.payment.payParams)
      await waitUntilPaid(res.payment.paymentNo)
      uni.showToast({ title: '支付成功', icon: 'success' })
      closePay()
      loadOrders()
      return
    }
    uni.showToast({
      title: res.sandbox ? '支付单已创建，请点模拟支付' : '支付单已创建',
      icon: 'none',
    })
  } catch (e) {
    uni.showToast({ title: e.message || '失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

async function invokeWechatPay() {
  if (!activePayment.value?.payParams || paying.value) return
  paying.value = true
  try {
    await requestWechatPayment(activePayment.value.payParams)
    await waitUntilPaid(activePayment.value.paymentNo)
    uni.showToast({ title: '支付成功', icon: 'success' })
    closePay()
    loadOrders()
  } catch (e) {
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

async function simulatePay() {
  const no = activePayment.value?.paymentNo
  if (!no || paying.value) return
  paying.value = true
  try {
    await paymentApi.simulate(no)
    uni.showToast({ title: '支付成功', icon: 'success' })
    closePay()
    loadOrders()
  } catch (e) {
    uni.showToast({ title: e.message || '失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

async function waitUntilPaid(paymentNo, tries = 8) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const tx = await paymentApi.getPayment(paymentNo)
      if (tx?.status === 'paid') return true
    } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 800))
  }
  return false
}

function closePay() {
  payVisible.value = false
  payOrder.value = null
  activePayment.value = null
  paying.value = false
}
</script>

<style lang="scss" scoped>
.page-orders {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

.header-bar {
  flex-shrink: 0;
  padding: 16rpx 24rpx 12rpx;
  background: #f5f7fa;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.orders-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.orders-body {
  padding: 0 24rpx 24rpx;
  box-sizing: border-box;
}

.flow-hint {
  font-size: 24rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 12rpx;
  line-height: 1.5;
  background: #fff;
  border-radius: 12rpx;
}

.tabs { display: flex; gap: 16rpx; margin-bottom: 12rpx; }
.pay-qr { width: 320rpx; height: 320rpx; margin: 16rpx auto; display: block; border: 1rpx solid #ebeef5; border-radius: 12rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx; background: #fff; border-radius: 12rpx; font-size: 28rpx; }
.tab.active { background: #409eff; color: #fff; }
.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.status-tab {
  padding: 8rpx 20rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
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
.pay-tip {
  display: block;
  margin: 8rpx 0 16rpx;
  padding: 16rpx;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
}
.pay-tip.muted {
  background: #f4f4f5;
  color: #909399;
}
.pay-meta { display: block; margin: 8rpx 0 16rpx; font-size: 22rpx; word-break: break-all; }
.pay-panel button { margin-top: 16rpx; }
</style>
