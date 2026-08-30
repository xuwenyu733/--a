<template>
  <el-dialog
    :model-value="modelValue"
    title="订单付款"
    width="420px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @open="onOpen"
  >
    <p class="pay-amount">应付：<strong>¥{{ order?.price }}</strong></p>

    <el-tabs v-model="payTab" class="pay-tabs">
      <el-tab-pane v-if="paymentConfig.enabled" label="在线支付" name="online">
        <p v-if="paymentConfig.mode === 'sandbox'" class="sandbox-tip">
          当前为<strong>沙箱模式</strong>，可模拟微信/支付宝付款，无需真实商户号。
        </p>
        <el-radio-group v-model="channel" class="channel-group">
          <el-radio
            v-for="c in paymentConfig.channels"
            :key="c.id"
            :value="c.id"
            :disabled="!c.available"
            border
          >
            {{ c.name }}
          </el-radio>
        </el-radio-group>

        <div v-if="activePayment" class="active-payment">
          <el-alert type="info" :closable="false" show-icon>
            <template #title>
              待支付 ¥{{ activePayment.amount }}（{{ channelLabel(activePayment.channel) }}）
            </template>
            <p class="expire">请在 {{ formatExpire(activePayment.expiredAt) }} 前完成</p>
          </el-alert>
          <el-button
            v-if="paymentConfig.sandboxSimulate"
            type="primary"
            class="simulate-btn"
            :loading="paying"
            @click="doSimulatePay"
          >
            模拟支付成功
          </el-button>
          <el-button v-if="activePayment.payUrl" link type="primary" @click="openPayUrl">
            打开沙箱支付页
          </el-button>
        </div>
        <el-button
          v-else
          type="primary"
          class="create-btn"
          :loading="creating"
          :disabled="!channel"
          @click="createPayment"
        >
          发起在线支付
        </el-button>
      </el-tab-pane>

      <el-tab-pane label="扫码付款" name="manual">
        <template v-if="order?.sellerId?.paymentQrUrl">
          <img :src="fileUrl(order.sellerId.paymentQrUrl)" alt="收款码" class="pay-qr" />
          <p class="pay-tip">请使用微信/支付宝扫码转账，付款后点击「我已付款」</p>
        </template>
        <el-empty v-else description="卖家尚未上传收款码，请通过聊天协商或改用在线支付" :image-size="64" />
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      <el-button
        v-if="payTab === 'manual' && canMarkManual"
        type="primary"
        :loading="marking"
        @click="$emit('mark-manual')"
      >
        我已付款
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as paymentApi from '@/api/payment'
import { getFileUrl } from '@/utils/fileUrl'

const props = defineProps({
  modelValue: Boolean,
  order: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'paid', 'mark-manual'])

const fileUrl = getFileUrl
const payTab = ref('online')
const channel = ref('wechat')
const paymentConfig = ref({
  enabled: false,
  mode: 'sandbox',
  channels: [],
  sandboxSimulate: true,
})
const activePayment = ref(null)
const creating = ref(false)
const paying = ref(false)
const marking = ref(false)

const canMarkManual = computed(() => {
  const s = props.order?.paymentStatus
  return s !== 'buyer_marked' && s !== 'seller_confirmed' && s !== 'paid_online'
})

function channelLabel(id) {
  return paymentConfig.value.channels.find((c) => c.id === id)?.name || id
}

function formatExpire(t) {
  if (!t) return '—'
  return new Date(t).toLocaleString('zh-CN')
}

async function onOpen() {
  activePayment.value = null
  try {
    paymentConfig.value = await paymentApi.getPaymentConfig()
    if (!paymentConfig.value.enabled) {
      payTab.value = 'manual'
    } else if (paymentConfig.value.channels?.length) {
      channel.value = paymentConfig.value.channels[0].id
    }
    if (props.order?._id) {
      const res = await paymentApi.getActiveOrderPayment(props.order._id)
      if (res.payment?.status === 'pending') {
        activePayment.value = res.payment
      }
    }
  } catch (e) {
    ElMessage.error(e.message || '加载支付配置失败')
  }
}

async function createPayment() {
  if (!props.order?._id || !channel.value) return
  creating.value = true
  try {
    const res = await paymentApi.createOrderPayment(props.order._id, { channel: channel.value })
    activePayment.value = res.payment
    ElMessage.success('支付单已创建')
  } catch (e) {
    ElMessage.error(e.message || '创建支付失败')
  } finally {
    creating.value = false
  }
}

async function doSimulatePay() {
  if (!activePayment.value?.paymentNo) return
  paying.value = true
  try {
    await paymentApi.simulatePayment(activePayment.value.paymentNo)
    ElMessage.success('支付成功')
    emit('paid')
    emit('update:modelValue', false)
  } catch (e) {
    ElMessage.error(e.message || '支付失败')
  } finally {
    paying.value = false
  }
}

function openPayUrl() {
  if (activePayment.value?.payUrl) {
    window.open(activePayment.value.payUrl, '_blank')
  }
}

defineExpose({ marking })
</script>

<style scoped>
.pay-amount { margin: 0 0 12px; }
.pay-tabs { margin-top: 4px; }
.sandbox-tip {
  font-size: 13px;
  color: var(--el-color-warning);
  margin: 0 0 12px;
  line-height: 1.5;
}
.channel-group { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.channel-group :deep(.el-radio) { margin-right: 0; width: 100%; }
.active-payment { margin-top: 16px; }
.expire { margin: 8px 0 0; font-size: 12px; }
.simulate-btn, .create-btn { width: 100%; margin-top: 12px; }
.pay-qr { width: 100%; max-width: 240px; display: block; margin: 0 auto; border-radius: 8px; }
.pay-tip { text-align: center; font-size: 13px; color: var(--app-muted); margin-top: 12px; }
</style>
