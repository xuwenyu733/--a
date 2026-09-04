<template>
  <view class="container">
    <view v-if="!user?.courierVerified" class="card tip warning">
      <text class="tip-title">您还不是认证骑手</text>
      <text class="tip-desc">完成骑手认证并通过审核后，方可浏览和接取订单。</text>
      <button size="mini" type="primary" @tap="goVerify">去申请骑手</button>
    </view>

    <template v-else>
      <view class="filters card">
        <picker :range="zoneFilterLabels" @change="onZoneFilter">
          <view class="filter-btn">{{ zoneFilterLabels[zoneFilterIndex] }}</view>
        </picker>
        <picker :range="typeFilterLabels" @change="onTypeFilter">
          <view class="filter-btn">{{ typeFilterLabels[typeFilterIndex] }}</view>
        </picker>
        <button size="mini" :loading="loading" @tap="load">刷新</button>
      </view>

      <LoadState
        :loading="loading"
        :error="loadError"
        :has-data="orders.length > 0"
        empty-text="暂无待接订单，稍后再来看看"
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
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getOpenDeliveryOrders, getDeliveryZones, acceptDeliveryOrder } from '@/api/delivery'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify } from '@/utils/verify'
import { DELIVERY_ORDER_TYPES, labelOf } from '@/constants/delivery'
import { formatTime } from '@/utils/format'
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

const zoneFilterLabels = computed(() => ['全部区域', ...zones.value.map((z) => z.name)])
const typeFilterLabels = computed(() => ['全部类型', ...DELIVERY_ORDER_TYPES.map((t) => t.label)])

onShow(async () => {
  if (!ensureLogin()) return
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
  if (user.value?.courierVerified) load()
})

onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()))

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

async function load() {
  if (!user.value?.courierVerified) return
  loading.value = true
  loadError.value = ''
  try {
    const params = { pageSize: 30 }
    if (filterZoneId.value) params.zoneId = filterZoneId.value
    if (filterType.value) params.type = filterType.value
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
.tip { display: flex; flex-direction: column; gap: 12rpx; background: #fdf6ec; color: #e6a23c; }
.tip-title { font-weight: 600; font-size: 30rpx; }
.tip-desc { font-size: 26rpx; }
.filters { display: flex; gap: 12rpx; flex-wrap: wrap; align-items: center; margin-bottom: 16rpx; }
.filter-btn { background: #f5f7fa; padding: 12rpx 20rpx; border-radius: 8rpx; font-size: 26rpx; }
.order-card--own { background: #f5f7fa; border: 1rpx solid #e4e7ed; }
.own-tag { background: #909399; color: #fff; font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.own-hint { color: #909399; font-size: 24rpx; }
.order-card .head { display: flex; gap: 12rpx; align-items: center; margin-bottom: 12rpx; flex-wrap: wrap; }
.order-card .title { display: block; font-weight: 600; font-size: 30rpx; margin-bottom: 8rpx; }
.line { display: block; font-size: 26rpx; margin-bottom: 6rpx; }
.desc { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.5; }
.foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; gap: 12rpx; }
.foot-actions { display: flex; gap: 12rpx; }
.price { color: #f56c6c; font-weight: 700; }
.zone { margin-left: auto; font-size: 24rpx; }
</style>
