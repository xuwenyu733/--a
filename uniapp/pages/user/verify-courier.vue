<template>
  <view class="container">
    <LoadState
      v-if="loadError"
      :error="loadError"
      :has-data="false"
      :show-empty="false"
      @retry="refreshAll"
    />

    <view v-if="user?.courierVerified" class="card tip success">
      <text class="tip-title">✓ 您已是认证骑手</text>
      <text class="tip-desc">可进入接单大厅接取跑腿订单。</text>
      <view class="cta-row">
        <button size="mini" type="primary" @tap="goHall">进入接单大厅</button>
        <button size="mini" @tap="goDelivery">跑腿首页</button>
      </view>
    </view>

    <view v-else-if="roleBlocked" class="card tip warning">{{ roleBlocked }}</view>

    <view v-else-if="status?.courier?.status === 'pending'" class="card tip warning">
      <text class="tip-title">骑手申请审核中</text>
      <text class="tip-desc">管理员审核通过后即可接单。提交时间：{{ submitTime }}</text>
      <button size="mini" @tap="refreshAll">刷新状态</button>
    </view>

    <view v-else-if="status?.courier?.status === 'rejected'" class="card tip danger">
      <text class="tip-title">申请被拒绝</text>
      <text class="tip-desc">原因：{{ status.courier.rejectReason || '无' }}。请修改后重新提交。</text>
    </view>

    <view v-else-if="needSyncApproved" class="card tip success">
      <text class="tip-title">审核已通过</text>
      <text class="tip-desc">请点击刷新同步骑手认证状态。</text>
      <button size="mini" type="primary" @tap="refreshAll">刷新认证状态</button>
    </view>

    <view v-if="!zones.length && showForm" class="card tip warning">
      当前校区尚未配置配送区域，请联系管理员或区域代理初始化后再申请。
    </view>

    <view v-if="showForm" class="card">
      <text class="section-title">骑手认证</text>
      <text class="intro muted">认证后可：</text>
      <view class="benefits">
        <text v-for="(b, i) in benefits" :key="i" class="benefit">· {{ b }}</text>
      </view>

      <text class="label">真实姓名 *</text>
      <input class="input" v-model="form.realName" placeholder="与证件一致" />
      <text class="label">联系电话</text>
      <input class="input" type="number" v-model="form.contactPhone" :placeholder="user?.phone || ''" />

      <text class="label">服务类型</text>
      <checkbox-group @change="onServiceTypes">
        <label v-for="t in COURIER_SERVICE_TYPES" :key="t.value" class="check-row">
          <checkbox :value="t.value" :checked="form.serviceTypes.includes(t.value)" /> {{ t.label }}
        </label>
      </checkbox-group>

      <text class="label">服务区域（不选则服务全校配送区）</text>
      <checkbox-group v-if="zones.length" @change="onZones">
        <label v-for="z in zones" :key="z._id" class="check-row">
          <checkbox :value="z._id" :checked="form.allowedZoneIds.includes(z._id)" /> {{ z.name }}
        </label>
      </checkbox-group>
      <text v-else class="muted">暂无可用区域</text>

      <text class="label">个人简介</text>
      <textarea class="textarea" v-model="form.intro" placeholder="可选：空闲时间、配送经验等" />

      <button type="primary" :loading="loading" :disabled="!zones.length" @tap="submit">提交骑手申请</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { submitCourierVerify } from '@/api/user'
import { getDeliveryZones } from '@/api/delivery'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify, formatVerifyTime } from '@/utils/verify'
import { COURIER_VERIFY_BENEFITS } from '@/constants/verify'
import { COURIER_SERVICE_TYPES } from '@/constants/delivery'
import LoadState from '@/components/LoadState.vue'

const loading = ref(false)
const loadError = ref('')
const status = ref(null)
const user = ref(null)
const zones = ref([])
const form = ref({
  realName: '',
  contactPhone: '',
  serviceTypes: ['food', 'express'],
  allowedZoneIds: [],
  intro: '',
})
const benefits = COURIER_VERIFY_BENEFITS

const roleBlocked = computed(() => {
  const role = user.value?.role
  if (role === 'super_admin' || role === 'regional_agent') return '当前账号类型不可申请骑手。'
  if (!user.value?.regionId) return '账号未绑定校区，请联系管理员完善所属校区后再申请。'
  return ''
})

const needSyncApproved = computed(
  () => status.value?.courier?.status === 'approved' && !user.value?.courierVerified
)

const showForm = computed(
  () => !user.value?.courierVerified && !roleBlocked.value && status.value?.courier?.status !== 'pending'
)

const submitTime = computed(() => formatVerifyTime(status.value?.courier?.createdAt))

onShow(refreshAll)

async function refreshAll() {
  if (!ensureLogin()) return
  loadError.value = ''
  try {
    const data = await refreshUserAndVerify()
    user.value = data.user
    status.value = data.status
    if (data.verifyError) loadError.value = data.verifyError
    if (!form.value.contactPhone) form.value.contactPhone = user.value?.phone || ''
    await loadZones()
    prefillForm()
    if (user.value?.courierVerified) {
      uni.showToast({ title: '骑手认证已生效', icon: 'success' })
    }
  } catch (e) {
    loadError.value = e.message || '加载失败'
  }
}

async function loadZones() {
  const regionId = user.value?.regionId?._id || user.value?.regionId
  if (!regionId) {
    zones.value = []
    return
  }
  try {
    zones.value = (await getDeliveryZones(regionId)) || []
  } catch {
    zones.value = []
  }
}

function prefillForm() {
  const payload = status.value?.courier?.payload
  if (!payload || status.value?.courier?.status === 'pending') return
  form.value = {
    realName: payload.realName || '',
    contactPhone: payload.contactPhone || user.value?.phone || '',
    serviceTypes: payload.serviceTypes?.length ? payload.serviceTypes : ['food', 'express'],
    allowedZoneIds: payload.allowedZoneIds || [],
    intro: payload.intro || '',
  }
}

function onServiceTypes(e) {
  form.value.serviceTypes = e.detail.value
}

function onZones(e) {
  form.value.allowedZoneIds = e.detail.value
}

async function submit() {
  if (!form.value.realName?.trim()) {
    uni.showToast({ title: '请填写真实姓名', icon: 'none' })
    return
  }
  if (!form.value.serviceTypes.length) {
    uni.showToast({ title: '请至少选择一种服务类型', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await submitCourierVerify({
      ...form.value,
      contactPhone: form.value.contactPhone?.trim() || user.value?.phone,
    })
    uni.showToast({ title: '已提交，等待审核', icon: 'success' })
    await refreshAll()
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goHall() {
  uni.navigateTo({ url: '/pages/delivery/hall' })
}

function goDelivery() {
  uni.navigateTo({ url: '/pages/delivery/index' })
}
</script>

<style lang="scss" scoped>
.tip { font-size: 28rpx; line-height: 1.5; margin-bottom: 24rpx; display: flex; flex-direction: column; }
.tip.success { background: #f0f9eb; color: #67c23a; }
.tip.warning { background: #fdf6ec; color: #e6a23c; }
.tip.danger { background: #fef0f0; color: #f56c6c; }
.tip-title { font-weight: 600; font-size: 30rpx; margin-bottom: 8rpx; }
.tip-desc { font-size: 26rpx; }
.cta-row { display: flex; flex-direction: row; margin-top: 8rpx; }
.cta-row button { margin-right: 16rpx; }
.intro { display: block; margin: 12rpx 0; }
.benefits { margin-bottom: 16rpx; }
.benefit { display: block; font-size: 26rpx; color: #606266; line-height: 1.8; }
.check-row { display: block; padding: 12rpx 0; font-size: 28rpx; }
button[type='primary'] { margin-top: 32rpx; background: #409eff; }
</style>
