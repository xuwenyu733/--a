<template>
  <el-card>
    <template #header>我的订单</template>
    <el-tabs v-if="!sellOnly" v-model="roleTab" @tab-change="load">
      <el-tab-pane label="我买到的" name="buy" />
      <el-tab-pane label="我卖出的" name="sell" />
    </el-tabs>
    <el-tabs v-model="statusTab" type="card" class="status-tabs" @tab-change="load">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane label="待付款" name="confirmed" />
      <el-tab-pane label="已完成" name="completed" />
      <el-tab-pane label="已取消" name="cancelled" />
    </el-tabs>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <div v-loading="loading && list.length > 0" class="orders-wrap">
      <OrderListSkeleton v-if="loading && !list.length" />
      <RecycleScroller
        v-else-if="list.length"
        class="order-scroller"
        :items="list"
        :item-size="248"
        key-field="_id"
        v-slot="{ item: order }"
      >
        <div class="order-card">
          <div class="order-head">
            <el-tag :type="ORDER_STATUS_TYPE[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</el-tag>
            <span class="time">{{ formatTime(order.createdAt) }}</span>
          </div>
          <div class="order-body" @click="goProduct(order)">
            <img v-if="order.productId?.images?.[0]" :src="fileUrl(order.productId.images[0])" class="thumb" loading="lazy" decoding="async" />
            <div v-else class="thumb empty">图</div>
            <div class="info">
              <h4>{{ order.productId?.title }}</h4>
              <p class="price">¥{{ order.price }}</p>
              <p class="peer">
                {{ roleTab === 'buy' ? '卖家' : '买家' }}：
                {{ roleTab === 'buy' ? order.sellerId?.nickname : order.buyerId?.nickname }}
              </p>
              <p v-if="order.remark" class="remark">备注：{{ order.remark }}</p>
              <p
                v-if="order.paymentStatus && order.paymentStatus !== 'none' && PAYMENT_STATUS_LABELS[order.paymentStatus]"
                class="pay-hint"
              >{{ PAYMENT_STATUS_LABELS[order.paymentStatus] }}</p>
              <p v-if="order.reviewSummary?.theirReview" class="review-hint">
                对方评价：{{ order.reviewSummary.theirReview.rating }} 星
              </p>
            </div>
          </div>
          <div class="order-actions">
            <el-button size="small" @click="goChat(order)">联系对方</el-button>
            <template v-if="roleTab === 'sell' && order.status === 'confirmed' && order.paymentStatus === 'buyer_marked'">
              <el-button size="small" type="warning" @click="confirmPayment(order)">确认收到款</el-button>
            </template>
            <template v-if="roleTab === 'buy' && order.status === 'confirmed'">
              <el-button
                v-if="order.paymentStatus !== 'paid_online'"
                size="small"
                type="warning"
                @click="openPayDialog(order)"
              >去付款</el-button>
              <el-tag v-if="order.paymentStatus === 'paid_online'" size="small" type="success">已在线支付</el-tag>
              <el-tag v-else-if="order.paymentStatus === 'seller_confirmed'" size="small" type="success">卖家已确认收款</el-tag>
              <el-tag v-else-if="order.paymentStatus === 'buyer_marked'" size="small" type="success">已标记付款</el-tag>
            </template>
            <template v-if="order.status === 'confirmed' || order.status === 'pending'">
              <el-button size="small" type="success" @click="setStatus(order, 'completed')">确认完成</el-button>
              <el-button size="small" @click="setStatus(order, 'cancelled')">取消</el-button>
            </template>
            <template v-if="order.status === 'completed'">
              <el-button
                v-if="order.reviewSummary?.canReview"
                size="small"
                type="warning"
                @click="openReview(order)"
              >
                评价对方
              </el-button>
              <el-tag v-else-if="order.reviewSummary?.myReview" size="small" type="success">
                已评价 {{ order.reviewSummary.myReview.rating }} 星
              </el-tag>
            </template>
            <el-button
              v-if="order.status === 'completed' || order.status === 'cancelled'"
              size="small"
              type="info"
              plain
              @click="hideOrderRecord(order)"
            >删除记录</el-button>
          </div>
        </div>
      </RecycleScroller>
      <el-empty v-if="!loading && !error && !list.length" />
    </div>

    <el-dialog v-model="reviewVisible" title="评价交易对方" width="400px" destroy-on-close>
      <p class="review-target">
        评价对象：{{ reviewTargetName }}
      </p>
      <el-form label-position="top">
        <el-form-item label="评分" required>
          <el-rate v-model="reviewForm.rating" show-text :texts="rateTexts" />
        </el-form-item>
        <el-form-item label="评价内容（可选）">
          <el-input
            v-model="reviewForm.content"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="描述交易体验，帮助其他同学参考"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewSubmitting" @click="submitReview">提交评价</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="confirmVisible"
      :title="confirmTitle"
      width="400px"
      align-center
      destroy-on-close
      class="order-confirm-dialog"
    >
      <p class="confirm-body">{{ confirmMessage }}</p>
      <template #footer>
        <el-button @click="confirmVisible = false">再想想</el-button>
        <el-button
          :type="confirmButtonType"
          :loading="confirmLoading"
          @click="runConfirmAction"
        >{{ confirmButtonText }}</el-button>
      </template>
    </el-dialog>

    <OrderPaymentDialog
      v-model="payDialogVisible"
      :order="payOrder"
      @paid="onOnlinePaid"
      @mark-manual="markPaid(payOrder)"
    />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as orderApi from '@/api/order'
import * as chatApi from '@/api/chat'
import * as reviewApi from '@/api/review'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TYPE, PAYMENT_STATUS_LABELS } from '@/constants/order'
import OrderPaymentDialog from '@/components/OrderPaymentDialog.vue'
import OrderListSkeleton from '@/components/OrderListSkeleton.vue'
import { getFileUrl } from '@/utils/fileUrl'

const props = defineProps({
  sellOnly: { type: Boolean, default: false },
})

const fileUrl = getFileUrl
const router = useRouter()
const loading = ref(false)
const error = ref('')
const list = ref([])
const roleTab = ref(props.sellOnly ? 'sell' : 'buy')
const statusTab = ref('')

const reviewVisible = ref(false)
const reviewSubmitting = ref(false)
const reviewOrderId = ref('')
const reviewTargetName = ref('')
const reviewForm = ref({ rating: 5, content: '' })
const rateTexts = ['很差', '较差', '一般', '满意', '非常满意']

const payDialogVisible = ref(false)
const payOrder = ref(null)

const confirmVisible = ref(false)
const confirmLoading = ref(false)
const confirmTitle = ref('提示')
const confirmMessage = ref('')
const confirmButtonText = ref('确定')
const confirmButtonType = ref('primary')
const confirmAction = ref(null)

function openConfirm({ title, message, buttonText = '确定', buttonType = 'primary', action }) {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmButtonText.value = buttonText
  confirmButtonType.value = buttonType
  confirmAction.value = action
  confirmVisible.value = true
}

async function runConfirmAction() {
  if (!confirmAction.value || confirmLoading.value) return
  confirmLoading.value = true
  try {
    await confirmAction.value()
    confirmVisible.value = false
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  } finally {
    confirmLoading.value = false
  }
}

function formatTime(t) {
  return new Date(t).toLocaleString('zh-CN')
}

async function loadReviewSummaries(orders) {
  const completed = orders.filter((o) => o.status === 'completed')
  await Promise.all(
    completed.map(async (order) => {
      try {
        order.reviewSummary = await reviewApi.getOrderReviewSummary(order._id)
      } catch {
        order.reviewSummary = null
      }
    })
  )
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { role: roleTab.value }
    if (statusTab.value) params.status = statusTab.value
    const res = await orderApi.getOrders(params)
    list.value = res.list || []
    await loadReviewSummaries(list.value)
  } catch (e) {
    error.value = e.message || '加载订单失败'
  } finally {
    loading.value = false
  }
}

function goProduct(order) {
  if (order.productId?._id) router.push(`/products/${order.productId._id}`)
}

async function goChat(order) {
  const peerId = roleTab.value === 'buy' ? order.sellerId._id : order.buyerId._id
  try {
    const conv = await chatApi.createConversation({
      receiverId: peerId,
      productId: order.productId?._id,
    })
    router.push(`/chat/${conv._id}`)
  } catch (e) {
    ElMessage.error(e.message || '无法发起聊天')
  }
}

async function hideOrderRecord(order) {
  openConfirm({
    title: '删除记录',
    message: '从列表中移除该订单？不影响对方记录，管理员可恢复。',
    buttonText: '删除',
    buttonType: 'danger',
    action: async () => {
      await orderApi.hideOrder(order._id)
      ElMessage.success('已移除')
      load()
    },
  })
}

function openPayDialog(order) {
  payOrder.value = order
  payDialogVisible.value = true
}

function onOnlinePaid() {
  payDialogVisible.value = false
  load()
}

async function markPaid(order) {
  if (!order?._id) return
  try {
    await orderApi.markOrderPaid(order._id)
    ElMessage.success('已标记付款，等待卖家确认收款')
    payDialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function confirmPayment(order) {
  if (!order?._id) return
  try {
    await orderApi.confirmOrderPayment(order._id)
    ElMessage.success('已确认收到买家付款')
    load()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

function setStatus(order, status) {
  if (status === 'cancelled') {
    openConfirm({
      title: '取消订单',
      message: `确定取消「${order.productId?.title || '该订单'}」？取消后不可恢复。`,
      buttonText: '确认取消',
      buttonType: 'danger',
      action: async () => {
        await orderApi.updateOrderStatus(order._id, { status })
        ElMessage.success('订单已取消')
        load()
      },
    })
    return
  }
  if (status === 'completed') {
    openConfirm({
      title: '确认完成',
      message: `确认「${order.productId?.title || '该订单'}」已完成交易？`,
      buttonText: '确认完成',
      buttonType: 'success',
      action: async () => {
        await orderApi.updateOrderStatus(order._id, { status })
        ElMessage.success('操作成功')
        load()
      },
    })
    return
  }
  orderApi.updateOrderStatus(order._id, { status }).then(() => {
    ElMessage.success('操作成功')
    load()
  }).catch((e) => ElMessage.error(e.message || '操作失败'))
}

function openReview(order) {
  reviewOrderId.value = order._id
  reviewTargetName.value =
    roleTab.value === 'buy' ? order.sellerId?.nickname : order.buyerId?.nickname
  reviewForm.value = { rating: 5, content: '' }
  reviewVisible.value = true
}

async function submitReview() {
  if (!reviewForm.value.rating) {
    ElMessage.warning('请选择评分')
    return
  }
  reviewSubmitting.value = true
  try {
    await reviewApi.submitOrderReview(reviewOrderId.value, reviewForm.value)
    ElMessage.success('评价已提交')
    reviewVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message || '提交失败')
  } finally {
    reviewSubmitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.status-tabs { margin-bottom: 16px; }
.order-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.order-head { display: flex; justify-content: space-between; margin-bottom: 12px; }
.time { font-size: 12px; color: #909399; }
.order-body { display: flex; gap: 12px; cursor: pointer; }
.thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; }
.thumb.empty { background: var(--app-border); display: flex; align-items: center; justify-content: center; color: var(--app-muted); }
.info h4 { margin: 0 0 8px; font-size: 15px; }
.price { color: #f56c6c; font-weight: 700; margin: 0; }
.peer, .remark, .review-hint, .pay-hint { font-size: 13px; color: #606266; margin: 4px 0 0; }
.pay-hint { color: var(--el-color-warning); }
.pay-amount { margin: 0 0 12px; }
.pay-qr { width: 100%; max-width: 240px; display: block; margin: 0 auto; border-radius: 8px; }
.pay-tip { text-align: center; font-size: 13px; color: var(--app-muted); margin-top: 12px; }
.review-hint { color: var(--el-color-warning); }
.order-actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.review-target { margin: 0 0 12px; color: var(--el-text-color-regular); }
.confirm-body {
  margin: 0;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  font-size: 15px;
}
.orders-wrap { min-height: 200px; }
.order-scroller {
  max-height: calc(100vh - 280px);
  max-height: calc(100dvh - 280px);
  min-height: 320px;
}
.order-scroller :deep(.vue-recycle-scroller__item-view) {
  padding-bottom: 12px;
}
</style>
