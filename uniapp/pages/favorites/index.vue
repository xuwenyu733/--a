<template>
  <view class="container">
    <ProductGridSkeleton v-if="loading && !products.length" :count="6" />
    <LoadState
      v-else
      :loading="false"
      :error="loadError"
      :has-data="products.length > 0"
      empty-text="暂无收藏"
      @retry="load"
    />
    <view v-if="products.length" class="grid-2">
      <view v-for="p in products" :key="p._id" class="grid-2-item">
        <ProductCard :product="p" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getFavorites } from '@/api/product'
import { ensureLogin } from '@/utils/auth'
import { getFileUrl } from '@/utils/fileUrl'
import ProductCard from '@/components/ProductCard.vue'
import LoadState from '@/components/LoadState.vue'
import ProductGridSkeleton from '@/components/ProductGridSkeleton.vue'

const products = ref([])
const loading = ref(false)
const loadError = ref('')

onShow(() => {
  if (ensureLogin()) load()
})

onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()))

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getFavorites({ pageSize: 50 })
    products.value = (res.list || []).map((i) => {
      const p = i.product
      if (!p) return null
      return { ...p, cover: getFileUrl(p.images?.[0]) }
    }).filter(Boolean)
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
</script>
