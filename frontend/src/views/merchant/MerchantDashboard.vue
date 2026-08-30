<template>
  <div>
    <el-alert
      v-if="error"
      type="error"
      :title="error"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    >
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-card>
      <template #header>商家工作台</template>

      <el-row v-if="loading" :gutter="16" style="margin-bottom: 20px">
        <el-col v-for="i in 4" :key="i" :xs="12" :sm="6">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="text" style="width: 50%; margin-bottom: 8px" />
              <el-skeleton-item variant="h1" style="width: 35%" />
            </template>
          </el-skeleton>
        </el-col>
      </el-row>

      <el-row v-else-if="stats" :gutter="16" style="margin-bottom: 20px">
        <el-col :xs="12" :sm="6">
          <el-statistic title="在售商品" :value="stats.products?.onSale || 0" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="累计订单" :value="orderTotal" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="已完成" :value="stats.orders?.completed || 0" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="成交额" :value="stats.revenue || 0" prefix="¥" />
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-button type="primary" size="large" @click="$router.push('/merchant/products/new')">发布商品</el-button>
        </el-col>
        <el-col :span="8">
          <el-button size="large" @click="$router.push('/merchant/products')">管理商品</el-button>
        </el-col>
        <el-col :span="8">
          <el-button size="large" type="warning" @click="$router.push('/merchant/orders')">处理订单</el-button>
        </el-col>
        <el-col :span="8" style="margin-top:12px">
          <el-button size="large" @click="$router.push('/merchant/stats')">数据统计</el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as merchantApi from '@/api/merchant'

const stats = ref(null)
const loading = ref(true)
const error = ref('')

const orderTotal = computed(() => {
  const o = stats.value?.orders
  if (!o) return 0
  return (o.pending || 0) + (o.confirmed || 0) + (o.completed || 0) + (o.cancelled || 0)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await merchantApi.getMerchantStats()
  } catch (e) {
    error.value = e.message || '加载统计数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
