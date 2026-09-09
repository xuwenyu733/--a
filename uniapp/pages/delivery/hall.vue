<template>
  <view class="page-hall">
    <view v-if="!user?.courierVerified" class="header-bar">
      <view class="card tip warning">
        <text class="tip-title">您还不是认证骑手</text>
        <text class="tip-desc">完成骑手认证并通过审核后，方可浏览和接取订单。</text>
        <button size="mini" type="primary" @tap="goVerify">去申请骑手</button>
      </view>
    </view>

    <template v-else>
      <view class="header-bar">
        <view class="filters-row">
          <picker class="filter-picker" :range="zoneFilterLabels" @change="onZoneFilter">
            <view class="filter-chip">
              <text class="filter-chip-text">{{ zoneFilterLabels[zoneFilterIndex] }}</text>
              <text class="filter-chip-arrow">▾</text>
            </view>
          </picker>
          <picker class="filter-picker" :range="typeFilterLabels" @change="onTypeFilter">
            <view class="filter-chip">
              <text class="filter-chip-text">{{ typeFilterLabels[typeFilterIndex] }}</text>
              <text class="filter-chip-arrow">▾</text>
            </view>
          </picker>
          <view class="filter-chip filter-chip--action" @tap="load">
            <text class="filter-chip-text">{{ loading ? '刷新中…' : '刷新' }}</text>
          </view>
        </view>
        <picker class="time-filter-picker" :range="timeFilterLabels" @change="onTimeFilter">
          <view class="filter-chip filter-chip--time">
            <text class="filter-chip-text">{{ timeFilterLabels[timeFilterIndex] }}</text>
            <text class="filter-chip-arrow">▾</text>
          </view>
        </picker>
      </view>

      <scroll-view scroll-y class="hall-scroll" enable-back-to-top>
        <view class="hall-body">
      <LoadState
        :loading="loading"
        :error="loadError"
        :has-data="orders.length > 0"
        empty-text="暂无待接订单，稍后再来看看"
        :empty-hint="emptyHint"
        @retry="load"
      />
      <view v-for="item in orders" :key="item._id" class="card order-card" :class="{ 'order-card--own': item.isOwnOrder }">
        <view class="head">
          <text class="tag">{{ typeLabel(item.type) }}</text>
          <text v-if="item.isOwnOrder" class="own-tag">我发布的</text>
          <text class="price">¥{{ item.fee }}</text>
          <text class="muted zone">{{ item.zoneId?.name }}</text>
        </view>
        <text class="title">{{ item.title || typeLabel(item.type) }}</text>
        <text v-if="item.deliveryTimeLabel" class="line time-label">预计送达：{{ item.deliveryTimeLabel }}</text>
        <text class="line">取：{{ item.pickupAddress }}</text>
        <text class="line">送：{{ item.dropoffAddress }}</text>
        <text v-if="item.isOwnOrder" class="line own-hint">这是您发布的委托，无法自行接单</text>
        <text v-else-if="item.contactPhone" class="line">联系发布人：{{ item.contactPhone }}</text>
        <text v-if="item.description" class="desc muted">{{ item.description }}</text>
        <view class="foot">
          <text class="muted">{{ formatTime(item.createdAt) }}</text>
          <view class="foot-actions">
            <button v-if="!item.isOwnOrder && item.contactPhone" size="mini" @tap="callPhone(item.contactPhone)">致电</button>
            <button
              v-if="item.isOwnOrder"
              size="mini"
              disabled
            >不可接单</button>
            <button
              v-else
              size="mini"
              type="primary"
              :loading="acceptingId === item._id"
              @tap="confirmAccept(item)"
            >接单</button>
          </view>
        </view>
      </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getOpenDeliveryOrders, getDeliveryZones, acceptDeliveryOrder } from '@/api/delivery'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify } from '@/utils/verify'
import { DELIVERY_ORDER_TYPES, labelOf } from '@/constants/delivery'
import { formatTime } from '@/utils/format'
import { buildHallDeliveryTimeFilterOptions, hallTimeFilterParams } from '@/utils/deliveryTime'
import LoadState from '@/components/LoadState.vue'

const user = ref(null)
const loading = ref(false)
const loadError = ref('')
const acceptingId = ref('')
const orders = ref([])
const zones = ref([])
const filterZoneId = ref('')
const filterType = ref('')
const zoneFilterIndex = ref(0)
const typeFilterIndex = ref(0)
const timeFilterOptions = ref([])
const timeFilterIndex = ref(0)
const zoneFilterLabels = computed(() => ['全部区域', ...zones.value.map((z) => z.name)])
const typeFilterLabels = computed(() => ['全部类型', ...DELIVERY_ORDER_TYPES.map((t) => t.label)])
const timeFilterLabels = computed(() => timeFilterOptions.value.map((o) => o.label))
const hasActiveFilters = computed(() =>
  !!filterZoneId.value || !!filterType.value || timeFilterIndex.value > 0
)
const emptyHint = computed(() => {
  if (orders.value.length > 0) return ''
  const hints = []
  if (hasActiveFilters.value) {
    hints.push('可尝试切换为「全部区域 / 全部类型 / 全部时段」')
  } else {
    hints.push('超时未接单的订单会被系统自动取消')
  }
  return hints.join('；')
})

function refreshTimeFilterOptions() {
  timeFilterOptions.value = buildHallDeliveryTimeFilterOptions(new Date())
  if (timeFilterIndex.value >= timeFilterOptions.value.length) timeFilterIndex.value = 0
}

onShow(async () => {
  if (!ensureLogin()) return
  refreshTimeFilterOptions()
  const data = await refreshUserAndVerify()
  user.value = data.user
  const regionId = user.value?.regionId?._id || user.value?.regionId
  if (regionId) {
    try {
      zones.value = (await getDeliveryZones(regionId)) || []
    } catch {
      zones.value = []
    }
  } else {
    zones.value = []
  }
  zoneFilterIndex.value = 0
  filterZoneId.value = ''
  typeFilterIndex.value = 0
  filterType.value = ''
  timeFilterIndex.value = 0
  if (user.value?.courierVerified) load()
})

function typeLabel(type) {
  return labelOf(DELIVERY_ORDER_TYPES, type)
}

function onZoneFilter(e) {
  zoneFilterIndex.value = Number(e.detail.value)
  filterZoneId.value = zoneFilterIndex.value === 0 ? '' : zones.value[zoneFilterIndex.value - 1]?._id
  load()
}

function onTypeFilter(e) {
  typeFilterIndex.value = Number(e.detail.value)
  filterType.value = typeFilterIndex.value === 0 ? '' : DELIVERY_ORDER_TYPES[typeFilterIndex.value - 1]?.value
  load()
}

function onTimeFilter(e) {
  timeFilterIndex.value = Number(e.detail.value)
  load()
}

async function load() {
  if (!user.value?.courierVerified) return
  loading.value = true
  loadError.value = ''
  try {
    const params = { pageSize: 30 }
    if (filterZoneId.value) params.zoneId = filterZoneId.value
    if (filterType.value) params.type = filterType.value
    Object.assign(params, hallTimeFilterParams(timeFilterOptions.value[timeFilterIndex.value]))
    const res = await getOpenDeliveryOrders(params)
    orders.value = res.list || []
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function confirmAccept(item) {
  if (item.isOwnOrder) {
    uni.showToast({ title: '不能接自己发布的订单', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认接单',
    content: `酬劳 ¥${item.fee}，确认接取该订单？`,
    success: (res) => {
      if (res.confirm) accept(item)
    },
  })
}

async function accept(item) {
  acceptingId.value = item._id
  try {
    await acceptDeliveryOrder(item._id)
    uni.showToast({ title: '接单成功', icon: 'success' })
    uni.redirectTo({ url: '/pages/delivery/orders?role=courier' })
  } catch (e) {
    uni.showToast({ title: e.message || '接单失败', icon: 'none' })
    load()
  } finally {
    acceptingId.value = ''
  }
}

function callPhone(phone) {
  if (!phone) return
  uni.makePhoneCall({ phoneNumber: String(phone) })
}

function goVerify() {
  uni.navigateTo({ url: '/pages/user/verify-courier' })
}
</script>

<style lang="scss" scoped>
.page-hall {
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

.hall-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.hall-body {
  padding: 0 24rpx 24rpx;
  box-sizing: border-box;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: nowrap;
  margin-bottom: 12rpx;
}

.time-filter-picker {
  width: 100%;
}

.filter-chip--time {
  width: 100%;
  box-sizing: border-box;
}

.filter-picker {
  flex: 1;
  min-width: 0;
}

.filter-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 14rpx 20rpx;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.filter-chip-text {
  font-size: 26rpx;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180rpx;
}

.filter-chip-arrow {
  font-size: 20rpx;
  color: #909399;
  flex-shrink: 0;
}

.filter-chip--action {
  flex-shrink: 0;
  background: #ecf5ff;
}

.filter-chip--action .filter-chip-text {
  color: #409eff;
  font-weight: 500;
  max-width: none;
}

.tip { display: flex; flex-direction: column; gap: 12rpx; background: #fdf6ec; color: #e6a23c; margin-bottom: 0; }
.tip-title { font-weight: 600; font-size: 30rpx; }
.tip-desc { font-size: 26rpx; }
.order-card--own { background: #f5f7fa; border: 1rpx solid #e4e7ed; }
.own-tag { background: #909399; color: #fff; font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.own-hint { color: #909399; font-size: 24rpx; }
.order-card .head { display: flex; gap: 12rpx; align-items: center; margin-bottom: 12rpx; flex-wrap: wrap; }
.order-card .title { display: block; font-weight: 600; font-size: 30rpx; margin-bottom: 8rpx; }
.line { display: block; font-size: 26rpx; margin-bottom: 6rpx; }
.time-label { color: #409eff; font-weight: 500; }
.desc { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.5; }
.foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; gap: 12rpx; }
.foot-actions { display: flex; gap: 12rpx; }
.price { color: #f56c6c; font-weight: 700; }
.zone { margin-left: auto; font-size: 24rpx; }
</style>
