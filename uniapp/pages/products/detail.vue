<template>
  <view class="container page-with-footer" v-if="product">
    <swiper v-if="images.length" class="gallery" indicator-dots circular>
      <swiper-item v-for="(img, i) in images" :key="i">
        <image
          class="gallery-img"
          :src="img"
          mode="aspectFill"
          :lazy-load="i > 0"
          @tap="preview(img)"
        />
      </swiper-item>
    </swiper>
    <view v-else class="gallery empty">暂无图片</view>

    <view v-if="videoUrl" class="video-wrap">
      <video :src="videoUrl" class="video-player" controls />
    </view>

    <view class="card">
      <view class="head-row">
        <text v-if="statusTag" class="tag" :class="statusTagClass">{{ statusTag }}</text>
        <text v-if="categoryLabel" class="muted">{{ categoryLabel }}</text>
      </view>
      <text class="title">{{ product.title }}</text>
      <text class="price">{{ priceText }}</text>
      <text class="muted meta-line">成色：{{ conditionText }} · {{ product.location || '校内面交' }}</text>
      <text v-if="canSeeStock" class="muted meta-line">库存：{{ product.stock ?? 0 }}</text>
      <text class="desc">{{ product.description || '卖家很懒，什么都没写' }}</text>
    </view>

    <view class="card seller">
      <view @tap="goSellerProfile">
        <text>卖家：{{ product.sellerId?.nickname || '用户' }}</text>
        <text v-if="shop?.shopName" class="muted shop-name">{{ shop.shopName }}</text>
      </view>
      <view class="seller-actions">
        <button v-if="shop?.shopName || product.sellerType === 'merchant'" size="mini" @tap="goShop">店铺</button>
        <button v-if="canContact" size="mini" @tap="contactSeller">联系</button>
      </view>
    </view>

    <view v-if="needVerify" class="card tip-card">
      <text>购买需完成学生认证。</text>
      <button size="mini" type="primary" @tap="goVerify">去学生认证</button>
    </view>

    <view v-if="canBuy" class="card qty-card">
      <text class="qty-label">购买数量</text>
      <view class="qty-stepper">
        <view class="qty-btn" @tap="changeQty(-1)">−</view>
        <text class="qty-num">{{ buyQty }}</text>
        <view class="qty-btn" @tap="changeQty(1)">+</view>
      </view>
    </view>

    <view class="footer-bar detail-footer">
      <view class="footer-side">
        <CartEntryBtn ref="cartBtnRef" variant="footer" label="购物车" />
        <button class="side-item" open-type="share" hover-class="side-item-hover">
          <text class="side-ico">↗</text>
          <text class="side-lab">分享</text>
        </button>
        <view class="side-item" @tap="toggleFavorite">
          <text class="side-ico">{{ favorited ? '★' : '☆' }}</text>
          <text class="side-lab">{{ favorited ? '已藏' : '收藏' }}</text>
        </view>
      </view>
      <view class="footer-main">
        <button v-if="canBuy" class="action-btn cart-btn" @tap="addCart">加入购物车</button>
        <button v-if="canBuy" class="action-btn buy-btn" @tap="buyNow">立即下单</button>
        <button
          v-else-if="!loggedIn && product.status === 'on_sale' && !isOwner"
          class="action-btn buy-btn"
          @tap="goLogin"
        >登录购买</button>
        <button v-else class="action-btn buy-btn is-disabled" disabled>{{ buyDisabledLabel }}</button>
      </view>
    </view>
  </view>
  <view v-else-if="loading" class="empty">加载中…</view>
  <LoadState
    v-else-if="loadError"
    :error="loadError"
    :has-data="false"
    :show-empty="false"
    @retry="loadDetail"
  />
</template>

<script>
// Store refs for onShareAppMessage access
let shareProduct = null
let shareImages = []

export default {
  onShareAppMessage() {
    if (!shareProduct) return { title: '校园二手', path: '/pages/index/index' }
    return {
      title: shareProduct.title || '校园二手',
      path: `/pages/products/detail?id=${shareProduct._id}`,
      imageUrl: shareImages[0] || '',
    }
  },
}
</script>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  getDetail,
  toggleFavorite as toggleFavoriteApi,
  contactSeller as contactSellerApi,
} from '@/api/product'
import { create as createOrder } from '@/api/order'
import { addToCart } from '@/api/cart'
import { getUser, ensureLogin, isLoggedIn, saveSession, getAccessToken, getRefreshToken } from '@/utils/auth'
import { getMe } from '@/api/auth'
import { getFileUrl } from '@/utils/fileUrl'
import { CONDITIONS, formatPrice } from '@/utils/format'
import { CATEGORIES, STATUS_LABELS, labelOf } from '@/constants/product'
import LoadState from '@/components/LoadState.vue'
import CartEntryBtn from '@/components/CartEntryBtn.vue'

const product = ref(null)
const shop = ref(null)
const images = ref([])
const videoUrl = computed(() => getFileUrl(product.value?.video))
const favorited = ref(false)
const loading = ref(true)
const loadError = ref('')
const loggedIn = ref(false)
const userSnapshot = ref(null)
const cartBtnRef = ref(null)
const buyQty = ref(1)
let productId = ''
let lastRefreshTime = 0
let firstShow = true

const maxBuyQty = computed(() => {
  const stock = Number(product.value?.stock)
  if (Number.isFinite(stock) && stock > 0) return Math.min(99, stock)
  return 99
})

function changeQty(delta) {
  const next = buyQty.value + delta
  buyQty.value = Math.min(maxBuyQty.value, Math.max(1, next))
}

const user = computed(() => userSnapshot.value ?? getUser())
const isOwner = computed(() => {
  const sid = product.value?.sellerId?._id || product.value?.sellerId
  return sid?.toString() === user.value?._id?.toString()
})
const canContact = computed(() => product.value?.status === 'on_sale' && !isOwner.value)
const canSeeStock = computed(() => {
  if (!product.value || product.value.stock == null) return false
  if (isOwner.value) return true
  return user.value?.role === 'super_admin'
})
const canBuy = computed(
  () =>
    user.value &&
    user.value.role === 'student' &&
    user.value.studentVerified &&
    product.value?.status === 'on_sale' &&
    !isOwner.value
)
const needVerify = computed(
  () =>
    user.value &&
    user.value.role === 'student' &&
    !user.value.studentVerified &&
    product.value?.status === 'on_sale' &&
    !isOwner.value
)

const priceText = computed(() => {
  const p = product.value
  if (!p) return ''
  return formatPrice(p.price)
})
const conditionText = computed(() => CONDITIONS[product.value?.condition] || product.value?.condition || '')
const categoryLabel = computed(() => labelOf(CATEGORIES, product.value?.category))
const statusTag = computed(() => STATUS_LABELS[product.value?.status] || '')
const statusTagClass = computed(() => {
  if (product.value?.status === 'on_sale') return 'success'
  if (product.value?.status === 'sold') return 'info'
  return 'warning'
})
const buyDisabledLabel = computed(() => {
  if (isOwner.value) return '自己的商品'
  if (product.value?.status === 'sold') return '已售出'
  if (product.value?.status === 'off_shelf') return '已下架'
  if (needVerify.value) return '需学生认证'
  return '暂不可购'
})

onLoad((options) => {
  productId = options.id
  loadDetail()
})

onShow(async () => {
  await refreshSession()
  cartBtnRef.value?.refresh?.()
})

async function refreshSession() {
  loggedIn.value = isLoggedIn()
  if (!loggedIn.value) {
    userSnapshot.value = null
    return
  }
  // Avoid repeated /auth/me calls: only refresh after 30s or on first show
  const now = Date.now()
  if (!firstShow && now - lastRefreshTime < 30000) return
  firstShow = false
  lastRefreshTime = now
  try {
    const data = await getMe()
    if (data?.user) {
      saveSession({ user: data.user, accessToken: getAccessToken(), refreshToken: getRefreshToken() })
      userSnapshot.value = data.user
    } else {
      userSnapshot.value = getUser()
    }
  } catch {
    userSnapshot.value = getUser()
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

async function loadDetail() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getDetail(productId)
    const p = res.product || res
    product.value = p
    shop.value = res.shop || null
    favorited.value = !!res.favorited
    buyQty.value = 1
    images.value = (p.images || []).map(getFileUrl)
    shareProduct = p
    shareImages = images.value
  } catch (e) {
    product.value = null
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function preview(url) {
  uni.previewImage({ current: url, urls: images.value })
}

async function toggleFavorite() {
  if (!ensureLogin()) return
  try {
    const res = await toggleFavoriteApi(productId)
    favorited.value = !!res.favorited
    uni.showToast({ title: favorited.value ? '已收藏' : '已取消', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

async function contactSeller() {
  if (!ensureLogin()) return
  try {
    const conv = await contactSellerApi(productId)
    uni.navigateTo({ url: `/pages/chat/room?id=${conv._id}&title=${encodeURIComponent(product.value.sellerId?.nickname || '聊天')}` })
  } catch (e) {
    uni.showToast({ title: e.message || '无法发起聊天', icon: 'none' })
  }
}

function goSellerProfile() {
  const sid = product.value?.sellerId?._id || product.value?.sellerId
  if (sid) uni.navigateTo({ url: `/pages/user/profile?id=${sid}` })
}

function goShop() {
  const sid = product.value?.sellerId?._id || product.value?.sellerId
  if (sid) uni.navigateTo({ url: `/pages/shop/index?userId=${sid}` })
}

function goVerify() {
  uni.navigateTo({ url: '/pages/user/verify-student' })
}

async function addCart() {
  if (!ensureLogin()) return
  const p = product.value
  try {
    await addToCart({ productId: p._id, quantity: buyQty.value })
    uni.showToast({ title: '已加入购物车', icon: 'success' })
    cartBtnRef.value?.refresh?.()
  } catch (e) {
    uni.showToast({ title: e.message || '加购失败', icon: 'none' })
    loadDetail()
  }
}

async function buyNow() {
  if (!ensureLogin()) return
  const p = product.value
  const total = (Number(p.price) * buyQty.value).toFixed(2)
  uni.showModal({
    title: '确认下单',
    content: `数量 ${buyQty.value}，合计 ¥${total}，确认立即下单？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await createOrder({ productId: p._id, quantity: buyQty.value })
        uni.showToast({ title: '下单成功', icon: 'success' })
        setTimeout(() => uni.navigateTo({ url: '/pages/orders/index' }), 500)
      } catch (e) {
        uni.showToast({ title: e.message || '下单失败', icon: 'none' })
        loadDetail()
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.gallery { height: 560rpx; border-radius: 16rpx; overflow: hidden; margin-bottom: 24rpx; }
.gallery.empty { background: #eef2f7; display: flex; align-items: center; justify-content: center; color: #909399; }
.gallery-img { width: 100%; height: 560rpx; }
.video-wrap { margin-bottom: 24rpx; border-radius: 16rpx; overflow: hidden; }
.video-player { width: 100%; height: 360rpx; }
.head-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { display: block; font-size: 36rpx; font-weight: 600; line-height: 1.4; }
.price { display: block; margin: 16rpx 0; color: #f56c6c; font-size: 40rpx; font-weight: 700; }
.meta-line { display: block; }
.desc { display: block; margin-top: 20rpx; line-height: 1.6; color: #606266; font-size: 28rpx; }
.seller { display: flex; justify-content: space-between; align-items: center; }
.seller-actions { display: flex; gap: 12rpx; }
.shop-name { display: block; margin-top: 8rpx; }
.tip-card { background: #fdf6ec; color: #e6a23c; font-size: 26rpx; line-height: 1.5; display: flex; flex-direction: column; gap: 16rpx; }
.qty-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.qty-label { font-size: 28rpx; color: #303133; }
.qty-stepper { display: flex; align-items: center; gap: 8rpx; }
.qty-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background: #f2f3f5;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
}
.qty-num {
  min-width: 64rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
}

.detail-footer {
  gap: 12rpx;
  padding: 12rpx 20rpx calc(12rpx + env(safe-area-inset-bottom));
}

.footer-side {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4rpx;
}

.side-item {
  width: 88rpx;
  height: 88rpx;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  line-height: 1.1;
  font-size: inherit;
  color: #606266;
}

.side-item::after {
  border: none;
}

.side-item-hover {
  opacity: 0.7;
}

.side-ico {
  font-size: 32rpx;
  line-height: 1;
  color: #303133;
}

.side-lab {
  font-size: 20rpx;
  color: #909399;
  line-height: 1;
}

.footer-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  margin: 0;
  padding: 0 12rpx;
  border-radius: 36rpx;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 72rpx;
  border: none;
}

.action-btn::after {
  border: none;
}

.cart-btn {
  background: #fff7e6;
  color: #e6a23c;
  border: 1rpx solid #f5dab1;
}

.buy-btn {
  background: #409eff;
  color: #fff;
}

.buy-btn.is-disabled,
.buy-btn[disabled] {
  background: #c0c4cc;
  color: #fff;
  opacity: 1;
}
</style>
