<template>
  <view class="container">
    <view v-if="!zonesLoaded" class="empty">加载区域中…</view>

    <LoadState
      v-else-if="zonesError"
      :error="zonesError"
      :has-data="false"
      :show-empty="false"
      @retry="init"
    />

    <view v-else-if="!regionId" class="card tip warning">
      账号未绑定校区，无法发布跑腿。请联系管理员完善所属校区。
    </view>

    <view v-else-if="!zones.length" class="card tip warning">
      当前校区尚未配置配送区域，请联系管理员或区域代理初始化。
    </view>

    <view v-else class="card">
      <text class="label">类型 *</text>
      <radio-group @change="onType">
        <label v-for="t in DELIVERY_ORDER_TYPES" :key="t.value" class="radio-row">
          <radio :value="t.value" :checked="form.type === t.value" /> {{ t.label }}
        </label>
      </radio-group>

      <text class="label">配送区域 *</text>
      <picker :range="zoneNames" @change="onZone">
        <view class="picker">{{ zoneNames[zoneIndex] || '请选择' }}</view>
      </picker>

      <text class="label">标题</text>
      <input class="input" v-model="form.title" placeholder="如：南门取外卖送到1号公寓" maxlength="60" />

      <text class="label">取件地址 *</text>
      <input class="input" v-model="form.pickupAddress" placeholder="如：南门美团外卖柜" />

      <text class="label">送达地址 *</text>
      <input class="input" v-model="form.dropoffAddress" placeholder="如：1号公寓 302" />

      <text class="label">联系电话 *</text>
      <input class="input" type="number" maxlength="11" v-model="form.contactPhone" placeholder="骑手联系用" />

      <text class="label">酬劳(元) *</text>
      <input class="input" type="digit" v-model="form.fee" placeholder="1～500" />

      <text class="label">详细说明</text>
      <textarea class="textarea" v-model="form.description" placeholder="取件码、快递单号、注意事项等" />

      <text class="label">备注</text>
      <input class="input" v-model="form.remark" placeholder="可选" />

      <button type="primary" :loading="loading" @tap="submit">发布订单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getDeliveryZones, createDeliveryOrder } from '@/api/delivery'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify } from '@/utils/verify'
import { DELIVERY_ORDER_TYPES } from '@/constants/delivery'
import LoadState from '@/components/LoadState.vue'

const loading = ref(false)
const zonesLoaded = ref(false)
const zonesError = ref('')
const zones = ref([])
const regionId = ref('')
const zoneIndex = ref(0)
const form = ref({
  type: 'food',
  zoneId: '',
  title: '',
  pickupAddress: '',
  dropoffAddress: '',
  contactPhone: '',
  fee: '5',
  description: '',
  remark: '',
})

const zoneNames = computed(() => zones.value.map((z) => z.name))

onShow(init)

async function init() {
  if (!ensureLogin()) return
  zonesLoaded.value = false
  zonesError.value = ''
  const { user } = await refreshUserAndVerify()
  form.value.contactPhone = form.value.contactPhone || user?.phone || ''
  regionId.value = user?.regionId?._id || user?.regionId || ''
  if (!regionId.value) {
    zones.value = []
    zonesLoaded.value = true
    return
  }
  try {
    zones.value = (await getDeliveryZones(regionId.value)) || []
    if (zones.value.length) {
      form.value.zoneId = zones.value[0]._id
      zoneIndex.value = 0
    }
  } catch (e) {
    zonesError.value = e.message || '加载配送区域失败'
  } finally {
    zonesLoaded.value = true
  }
}

function onType(e) { form.value.type = e.detail.value }
function onZone(e) {
  zoneIndex.value = Number(e.detail.value)
  form.value.zoneId = zones.value[zoneIndex.value]?._id || ''
}

async function submit() {
  if (!form.value.zoneId) {
    uni.showToast({ title: '请选择配送区域', icon: 'none' })
    return
  }
  if (!form.value.pickupAddress?.trim() || !form.value.dropoffAddress?.trim()) {
    uni.showToast({ title: '请填写取件和送达地址', icon: 'none' })
    return
  }
  const phone = form.value.contactPhone?.trim()
  if (!phone || phone.length < 11) {
    uni.showToast({ title: '请填写有效联系电话', icon: 'none' })
    return
  }
  const fee = Number(form.value.fee)
  if (!fee || fee < 1 || fee > 500) {
    uni.showToast({ title: '酬劳需在 1～500 元', icon: 'none' })
    return
  }

  loading.value = true
  try {
    await createDeliveryOrder({
      zoneId: form.value.zoneId,
      type: form.value.type,
      title: form.value.title.trim(),
      pickupAddress: form.value.pickupAddress.trim(),
      dropoffAddress: form.value.dropoffAddress.trim(),
      contactPhone: phone,
      fee,
      description: form.value.description.trim(),
      remark: form.value.remark.trim(),
    })
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/delivery/orders?role=poster' }), 500)
  } catch (e) {
    uni.showToast({ title: e.message || '发布失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.tip.warning { background: #fdf6ec; color: #e6a23c; font-size: 28rpx; line-height: 1.5; }
.radio-row { display: block; padding: 12rpx 0; }
button[type='primary'] { margin-top: 32rpx; background: #409eff; }
</style>
