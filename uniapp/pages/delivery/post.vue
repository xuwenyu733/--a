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
      <view class="presets-section">
        <text class="label">快捷预设</text>
        <scroll-view scroll-x class="presets-scroll" :show-scrollbar="false">
          <view class="presets-row">
            <view
              v-for="item in presets"
              :key="item.id"
              class="preset-card"
              @tap="applyPreset(item)"
              @longpress="openPresetMenu(item)"
            >
              <text class="preset-name">{{ item.name }}</text>
              <text class="preset-hint">点击填写</text>
              <view class="preset-edit" @tap.stop="openRename(item)">✎</view>
            </view>
            <view
              v-if="presets.length < MAX_PRESETS"
              class="preset-card preset-add"
              @tap="openAddPreset"
            >
              <text class="preset-add-icon">+</text>
              <text class="preset-hint">添加预设</text>
            </view>
          </view>
        </scroll-view>
        <text class="presets-tip muted">长按预设可重命名或删除，最多保存 {{ MAX_PRESETS }} 个</text>
      </view>

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

      <text class="label">预计送达 *</text>
      <picker :range="timeOptionLabels" @change="onTimeChange">
        <view class="picker">{{ selectedTimeLabel || '请选择送达时段' }}</view>
      </picker>
      <text v-if="!timeOptions.length" class="presets-tip muted">当前无可选时段，请稍后再试（服务时间 8:00-22:00）</text>

      <text class="label">详细说明</text>
      <textarea class="textarea" v-model="form.description" placeholder="取件码、快递单号、注意事项等" />

      <text class="label">备注</text>
      <input class="input" v-model="form.remark" placeholder="可选" />

      <button type="primary" :loading="loading" @tap="submit">发布订单</button>
    </view>

    <view v-if="nameModal.visible" class="modal-mask" @tap="closeNameModal">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">{{ nameModal.title }}</text>
        <input
          class="input modal-input"
          v-model="nameModal.value"
          :placeholder="nameModal.placeholder"
          maxlength="20"
          focus
        />
        <view class="modal-actions">
          <view class="modal-btn" @tap="closeNameModal">取消</view>
          <view class="modal-btn modal-btn-primary" @tap="confirmNameModal">确定</view>
        </view>
      </view>
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
import {
  MAX_DELIVERY_PRESETS,
  applyPresetToForm,
  buildPreset,
  canSaveAsPreset,
  loadDeliveryPresets,
  renamePreset,
  saveDeliveryPresets,
} from '@/utils/deliveryPresets'
import { buildDeliveryTimeOptions, deliveryTimePayloadFromOption, DELIVERY_TIME_TYPE } from '@/utils/deliveryTime'
import { consumeRepostDraft } from '@/utils/deliveryRepost'

const MAX_PRESETS = MAX_DELIVERY_PRESETS
const loading = ref(false)
const zonesLoaded = ref(false)
const zonesError = ref('')
const zones = ref([])
const regionId = ref('')
const userId = ref('')
const zoneIndex = ref(0)
const timeOptions = ref([])
const timeIndex = ref(0)
const presets = ref([])
const repostFromOrders = ref(false)
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

const nameModal = ref({
  visible: false,
  mode: 'add',
  title: '',
  placeholder: '',
  value: '',
  presetId: '',
})

const zoneNames = computed(() => zones.value.map((z) => z.name))
const timeOptionLabels = computed(() => timeOptions.value.map((o) => o.label))
const selectedTimeLabel = computed(() => timeOptions.value[timeIndex.value]?.label || '')

function refreshTimeOptions() {
  timeOptions.value = buildDeliveryTimeOptions(new Date())
  if (timeIndex.value >= timeOptions.value.length) timeIndex.value = 0
}

function selectAsapTime() {
  refreshTimeOptions()
  const idx = timeOptions.value.findIndex((o) => o.type === DELIVERY_TIME_TYPE.ASAP)
  timeIndex.value = idx >= 0 ? idx : 0
}

function applyRepostDraft(draft) {
  form.value = {
    ...form.value,
    type: draft.type || form.value.type,
    zoneId: draft.zoneId || form.value.zoneId,
    title: draft.title || '',
    pickupAddress: draft.pickupAddress || '',
    dropoffAddress: draft.dropoffAddress || '',
    contactPhone: draft.contactPhone || form.value.contactPhone,
    fee: draft.fee || form.value.fee,
    description: draft.description || '',
    remark: draft.remark || '',
  }
  syncZonePicker(draft.zoneId)
  selectAsapTime()
}

onShow(init)

async function init() {
  if (!ensureLogin()) return
  const repostDraft = consumeRepostDraft()
  if (repostDraft?.fromOrders) repostFromOrders.value = true
  refreshTimeOptions()
  zonesLoaded.value = false
  zonesError.value = ''
  const { user } = await refreshUserAndVerify()
  userId.value = user?._id || ''
  form.value.contactPhone = form.value.contactPhone || user?.phone || ''
  regionId.value = user?.regionId?._id || user?.regionId || ''
  presets.value = loadDeliveryPresets(userId.value)
  if (!regionId.value) {
    zones.value = []
    zonesLoaded.value = true
    return
  }
  try {
    zones.value = (await getDeliveryZones(regionId.value)) || []
    if (zones.value.length && !form.value.zoneId) {
      form.value.zoneId = zones.value[0]._id
      zoneIndex.value = 0
    }
  } catch (e) {
    zonesError.value = e.message || '加载配送区域失败'
  } finally {
    zonesLoaded.value = true
    if (repostDraft) applyRepostDraft(repostDraft)
  }
}

function syncZonePicker(zoneId) {
  if (!zoneId || !zones.value.length) return
  const idx = zones.value.findIndex((z) => z._id === zoneId)
  if (idx >= 0) {
    zoneIndex.value = idx
    form.value.zoneId = zones.value[idx]._id
  }
}

function persistPresets(next) {
  presets.value = saveDeliveryPresets(userId.value, next)
}

function applyPreset(item) {
  form.value = applyPresetToForm(item, form.value)
  syncZonePicker(item.zoneId)
  uni.showToast({ title: '已填入预设', icon: 'success' })
}

function openAddPreset() {
  if (!canSaveAsPreset(form.value)) {
    uni.showToast({ title: '请先填写取件和送达地址', icon: 'none' })
    return
  }
  nameModal.value = {
    visible: true,
    mode: 'add',
    title: '添加预设',
    placeholder: '如：取外卖、取快递',
    value: form.value.title?.trim() || '',
    presetId: '',
  }
}

function openRename(item) {
  nameModal.value = {
    visible: true,
    mode: 'rename',
    title: '重命名预设',
    placeholder: '输入预设名称',
    value: item.name,
    presetId: item.id,
  }
}

function closeNameModal() {
  nameModal.value.visible = false
}

function confirmNameModal() {
  try {
    if (nameModal.value.mode === 'add') {
      const preset = buildPreset(nameModal.value.value, form.value)
      persistPresets([...presets.value, preset])
      uni.showToast({ title: '预设已保存', icon: 'success' })
    } else {
      persistPresets(renamePreset(presets.value, nameModal.value.presetId, nameModal.value.value))
      uni.showToast({ title: '已重命名', icon: 'success' })
    }
    closeNameModal()
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

function openPresetMenu(item) {
  uni.showActionSheet({
    itemList: ['重命名', '删除预设'],
    success: (res) => {
      if (res.tapIndex === 0) openRename(item)
      else if (res.tapIndex === 1) deletePreset(item)
    },
  })
}

function deletePreset(item) {
  uni.showModal({
    title: '删除预设',
    content: `确定删除「${item.name}」？`,
    success: (res) => {
      if (!res.confirm) return
      persistPresets(presets.value.filter((p) => p.id !== item.id))
      uni.showToast({ title: '已删除', icon: 'none' })
    },
  })
}

function onType(e) { form.value.type = e.detail.value }
function onZone(e) {
  zoneIndex.value = Number(e.detail.value)
  form.value.zoneId = zones.value[zoneIndex.value]?._id || ''
}
function onTimeChange(e) {
  timeIndex.value = Number(e.detail.value)
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
  const timePayload = deliveryTimePayloadFromOption(timeOptions.value[timeIndex.value])
  if (!timePayload) {
    uni.showToast({ title: '请选择预计送达时间', icon: 'none' })
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
      ...timePayload,
    })
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => {
      if (repostFromOrders.value) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/delivery/orders?role=poster' })
      }
    }, 500)
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
.presets-section { margin-bottom: 24rpx; }
.presets-scroll { width: 100%; white-space: nowrap; }
.presets-row { display: inline-flex; gap: 16rpx; padding: 4rpx 0 8rpx; }
.preset-card {
  width: 200rpx;
  height: 140rpx;
  box-sizing: border-box;
  border: 1rpx solid #dcdfe6;
  border-radius: 16rpx;
  background: #f5f9ff;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  position: relative;
  flex-shrink: 0;
}
.preset-add {
  border-style: dashed;
  background: #fafafa;
}
.preset-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  max-width: 170rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-hint {
  font-size: 22rpx;
  color: #909399;
}
.preset-add-icon {
  font-size: 48rpx;
  color: #409eff;
  line-height: 1;
}
.preset-edit {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  font-size: 22rpx;
  color: #909399;
  padding: 4rpx 8rpx;
}
.presets-tip {
  display: block;
  font-size: 22rpx;
  margin-top: 8rpx;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  width: 620rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-sizing: border-box;
}
.modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
}
.modal-input { margin-bottom: 24rpx; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}
.modal-btn {
  min-width: 160rpx;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  text-align: center;
  border-radius: 8rpx;
  font-size: 28rpx;
  background: #f5f7fa;
  color: #606266;
}
.modal-btn-primary {
  background: #409eff;
  color: #fff;
}
</style>
