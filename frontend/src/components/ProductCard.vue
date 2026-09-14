<template>
  <el-card class="product-card" shadow="hover" role="article" :aria-label="`商品：${product.title}`" @click="$router.push(`/products/${product._id}`)">
    <div class="cover">
      <img v-if="imgSrc" :src="imgSrc" alt="" loading="lazy" decoding="async" @error="onImgError" />
      <div v-else class="no-img">暂无图片</div>
    </div>
    <div class="info">
      <h3 class="title">{{ product.title }}</h3>
      <p class="price">¥{{ product.price }}</p>
      <p class="meta" @click.stop="goSeller">
        <span class="seller-link">{{ product.sellerId?.nickname }}</span>
        · {{ formatCondition(product.condition) }}
      </p>
    </div>
  </el-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CONDITIONS } from '@/constants/product'
import { getFileUrl, getThumbUrl } from '@/utils/fileUrl'

const props = defineProps({ product: { type: Object, required: true } })
const router = useRouter()

const preferThumb = ref(true)
const imageFailed = ref(false)

const rawPath = computed(() => props.product.images?.[0])

const imgSrc = computed(() => {
  if (!rawPath.value || imageFailed.value) return ''
  return preferThumb.value ? getThumbUrl(rawPath.value) : getFileUrl(rawPath.value)
})

watch(
  () => `${props.product._id || ''}-${rawPath.value || ''}`,
  () => {
    preferThumb.value = true
    imageFailed.value = false
  }
)

function onImgError() {
  if (preferThumb.value) {
    preferThumb.value = false
  } else {
    imageFailed.value = true
  }
}

function formatCondition(v) {
  return CONDITIONS.find((c) => c.value === v)?.label || v
}

function goSeller() {
  const id = props.product.sellerId?._id || props.product.sellerId
  if (!id) return
  if (props.product.sellerType === 'merchant') router.push(`/shop/${id}`)
  else router.push(`/users/${id}`)
}
</script>

<style scoped>
.product-card { cursor: pointer; margin-bottom: 16px; }
.cover { position: relative; height: 160px; background: #f5f7fa; border-radius: 4px; overflow: hidden; }
.cover img { width: 100%; height: 100%; object-fit: cover; }
.no-img { height: 100%; display: flex; align-items: center; justify-content: center; color: #999; }
.title { font-size: 14px; margin: 8px 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price { color: #f56c6c; font-weight: 700; font-size: 18px; margin: 0; }
.meta { font-size: 12px; color: #909399; margin: 4px 0 0; }
.seller-link { color: #409eff; cursor: pointer; }
.seller-link:hover { text-decoration: underline; }
</style>
