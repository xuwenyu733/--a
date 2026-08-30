<template>
  <div v-loading="loading" class="shop-page">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <template v-if="shop">
      <el-card class="shop-header">
        <div class="shop-info">
          <el-avatar :size="64" :src="fileUrl(user?.avatar)">{{ user?.nickname?.[0] }}</el-avatar>
          <div>
            <h1>{{ shop.shopName }}</h1>
            <p>{{ shop.description || '认证商家店铺' }}</p>
            <p class="addr">📍 {{ shop.address || '地址待完善' }}</p>
            <el-tag type="warning">认证商家</el-tag>
          </div>
        </div>
      </el-card>
      <el-card header="店铺商品">
        <el-row :gutter="16">
          <el-col v-for="p in products" :key="p._id" :xs="12" :sm="8" :md="6">
            <ProductCard :product="p" />
          </el-col>
        </el-row>
        <el-empty v-if="!products.length" description="暂无在售商品" />
        <el-pagination
          v-if="pagination.total > pagination.pageSize"
          style="margin-top:16px"
          layout="prev, pager, next"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          v-model:current-page="page"
          @current-change="load"
        />
      </el-card>
    </template>
    <el-empty v-else-if="!loading && !error" description="店铺不存在或未营业" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as merchantApi from '@/api/merchant'
import ProductCard from '@/components/ProductCard.vue'
import { getFileUrl } from '@/utils/fileUrl'

const fileUrl = getFileUrl

const route = useRoute()
const loading = ref(false)
const error = ref('')
const shop = ref(null)
const user = ref(null)
const products = ref([])
const page = ref(1)
const pagination = ref({ page: 1, pageSize: 12, total: 0 })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await merchantApi.getPublicShop(route.params.userId, { page: page.value })
    shop.value = data.shop
    user.value = data.user
    products.value = data.products?.list || []
    pagination.value = data.products?.pagination || pagination.value
  } catch (e) {
    shop.value = null
    error.value = e.message || '加载店铺失败'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.userId, () => {
  page.value = 1
  load()
})

onMounted(load)
</script>

<style scoped>
.shop-page { max-width: 1100px; margin: 0 auto; }
.shop-header { margin-bottom: 20px; }
.shop-info { display: flex; gap: 20px; align-items: flex-start; }
.shop-info h1 { margin: 0 0 8px; font-size: 22px; }
.shop-info p { margin: 4px 0; color: #606266; font-size: 14px; }
.addr { color: #909399; }
</style>
