<template>
  <el-card>
    <template #header>
      <div class="head">
        <span>接单大厅</span>
        <el-button link @click="$router.push('/delivery')">返回</el-button>
      </div>
    </template>

    <el-alert v-if="!auth.user?.courierVerified" type="warning" show-icon :closable="false" title="您还不是认证骑手">
      <template #default>
        <el-button link type="primary" @click="$router.push('/user/verify/courier')">去申请</el-button>
      </template>
    </el-alert>

    <div v-else class="filters">
      <el-select v-model="filterZoneId" placeholder="全部区域" clearable style="width:160px" @change="load">
        <el-option v-for="z in zones" :key="z._id" :label="z.name" :value="z._id" />
      </el-select>
      <el-select v-model="filterType" placeholder="全部类型" clearable style="width:140px" @change="load">
        <el-option v-for="t in DELIVERY_ORDER_TYPES" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-empty v-if="!loading && !error && !orders.length && auth.user?.courierVerified" description="暂无待接订单" />

    <div v-for="item in orders" :key="item._id" class="order-card">
      <div class="order-card__top">
        <el-tag size="small">{{ typeLabel(item.type) }}</el-tag>
        <el-tag type="warning" size="small">¥{{ item.fee }}</el-tag>
        <span class="zone">{{ item.zoneId?.name }}</span>
      </div>
      <h4>{{ item.title || typeLabel(item.type) }}</h4>
      <p><strong>取：</strong>{{ item.pickupAddress }}</p>
      <p><strong>送：</strong>{{ item.dropoffAddress }}</p>
      <p v-if="item.contactPhone"><strong>联系：</strong>{{ item.contactPhone }}</p>
      <p v-if="item.description" class="desc">{{ item.description }}</p>
      <div class="order-card__foot">
        <span class="time">{{ formatTime(item.createdAt) }}</span>
        <el-button type="primary" size="small" :loading="acceptingId === item._id" @click="accept(item)">
          接单
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as deliveryApi from '@/api/delivery'
import { DELIVERY_ORDER_TYPES } from '@/constants/delivery'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const acceptingId = ref('')
const orders = ref([])
const zones = ref([])
const filterZoneId = ref('')
const filterType = ref('')

function typeLabel(type) {
  return DELIVERY_ORDER_TYPES.find((t) => t.value === type)?.label || type
}

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN') : ''
}

async function load() {
  if (!auth.user?.courierVerified) return
  loading.value = true
  error.value = ''
  try {
    const res = await deliveryApi.getOpenDeliveryOrders({
      zoneId: filterZoneId.value || undefined,
      type: filterType.value || undefined,
    })
    orders.value = res.list || []
  } catch (e) {
    error.value = e.message || '加载待接订单失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const regionId = auth.user?.regionId?._id || auth.user?.regionId
  if (regionId) {
    try {
      zones.value = await deliveryApi.getDeliveryZones(regionId)
    } catch (e) {
      console.warn('load zones failed', e)
    }
  }
  load()
})

async function accept(item) {
  acceptingId.value = item._id
  try {
    await deliveryApi.acceptDeliveryOrder(item._id)
    ElMessage.success('接单成功')
    router.push('/delivery/orders?role=courier')
  } catch (e) {
    ElMessage.error(e.message || '接单失败')
    load()
  } finally {
    acceptingId.value = ''
  }
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
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
.zone {
  font-size: 13px;
  color: var(--app-muted);
}
.order-card h4 {
  margin: 0 0 8px;
}
.order-card p {
  margin: 4px 0;
  font-size: 14px;
}
.desc {
  color: var(--app-muted);
  font-size: 13px;
}
.order-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.time {
  font-size: 12px;
  color: var(--app-muted);
}
</style>
