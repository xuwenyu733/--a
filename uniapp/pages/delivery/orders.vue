<template>
  <view class="container">
    <view class="tabs">
      <view class="tab" :class="{ active: roleTab === 'poster' }" @tap="switchRole('poster')">我发布的</view>
      <view v-if="user?.courierVerified" class="tab" :class="{ active: roleTab === 'courier' }" @tap="switchRole('courier')">我接的单</view>
    </view>

    <scroll-view scroll-x class="status-tabs" show-scrollbar="false">
      <view
        v-for="s in statusFilters"
        :key="s.value"
        class="status-tab"
        :class="{ active: statusFilter === s.value }"
        @tap="setStatusFilter(s.value)"
      >{{ s.label }}</view>
    </scroll-view>

    <ListCardSkeleton v-if="loading && !orders.length" :count="4" />
    <LoadState
      v-else
      :loading="false"
      :error="loadError"
      :has-data="orders.length > 0"
      empty-text="暂无订单"
      @retry="load"
    />
    <view v-for="item in orders" :key="item._id" class="card order-card">
      <view class="head">
        <text class="tag">{{ typeLabel(item.type) }}</text>
        <text class="tag" :class="statusClass(item.status)">{{ DELIVERY_ORDER_STATUS[item.status] }}</text>
        <text class="price">¥{{ item.fee }}</text>
      </view>
      <text v-if="item.title" class="title">{{ item.title }}</text>
      <text class="line">区域：{{ item.zoneId?.name }}</text>
      <text class="line">取：{{ item.pickupAddress }}</text>
      <text class="line">送：{{ item.dropoffAddress }}</text>
      <text v-if="item.contactPhone && roleTab === 'courier'" class="line">发布人电话：{{ item.contactPhone }}</text>
      <text v-if="item.courierId && roleTab === 'poster'" class="line muted">
        骑手：{{ item.courierId?.nickname || item.courierId?.phone || '—' }}
      </text>
      <text v-if="item.posterId && roleTab === 'courier'" class="line muted">
        发布人：{{ item.posterId?.nickname || item.posterId?.phone || '—' }}
      </text>
      <text v-if="item.description" class="desc muted">{{ item.description }}</text>
      <text v-if="item.remark" class="desc muted">备注：{{ item.remark }}</text>
      <text class="time muted">{{ formatTime(item.createdAt) }}</text>

      <view class="actions">
        <button v-if="peerPhone(item)" size="mini" @tap="callPhone(peerPhone(item))">联系对方</button>
        <button v-if="canCancel(item)" size="mini" type="warn" @tap="cancel(item)">取消</button>
        <button
          v-if="roleTab === 'courier' && item.status === 'accepted'"
          size="mini"
          type="primary"
          @tap="confirmUpdate(item, 'delivering', '确认开始配送？')"
        >开始配送</button>
        <button
          v-if="roleTab === 'courier' && item.status === 'delivering'"
          size="mini"
          type="primary"
          @tap="confirmUpdate(item, 'completed', '确认已送达并完成订单？')"
        >确认完成</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getMyDeliveryOrders, updateDeliveryOrderStatus } from '@/api/delivery'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify } from '@/utils/verify'
import { onWs, offWs } from '@/utils/ws'
import { WS_EVENTS } from '@/utils/wsEvents'
import {
  DELIVERY_ORDER_TYPES,
  DELIVERY_ORDER_STATUS,
  DELIVERY_STATUS_FILTERS,
  deliveryStatusClass,
  labelOf,
} from '@/constants/delivery'
import { formatTime } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import ListCardSkeleton from '@/components/ListCardSkeleton.vue'

const user = ref(null)
const loading = ref(false)
const loadError = ref('')
const orders = ref([])
const roleTab = ref('poster')
const statusFilter = ref('')
const statusFilters = DELIVERY_STATUS_FILTERS
let onDeliveryUpdate = null
let onDeliveryNew = null

onLoad((options) => {
  if (options.role === 'courier') roleTab.value = 'courier'
  if (options.status) statusFilter.value = options.status
  setupDeliveryListeners()
})

function setupDeliveryListeners() {
  if (onDeliveryUpdate) offWs(WS_EVENTS.DELIVERY_UPDATE, onDeliveryUpdate)
  onDeliveryUpdate = () => { load() }
  onWs(WS_EVENTS.DELIVERY_UPDATE, onDeliveryUpdate)

  if (onDeliveryNew) offWs(WS_EVENTS.DELIVERY_NEW, onDeliveryNew)
  onDeliveryNew = () => {
    if (roleTab.value === 'courier') load()
  }
  onWs(WS_EVENTS.DELIVERY_NEW, onDeliveryNew)
}

onUnmounted(() => {
  if (onDeliveryUpdate) offWs(WS_EVENTS.DELIVERY_UPDATE, onDeliveryUpdate)
  if (onDeliveryNew) offWs(WS_EVENTS.DELIVERY_NEW, onDeliveryNew)
})

onShow(async () => {
  if (!ensureLogin()) return
  const data = await refreshUserAndVerify()
  user.value = data.user
  load()
})

onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()))

function switchRole(r) {
  roleTab.value = r
  load()
}

function setStatusFilter(val) {
  statusFilter.value = val
  load()
}

function typeLabel(type) {
  return labelOf(DELIVERY_ORDER_TYPES, type)
}

function statusClass(status) {
  return deliveryStatusClass(status)
}

function peerPhone(item) {
  if (roleTab.value === 'poster') {
    return item.courierId?.phone || ''
  }
  return item.contactPhone || item.posterId?.phone || ''
}

function canCancel(item) {
  return ['open', 'accepted'].includes(item.status) &&
    (roleTab.value === 'poster' || (roleTab.value === 'courier' && item.courierId))
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const params = { role: roleTab.value, pageSize: 50 }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await getMyDeliveryOrders(params)
    orders.value = res.list || []
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function cancel(item) {
  uni.showModal({
    title: '取消订单',
    content: '确定取消该跑腿订单？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await updateDeliveryOrderStatus(item._id, { status: 'cancelled', cancelReason: '' })
        uni.showToast({ title: '已取消', icon: 'success' })
        load()
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    },
  })
}

function confirmUpdate(item, status, content) {
  uni.showModal({
    title: '确认操作',
    content,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await updateDeliveryOrderStatus(item._id, { status })
        uni.showToast({ title: '状态已更新', icon: 'success' })
        load()
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    },
  })
}

function callPhone(phone) {
  if (!phone) return
  uni.makePhoneCall({ phoneNumber: String(phone) })
}
</script>

<style lang="scss" scoped>
.tabs { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx; background: #fff; border-radius: 12rpx; font-size: 28rpx; }
.tab.active { background: #409eff; color: #fff; }
.status-tabs { white-space: nowrap; margin-bottom: 20rpx; }
.status-tab {
  display: inline-block; padding: 8rpx 20rpx; margin-right: 12rpx;
  background: #fff; border-radius: 999rpx; font-size: 24rpx;
}
.status-tab.active { background: #ecf5ff; color: #409eff; }
.head { display: flex; gap: 12rpx; flex-wrap: wrap; align-items: center; margin-bottom: 12rpx; }
.title { display: block; font-weight: 600; font-size: 30rpx; margin-bottom: 8rpx; }
.line { display: block; font-size: 26rpx; margin-bottom: 6rpx; }
.desc { display: block; font-size: 24rpx; line-height: 1.5; margin-bottom: 4rpx; }
.time { display: block; margin-top: 8rpx; font-size: 22rpx; }
.price { color: #f56c6c; font-weight: 700; margin-left: auto; }
.actions { margin-top: 16rpx; display: flex; gap: 12rpx; flex-wrap: wrap; }
.tag.primary { background: #ecf5ff; color: #409eff; }
</style>
