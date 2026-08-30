<template>
  <el-card header="我的收藏">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <ProductGridSkeleton v-if="loading && !list.length" :count="8" />
    <el-row v-else-if="list.length" :gutter="16">
      <el-col v-for="item in list" :key="item._id" :xs="12" :sm="8" :md="6">
        <div v-if="item.product" class="fav-wrap">
          <el-tag v-if="item.priceDropped" class="fav-drop" type="danger" size="small" effect="dark">
            已降价
          </el-tag>
          <ProductCard :product="item.product" />
        </div>
      </el-col>
    </el-row>
    <el-empty v-if="!loading && !error && !list.length" description="暂无收藏" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as productApi from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'
import ProductGridSkeleton from '@/components/ProductGridSkeleton.vue'

const loading = ref(false)
const error = ref('')
const list = ref([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await productApi.getFavorites({})
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载收藏失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.fav-wrap {
  position: relative;
}
.fav-drop {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}
</style>
