<template>
  <div v-loading="loading" class="detail-page">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <template v-if="product">
      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <el-carousel v-if="hasGallery" height="360px" :autoplay="false">
            <el-carousel-item v-for="(img, i) in product.images || []" :key="`img-${i}`">
              <img
                :src="fileUrl(img)"
                class="carousel-img"
                :loading="i === 0 ? 'eager' : 'lazy'"
                decoding="async"
                :alt="`${product.title} 图片 ${i + 1}`"
              />
            </el-carousel-item>
            <el-carousel-item v-if="product.videos?.length" key="video">
              <video
                :src="fileUrl(product.videos[0])"
                :poster="product.images?.[0] ? fileUrl(product.images[0]) : ''"
                controls
                class="product-video"
              />
            </el-carousel-item>
          </el-carousel>
          <div v-else class="no-img">暂无图片</div>
        </el-col>
        <el-col :xs="24" :md="12">
          <h1>{{ product.title }}</h1>
          <div class="price-row">
            <p class="price">¥{{ product.price }}</p>
          </div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="成色">{{ conditionLabel }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ categoryLabel }}</el-descriptions-item>
            <el-descriptions-item v-if="canSeeStock" label="库存">{{ product.stock ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="交易地点">{{ product.location || '面议' }}</el-descriptions-item>
            <el-descriptions-item label="浏览">{{ product.viewCount }} 次</el-descriptions-item>
          </el-descriptions>
          <div class="actions">
            <el-button v-if="auth.isLoggedIn" :type="favorited ? 'warning' : 'default'" @click="handleFavorite">
              {{ favorited ? '已收藏' : '收藏' }}
            </el-button>
            <template v-if="canBuy">
              <el-input-number
                v-model="buyQty"
                :min="1"
                :max="maxBuyQty"
                size="default"
                class="qty-input"
              />
              <el-button type="danger" :loading="ordering" @click="openOrderDialog">立即下单</el-button>
              <el-button type="primary" plain :loading="addingCart" @click="handleAddCart">加入购物车</el-button>
              <el-button link type="primary" @click="$router.push('/cart')">购物车</el-button>
            </template>
            <el-button
              v-else-if="needVerify"
              type="danger"
              plain
              @click="$router.push('/user/verify/student')"
            >学生认证后购买</el-button>
            <el-button
              v-if="canContact"
              :loading="contacting"
              @click="handleContact"
            >联系卖家</el-button>
            <el-button v-else-if="isOwner" type="info" disabled>这是您的商品</el-button>
            <el-tag v-else-if="product.status === 'sold'" type="info">已售出</el-tag>
            <el-button plain @click="sharePosterVisible = true">生成分享海报</el-button>
            <el-button
              v-if="auth.isLoggedIn && !isOwner"
              type="warning"
              plain
              @click="reportVisible = true"
            >举报</el-button>
          </div>
          <ReportDialog
            v-model="reportVisible"
            target-type="product"
            :target-id="route.params.id"
          />
          <SharePosterDialog v-model="sharePosterVisible" :product="product" />

          <el-dialog v-model="orderDialogVisible" title="确认购买" width="400px">
            <p>商品：<strong>{{ product.title }}</strong></p>
            <p>数量：<strong>{{ buyQty }}</strong></p>
            <p>合计：<strong class="price">¥{{ (Number(product.price) * buyQty).toFixed(2) }}</strong></p>
            <el-input v-model="orderRemark" type="textarea" placeholder="备注（可选，如面交时间地点）" :rows="3" style="margin-top:12px" />
            <template #footer>
              <el-button @click="orderDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="ordering" @click="handleOrder">提交订单</el-button>
            </template>
          </el-dialog>
          <el-card class="seller-card">
            <template #header>卖家信息</template>
            <div class="seller">
              <el-avatar :src="fileUrl(product.sellerId?.avatar)">{{ product.sellerId?.nickname?.[0] }}</el-avatar>
              <div>
                <strong>{{ product.sellerId?.nickname }}</strong>
                <el-tag v-if="product.sellerType === 'merchant'" size="small" type="warning">认证商家</el-tag>
                <el-tag v-else-if="product.sellerId?.studentVerified" size="small" type="success">学生认证</el-tag>
                <CreditTag
                  v-if="product.sellerId?.creditScore != null"
                  :score="product.sellerId.creditScore"
                  style="margin-left:8px"
                />
                <p v-if="shop">
                  <el-button link type="primary" @click.stop="$router.push(`/shop/${product.sellerId?._id || product.sellerId}`)">
                    {{ shop.shopName }}
                  </el-button>
                  · {{ shop.address }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-card style="margin-top:20px">
        <template #header>商品描述</template>
        <p class="desc">{{ product.description || '暂无描述' }}</p>
      </el-card>

      <el-card v-if="relatedProducts.length" style="margin-top:20px">
        <template #header>相关推荐</template>
        <el-row :gutter="16">
          <el-col v-for="p in relatedProducts" :key="p._id" :xs="12" :sm="8" :md="6">
            <ProductCard :product="p" />
          </el-col>
        </el-row>
      </el-card>
    </template>
    <el-empty v-else-if="!loading && !error" description="商品不存在或已下架" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as productApi from '@/api/product'
import * as chatApi from '@/api/chat'
import * as orderApi from '@/api/order'
import * as cartApi from '@/api/cart'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/constants/roles'
import { CATEGORIES, CONDITIONS } from '@/constants/product'
import ReportDialog from '@/components/ReportDialog.vue'
import ProductCard from '@/components/ProductCard.vue'
import CreditTag from '@/components/CreditTag.vue'
import SharePosterDialog from '@/components/SharePosterDialog.vue'
import { getFileUrl } from '@/utils/fileUrl'

const fileUrl = getFileUrl

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const contacting = ref(false)
const ordering = ref(false)
const addingCart = ref(false)
const orderDialogVisible = ref(false)
const orderRemark = ref('')
const buyQty = ref(1)
const product = ref(null)
const hasGallery = computed(() => (product.value?.images?.length || 0) + (product.value?.videos?.length || 0) > 0)
const shop = ref(null)
const favorited = ref(false)
const reportVisible = ref(false)
const sharePosterVisible = ref(false)
const relatedProducts = ref([])

const isOwner = computed(() => {
  const sid = product.value?.sellerId?._id || product.value?.sellerId
  return sid?.toString() === auth.user?._id?.toString()
})

const canSeeStock = computed(() => {
  if (!product.value || product.value.stock == null) return false
  if (isOwner.value) return true
  return auth.user?.role === ROLES.SUPER_ADMIN
})

const canContact = computed(() => {
  return auth.isLoggedIn && product.value?.status === 'on_sale' && !isOwner.value
})

const canBuy = computed(() => {
  return (
    auth.isLoggedIn &&
    auth.user?.role === ROLES.STUDENT &&
    auth.user?.studentVerified &&
    product.value?.status === 'on_sale' &&
    !isOwner.value
  )
})

const needVerify = computed(() => {
  return (
    auth.isLoggedIn &&
    auth.user?.role === ROLES.STUDENT &&
    !auth.user?.studentVerified &&
    product.value?.status === 'on_sale' &&
    !isOwner.value
  )
})

const conditionLabel = computed(() => CONDITIONS.find((c) => c.value === product.value?.condition)?.label)
const categoryLabel = computed(() => CATEGORIES.find((c) => c.value === product.value?.category)?.label)
const maxBuyQty = computed(() => Math.max(1, Math.min(99, Number(product.value?.stock) || 1)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await productApi.getProductDetail(route.params.id)
    product.value = data.product
    shop.value = data.shop
    favorited.value = data.favorited
    buyQty.value = 1
    const regionId = data.product.regionId?._id || data.product.regionId
    if (regionId) {
      const rec = await productApi.getRecommendedProducts({
        regionId,
        productId: route.params.id,
        limit: 4,
      })
      relatedProducts.value = rec.list || []
    }
  } catch (e) {
    product.value = null
    error.value = e.message || '加载商品详情失败'
  } finally {
    loading.value = false
  }
}

async function handleFavorite() {
  if (!auth.isLoggedIn) return ElMessage.warning('请先登录')
  const res = await productApi.toggleFavorite(route.params.id)
  favorited.value = res.favorited
  ElMessage.success(res.favorited ? '已收藏' : '已取消收藏')
}

function openOrderDialog() {
  if (buyQty.value > maxBuyQty.value) buyQty.value = maxBuyQty.value
  orderRemark.value = ''
  orderDialogVisible.value = true
}

async function handleOrder() {
  ordering.value = true
  try {
    await orderApi.createOrder({
      productId: route.params.id,
      remark: orderRemark.value,
      quantity: buyQty.value,
    })
    ElMessage.success('下单成功，等待卖家确认')
    orderDialogVisible.value = false
    router.push('/user/orders')
  } catch {
    load()
  } finally {
    ordering.value = false
  }
}

async function handleAddCart() {
  addingCart.value = true
  try {
    await cartApi.addToCart({
      productId: route.params.id,
      quantity: buyQty.value,
    })
    ElMessage.success('已加入购物车')
  } catch {
    load()
  } finally {
    addingCart.value = false
  }
}

async function handleContact() {
  if (!auth.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  contacting.value = true
  try {
    const conv = await chatApi.contactSeller(route.params.id)
    router.push(`/chat/${conv._id}`)
  } catch (e) {
    ElMessage.error(e.message || '无法发起聊天')
  } finally {
    contacting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.detail-page { max-width: 1100px; margin: 0 auto; }
.carousel-img { width: 100%; height: 360px; object-fit: contain; background: var(--app-border); }
.product-video { width: 100%; height: 360px; background: #000; object-fit: contain; }
.no-img { height: 360px; background: var(--app-border); display: flex; align-items: center; justify-content: center; color: var(--app-muted); }
.price-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.price { color: #f56c6c; font-size: 28px; font-weight: 700; margin: 0; }
.actions { margin: 20px 0; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.qty-input { width: 130px; }
.seller { display: flex; gap: 12px; align-items: center; }
.desc { white-space: pre-wrap; line-height: 1.6; }
</style>
