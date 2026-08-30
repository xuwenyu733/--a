<template>
  <el-card>
    <template #header>
      <div class="head">
        <span>我的跑腿订单</span>
        <el-button link @click="$router.push('/delivery')">返回</el-button>
      </div>
    </template>

    <div class="toolbar">
      <el-tabs v-model="roleTab" class="toolbar__tabs" @tab-change="load">
        <el-tab-pane label="我发布的" name="poster" />
        <el-tab-pane v-if="auth.user?.courierVerified" label="我接的单" name="courier" />
      </el-tabs>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-empty v-if="!loading && !error && !orders.length" description="暂无订单" />

    <div v-for="item in orders" :key="item._id" class="order-card">
      <div class="order-card__top">
        <el-tag size="small">{{ typeLabel(item.type) }}</el-tag>
        <el-tag :type="statusTag(item.status)" size="small">{{ DELIVERY_ORDER_STATUS[item.status] }}</el-tag>
        <span class="fee">¥{{ item.fee }}</span>
      </div>
      <p><strong>区域：</strong>{{ item.zoneId?.name }}</p>
      <p><strong>取：</strong>{{ item.pickupAddress }}</p>
      <p><strong>送：</strong>{{ item.dropoffAddress }}</p>
      <p v-if="item.contactPhone"><strong>联系电话：</strong>{{ item.contactPhone }}</p>
      <p v-if="item.courierId && roleTab === 'poster'">
        <strong>骑手：</strong>{{ item.courierId?.nickname || item.courierId?.phone }}
      </p>
      <p v-if="item.posterId && roleTab === 'courier'">
        <strong>发布人：</strong>{{ item.posterId?.nickname || item.posterId?.phone }}
      </p>
      <div class="actions">
        <el-button
          v-if="canCancel(item)"
          size="small"
          type="danger"
          @click="cancel(item)"
        >
          取消
        </el-button>
        <el-button
          v-if="roleTab === 'courier' && item.status === 'accepted'"
          size="small"
          type="primary"
          @click="updateStatus(item, 'delivering')"
        >
          开始配送
        </el-button>
        <el-button
          v-if="roleTab === 'courier' && item.status === 'delivering'"
          size="small"
          type="success"
          @click="updateStatus(item, 'completed')"
        >
          确认完成
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as deliveryApi from '@/api/delivery'
import { DELIVERY_ORDER_TYPES, DELIVERY_ORDER_STATUS } from '@/constants/delivery'

const auth = useAuthStore()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const orders = ref([])
const roleTab = ref(route.query.role === 'courier' ? 'courier' : 'poster')

function typeLabel(type) {
  return DELIVERY_ORDER_TYPES.find((t) => t.value === type)?.label || type
}

function statusTag(status) {
  const map = { open: 'info', accepted: 'warning', delivering: 'primary', completed: 'success', cancelled: 'info' }
  return map[status] || 'info'
}

function canCancel(item) {
  return ['open', 'accepted'].includes(item.status) &&
    ((roleTab.value === 'poster') || (roleTab.value === 'courier' && item.courierId))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await deliveryApi.getMyDeliveryOrders({ role: roleTab.value })
    orders.value = res.list || []
  } catch (e) {
    error.value = e.message || '加载跑腿订单失败'
  } finally {
    loading.value = false
  }
}

async function cancel(item) {
  const { value } = await ElMessageBox.prompt('取消原因（可选）', '取消订单', {
    confirmButtonText: '确认取消',
    cancelButtonText: '返回',
  }).catch(() => ({ value: null }))
  if (value === null) return
  await deliveryApi.updateDeliveryOrderStatus(item._id, { status: 'cancelled', cancelReason: value || '' })
  ElMessage.success('已取消')
  load()
}

async function updateStatus(item, status) {
  await deliveryApi.updateDeliveryOrderStatus(item._id, { status })
  ElMessage.success('状态已更新')
  load()
}

onMounted(load)
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.toolbar__tabs {
  flex: 1;
}
.toolbar__tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
.order-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}
.order-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.fee {
  margin-left: auto;
  font-weight: 600;
  color: #e6a23c;
}
.order-card p {
  margin: 4px 0;
  font-size: 14px;
}
.actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
</style>
