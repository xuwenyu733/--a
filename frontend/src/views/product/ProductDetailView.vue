<template>
  <div v-loading="loading" class="detail-page">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <template v-if="product">
      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <el-carousel v-if="product.images?.length" height="360px">
            <el-carousel-item v-for="(img, i) in product.images" :key="i">
              <img
                :src="fileUrl(img)"
                class="carousel-img"
                :loading="i === 0 ? 'eager' : 'lazy'"
                decoding="async"
                :alt="`${product.title} 图片 ${i + 1}`"
              />
            </el-carousel-item>
          </el-carousel>
          <div v-else-if="product.videos?.length" class="video-wrap">
            <video :src="fileUrl(product.videos[0])" controls class="product-video" />
          </div>
          <div v-else class="no-img">暂无图片</div>
          <div v-if="product.images?.length && product.videos?.length" class="video-extra">
            <video :src="fileUrl(product.videos[0])" controls class="product-video-sm" />
          </div>
        </el-col>
        <el-col :xs="24" :md="12">
          <h1>{{ product.title }}</h1>
          <div class="price-row">
            <el-tag v-if="product.tradeMode === 'exchange'" type="warning" effect="dark">以物换物</el-tag>
            <p class="price">
              {{ product.tradeMode === 'exchange' && !product.price ? '面议交换' : `¥${product.price}` }}
            </p>
          </div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="成色">{{ conditionLabel }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ categoryLabel }}</el-descriptions-item>
            <el-descriptions-item label="交易地点">{{ product.location || '面议' }}</el-descriptions-item>
            <el-descriptions-item label="浏览">{{ product.viewCount }} 次</el-descriptions-item>
          </el-descriptions>
          <div class="actions">
            <el-button v-if="auth.isLoggedIn" :type="favorited ? 'warning' : 'default'" @click="handleFavorite">
              {{ favorited ? '已收藏' : '收藏' }}
            </el-button>
            <el-button
              v-if="canBuy"
              type="danger"
              :loading="ordering"
              @click="orderUseGroupPrice = false; orderDialogVisible = true"
            >我想要</el-button>
            <el-button
              v-else-if="needVerify"
              type="danger"
              plain
              @click="$router.push('/user/verify/student')"
            >学生认证后购买</el-button>
            <el-button
              v-if="canContact"
              :loading="contacting"
              :type="isExchange ? 'primary' : 'default'"
              @click="handleContact"
            >{{ isExchange ? '联系协商换物' : '联系卖家' }}</el-button>
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

          <el-card v-if="groupBuy?.enabled" class="group-buy-card">
            <template #header>
              <span>拼单优惠</span>
              <el-tag v-if="groupBuy.status === 'cancelled'" type="info" size="small">已关闭</el-tag>
              <el-tag v-else-if="groupBuy.isFull" type="success" size="small">已满员</el-tag>
              <el-tag v-else type="danger" size="small">进行中</el-tag>
            </template>
            <template v-if="groupBuy.status === 'cancelled'">
              <p class="group-desc">卖家已关闭本商品的拼单活动</p>
            </template>
            <template v-else>
            <p class="group-desc">
              拼单价 <strong class="group-price">¥{{ groupBuy.groupPrice }}</strong>
              · 原价 ¥{{ product.price }}
              · {{ groupBuy.isFull ? '已满员' : `还差 ${groupBuy.remaining} 人` }}
            </p>
            <el-progress
              :percentage="groupBuyProgress"
              :status="groupBuy.isFull ? 'success' : undefined"
              :stroke-width="10"
            />
            <p class="group-count">{{ groupBuy.participantCount }} / {{ groupBuy.minCount }} 人已参团</p>
            <div class="group-actions">
              <el-button
                v-if="canJoinGroup"
                type="warning"
                :loading="groupLoading"
                @click="handleJoinGroup"
              >加入拼单</el-button>
              <el-button
                v-if="groupBuy.joined && !groupBuy.isFull"
                :loading="groupLoading"
                @click="handleLeaveGroup"
              >退出拼单</el-button>
              <el-button
                v-if="canGroupOrder"
                type="danger"
                :loading="ordering"
                @click="openGroupOrder"
              >拼单价下单</el-button>
            </div>
            </template>
          </el-card>

          <el-dialog v-model="orderDialogVisible" :title="orderUseGroupPrice ? '拼单价下单' : '确认购买'" width="400px">
            <p>商品：<strong>{{ product.title }}</strong></p>
            <p>价格：<strong class="price">¥{{ orderUseGroupPrice ? groupBuy?.groupPrice : product.price }}</strong></p>
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
const orderDialogVisible = ref(false)
const orderRemark = ref('')
const product = ref(null)
const shop = ref(null)
const favorited = ref(false)
const reportVisible = ref(false)
const sharePosterVisible = ref(false)
const relatedProducts = ref([])
const groupBuy = ref(null)
const groupLoading = ref(false)
const orderUseGroupPrice = ref(false)

const isOwner = computed(() => {
  const sid = product.value?.sellerId?._id || product.value?.sellerId
  return sid?.toString() === auth.user?._id?.toString()
})

const canContact = computed(() => {
  return auth.isLoggedIn && product.value?.status === 'on_sale' && !isOwner.value
})

const isExchange = computed(() => product.value?.tradeMode === 'exchange')

const canBuy = computed(() => {
  return (
    auth.isLoggedIn &&
    auth.user?.role === ROLES.STUDENT &&
    auth.user?.studentVerified &&
    product.value?.status === 'on_sale' &&
    !isOwner.value &&
    !isExchange.value
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

const groupBuyProgress = computed(() => {
  if (!groupBuy.value?.minCount) return 0
  return Math.min(100, Math.round((groupBuy.value.participantCount / groupBuy.value.minCount) * 100))
})

const canJoinGroup = computed(() => {
  return (
    canBuy.value &&
    groupBuy.value?.enabled &&
    groupBuy.value?.status === 'open' &&
    !groupBuy.value.joined &&
    !groupBuy.value.isFull
  )
})

const canGroupOrder = computed(() => {
  return canBuy.value && groupBuy.value?.joined && groupBuy.value.isFull
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await productApi.getProductDetail(route.params.id)
    product.value = data.product
    shop.value = data.shop
    favorited.value = data.favorited
    groupBuy.value = data.groupBuy
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

async function handleOrder() {
  ordering.value = true
  try {
    await orderApi.createOrder({
      productId: route.params.id,
      remark: orderRemark.value,
      useGroupPrice: orderUseGroupPrice.value,
    })
    ElMessage.success('下单成功，等待卖家确认')
    orderDialogVisible.value = false
    orderUseGroupPrice.value = false
    router.push('/user/orders')
  } catch (e) {
    ElMessage.error(e.message || '下单失败')
  } finally {
    ordering.value = false
  }
}

function openGroupOrder() {
  orderUseGroupPrice.value = true
  orderDialogVisible.value = true
}

async function handleJoinGroup() {
  if (!auth.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  groupLoading.value = true
  try {
    const res = await productApi.joinGroupBuy(route.params.id)
    groupBuy.value = res.groupBuy
    ElMessage.success(groupBuy.value.isFull ? '拼单已满员，可享拼单价下单' : '已加入拼单')
  } catch (e) {
    ElMessage.error(e.message || '加入失败')
  } finally {
    groupLoading.value = false
  }
}

async function handleLeaveGroup() {
  groupLoading.value = true
  try {
    const res = await productApi.leaveGroupBuy(route.params.id)
    groupBuy.value = res.groupBuy
    ElMessage.success('已退出拼单')
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    groupLoading.value = false
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
.video-wrap { height: 360px; background: #000; display: flex; align-items: center; justify-content: center; }
.product-video { max-width: 100%; max-height: 360px; }
.video-extra { margin-top: 12px; }
.product-video-sm { width: 100%; max-height: 200px; border-radius: 8px; background: #000; }
.no-img { height: 360px; background: var(--app-border); display: flex; align-items: center; justify-content: center; color: var(--app-muted); }
.price-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.price { color: #f56c6c; font-size: 28px; font-weight: 700; margin: 0; }
.actions { margin: 20px 0; display: flex; gap: 12px; flex-wrap: wrap; }
.group-buy-card { margin: 16px 0; }
.group-buy-card :deep(.el-card__header) {
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-desc { margin: 0 0 12px; font-size: 14px; color: var(--app-muted); }
.group-price { color: #f56c6c; font-size: 18px; }
.group-count { margin: 8px 0 12px; font-size: 13px; color: var(--app-muted); }
.group-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.seller { display: flex; gap: 12px; align-items: center; }
.desc { white-space: pre-wrap; line-height: 1.6; }
</style>
