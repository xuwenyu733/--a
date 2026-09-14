<template>
  <view class="page-delivery-orders">
    <view class="header-bar">
      <view class="flow-hint muted">
        <text>流程：发布需求 - 骑手接单 - 开始配送 - 确认完成</text>
      </view>

      <view class="tabs">
        <view class="tab" :class="{ active: roleTab === 'poster' }" @tap="switchRole('poster')">我发布的</view>
        <view v-if="user?.courierVerified" class="tab" :class="{ active: roleTab === 'courier' }" @tap="switchRole('courier')">我接的单</view>
      </view>

      <view class="status-tabs">
        <view
          v-for="s in primaryStatusFilters"
          :key="s.value"
          class="status-tab"
          :class="{ active: statusFilter === s.value }"
          @tap="setStatusFilter(s.value)"
        >{{ s.label }}</view>
      </view>
      <view v-if="roleTab === 'poster'" class="status-tabs status-tabs--extra">
        <view
          v-for="s in posterExtraFilters"
          :key="s.value"
          class="status-tab"
          :class="{ active: statusFilter === s.value }"
          @tap="setStatusFilter(s.value)"
        >{{ s.label }}</view>
      </view>
    </view>

    <scroll-view scroll-y class="orders-scroll" enable-back-to-top>
      <view class="orders-body">
        <ListCardSkeleton v-if="loading && !orders.length" :count="4" />
        <LoadState
          v-else
          :loading="false"
          :error="loadError"
          :has-data="orders.length > 0"
          empty-text="暂无订单"
          @retry="load"
        />
        <DeliveryOrderCard
          v-for="item in orders"
          :key="item._id"
          :type-label="typeLabel(item.type)"
          :status-label="statusLabel(item)"
          :status-class="statusClass(item)"
          :fee="item.fee"
          :title="item.title || typeLabel(item.type)"
          show-time-row
          :delivery-time-label="item.deliveryTimeLabel"
          :actual-delivery-label="item.actualDeliveryLabel"
          :warn-text="roleTab === 'courier' && item.deliveryOverdue ? '配送已超时' : ''"
          :pickup-address="item.pickupAddress"
          :dropoff-address="item.dropoffAddress"
          :info-lines="orderInfoLines(item)"
          :description="item.description"
          :remark="item.remark"
          :zone-name="item.zoneId?.name"
          :created-at="formatTime(item.createdAt)"
        >
          <template #actions>
            <button v-if="peerPhone(item)" size="mini" @tap="callPhone(peerPhone(item))">联系对方</button>
            <button v-if="canRepost(item)" size="mini" @tap="goRepost(item)">修改</button>
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
          </template>
        </DeliveryOrderCard>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMyDeliveryOrders, updateDeliveryOrderStatus } from '@/api/delivery'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify } from '@/utils/verify'
import { onWs, offWs } from '@/utils/ws'
import { WS_EVENTS } from '@/utils/wsEvents'
import {
  DELIVERY_ORDER_TYPES,
  DELIVERY_PRIMARY_STATUS_FILTERS,
  DELIVERY_POSTER_EXTRA_FILTERS,
  deliveryOrderStatusLabel,
  deliveryStatusClass,
  labelOf,
} from '@/constants/delivery'
import { formatTime } from '@/utils/format'
import { saveRepostDraft } from '@/utils/deliveryRepost'
import LoadState from '@/components/LoadState.vue'
import ListCardSkeleton from '@/components/ListCardSkeleton.vue'
import DeliveryOrderCard from '@/components/DeliveryOrderCard.vue'

const user = ref(null)
const loading = ref(false)
const loadError = ref('')
const orders = ref([])
const roleTab = ref('poster')
const statusFilter = ref('')
const primaryStatusFilters = DELIVERY_PRIMARY_STATUS_FILTERS
const posterExtraFilters = DELIVERY_POSTER_EXTRA_FILTERS
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

function switchRole(r) {
  roleTab.value = r
  if (r === 'courier' && statusFilter.value === 'acceptExpired') {
    statusFilter.value = ''
  }
  load()
}

function setStatusFilter(val) {
  statusFilter.value = val
  load()
}

function typeLabel(type) {
  return labelOf(DELIVERY_ORDER_TYPES, type)
}

function statusLabel(item) {
  return deliveryOrderStatusLabel(item)
}

function statusClass(item) {
  return deliveryStatusClass(item)
}

function peerPhone(item) {
  if (roleTab.value === 'poster') {
    return item.courierId?.phone || ''
  }
  return item.contactPhone || item.posterId?.phone || ''
}

function orderInfoLines(item) {
  const lines = []
  if (item.contactPhone && roleTab.value === 'courier') {
    lines.push({ label: '电话', value: item.contactPhone })
  }
  if (item.courierId && roleTab.value === 'poster') {
    lines.push({ label: '骑手', value: item.courierId?.nickname || item.courierId?.phone || '—' })
  }
  if (item.posterId && roleTab.value === 'courier') {
    lines.push({ label: '发布人', value: item.posterId?.nickname || item.posterId?.phone || '—' })
  }
  return lines
}

function canCancel(item) {
  if (item.acceptExpired || item.systemAcceptExpired) return false
  return ['open', 'accepted'].includes(item.status) &&
    (roleTab.value === 'poster' || (roleTab.value === 'courier' && item.courierId))
}

function canRepost(item) {
  return roleTab.value === 'poster' && item.status === 'cancelled'
}

function goRepost(item) {
  saveRepostDraft(item)
  uni.navigateTo({ url: '/pages/delivery/post' })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const params = { role: roleTab.value, pageSize: 50 }
    if (statusFilter.value === 'acceptExpired') {
      params.acceptExpired = true
    } else if (statusFilter.value) {
      params.status = statusFilter.value
    }
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
.page-delivery-orders {
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
.tab { flex: 1; text-align: center; padding: 16rpx; background: #fff; border-radius: 12rpx; font-size: 28rpx; }
.tab.active { background: #409eff; color: #fff; }
.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.status-tabs--extra {
  margin-top: 12rpx;
}
.status-tab {
  padding: 8rpx 20rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
}
.status-tab.active { background: #ecf5ff; color: #409eff; }
.tag.primary { background: #ecf5ff; color: #409eff; }
.tag.danger { background: #fef0f0; color: #f56c6c; }
</style>
