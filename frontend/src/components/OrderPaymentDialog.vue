<template>
  <el-dialog
    :model-value="modelValue"
    title="订单付款"
    width="420px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @open="onOpen"
    @closed="onClosed"
  >
    <p class="pay-amount">应付：<strong>¥{{ order?.price }}</strong></p>

    <el-tabs v-model="payTab" class="pay-tabs">
      <el-tab-pane v-if="paymentConfig.enabled" label="在线支付" name="online">
        <p v-if="paymentConfig.mode === 'sandbox'" class="sandbox-tip">
          当前为<strong>沙箱模式</strong>，可模拟微信/支付宝付款，无需真实商户号。
          个体户与域名就绪后，将 <code>PAYMENT_MODE</code> 改为 live 并填写商户配置。
        </p>
        <p v-if="paymentConfig.tip" class="sandbox-tip muted-tip">{{ paymentConfig.tip }}</p>
        <p v-if="paymentConfig.enabled && !paymentConfig.domainReady" class="sandbox-tip muted-tip">
          正式回调域名未就绪（可先沙箱联调）。买好域名 HTTPS 后配置
          <code>PAYMENT_NOTIFY_BASE_URL</code>。
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

          <div v-if="qrDataUrl" class="qr-box">
            <img :src="qrDataUrl" alt="微信支付二维码" class="pay-qr-native" />
            <p class="qr-tip">请使用微信扫一扫完成支付</p>
            <p v-if="polling" class="qr-wait">等待支付结果…</p>
          </div>

          <el-button
            v-if="paymentConfig.sandboxSimulate"
            type="primary"
            class="simulate-btn"
            :loading="paying"
            @click="doSimulatePay"
          >
            模拟支付成功
          </el-button>
          <el-button
            v-if="activePayment.payUrl && paymentConfig.sandboxSimulate"
            link
            type="primary"
            @click="openPayUrl"
          >
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
import QRCode from 'qrcode'
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
const qrDataUrl = ref('')
const polling = ref(false)
let pollTimer = null

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

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  polling.value = false
}

async function renderQr(content) {
  if (!content || String(content).startsWith('SANDBOX|')) {
    qrDataUrl.value = ''
    return
  }
  try {
    qrDataUrl.value = await QRCode.toDataURL(String(content), {
      width: 220,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
    })
  } catch {
    qrDataUrl.value = ''
    ElMessage.error('生成支付二维码失败')
  }
}

function startPolling(paymentNo) {
  stopPolling()
  if (!paymentNo) return
  polling.value = true
  pollTimer = setInterval(async () => {
    try {
      const tx = await paymentApi.getPaymentDetail(paymentNo)
      if (tx?.status === 'paid') {
        stopPolling()
        ElMessage.success('支付成功')
        emit('paid')
        emit('update:modelValue', false)
      } else if (tx?.status === 'expired' || tx?.status === 'cancelled') {
        stopPolling()
        ElMessage.warning(tx.status === 'expired' ? '支付单已过期' : '支付单已取消')
      }
    } catch {
      /* 轮询失败忽略，下一轮再试 */
    }
  }, 2500)
}

async function applyPaymentResult(res) {
  const payment = res?.payment || res
  activePayment.value = payment
  const action = res?.clientAction
  const content = payment?.qrContent
  if (action === 'scanQr' || (content && !paymentConfig.value.sandboxSimulate)) {
    await renderQr(content)
    startPolling(payment.paymentNo)
  } else {
    qrDataUrl.value = ''
    stopPolling()
  }
}

async function onOpen() {
  activePayment.value = null
  qrDataUrl.value = ''
  stopPolling()
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
        await applyPaymentResult(res)
      }
    }
  } catch (e) {
    ElMessage.error(e.message || '加载支付配置失败')
  }
}

function onClosed() {
  stopPolling()
  qrDataUrl.value = ''
  activePayment.value = null
}

async function createPayment() {
  if (!props.order?._id || !channel.value) return
  creating.value = true
  try {
    // PC 网页微信一律走 Native 扫码（沙箱后端会忽略并仍可模拟）
    const payload = {
      channel: channel.value,
      ...(channel.value === 'wechat' ? { scene: 'native' } : {}),
    }
    const res = await paymentApi.createOrderPayment(props.order._id, payload)
    await applyPaymentResult(res)
    ElMessage.success(res.clientAction === 'scanQr' ? '请扫码支付' : '支付单已创建')
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
    stopPolling()
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
.sandbox-tip.muted-tip {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 8px 10px;
  border-radius: 6px;
}
.channel-group { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.channel-group :deep(.el-radio) { margin-right: 0; width: 100%; }
.active-payment { margin-top: 16px; }
.expire { margin: 8px 0 0; font-size: 12px; }
.simulate-btn, .create-btn { width: 100%; margin-top: 12px; }
.pay-qr { width: 100%; max-width: 240px; display: block; margin: 0 auto; border-radius: 8px; }
.pay-tip { text-align: center; font-size: 13px; color: var(--app-muted); margin-top: 12px; }
.qr-box {
  margin-top: 16px;
  text-align: center;
}
.pay-qr-native {
  width: 220px;
  height: 220px;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
  background: #fff;
}
.qr-tip {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
}
.qr-wait {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
