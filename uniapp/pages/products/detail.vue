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
      <text class="desc">{{ product.description || '卖家很懒，什么都没写' }}</text>
    </view>

    <view v-if="groupBuy?.enabled" class="card group-card">
      <view class="group-head">
        <text class="section-title">拼单优惠</text>
        <text class="tag danger">¥{{ groupBuy.groupPrice }}</text>
      </view>
      <view class="progress-wrap">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: groupProgress + '%' }" />
        </view>
        <text class="muted">{{ groupBuy.participantCount }}/{{ groupBuy.minCount }} 人 · 还差 {{ groupBuy.remaining }} 人</text>
      </view>
      <view class="group-actions">
        <button v-if="canJoinGroup" size="mini" type="primary" @tap="handleJoinGroup">参与拼单</button>
        <button v-if="groupBuy.joined && !groupBuy.isFull" size="mini" @tap="handleLeaveGroup">退出拼单</button>
        <text v-if="groupBuy.joined && groupBuy.isFull" class="tag success">已满员，可下单</text>
      </view>
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

    <view class="footer-bar">
      <button class="fav-btn share-btn" open-type="share" size="mini">分享</button>
      <button class="fav-btn" size="mini" @tap="toggleFavorite">{{ favorited ? '已收藏' : '收藏' }}</button>
      <button v-if="canGroupOrder" class="buy-btn" type="primary" @tap="buyNow(true)">拼单价下单</button>
      <button v-else-if="canBuy" class="buy-btn" type="primary" @tap="buyNow(false)">立即购买</button>
      <button v-else-if="!loggedIn && product.status === 'on_sale' && !isOwner && !isExchange" class="buy-btn" type="primary" @tap="goLogin">登录购买</button>
      <button v-else-if="isExchange && canContact" class="buy-btn" type="primary" @tap="contactSeller">联系协商</button>
      <button v-else class="buy-btn" type="primary" disabled>{{ buyDisabledLabel }}</button>
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
    if (!shareProduct) return { title: '校园市集', path: '/pages/index/index' }
    return {
      title: shareProduct.title || '校园市集',
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
  joinGroupBuy,
  leaveGroupBuy,
} from '@/api/product'
import { create as createOrder } from '@/api/order'
import { getUser, ensureLogin, isLoggedIn, saveSession, getAccessToken, getRefreshToken } from '@/utils/auth'
import { getMe } from '@/api/auth'
import { getFileUrl } from '@/utils/fileUrl'
import { CONDITIONS, formatPrice } from '@/utils/format'
import { CATEGORIES, STATUS_LABELS, labelOf } from '@/constants/product'
import LoadState from '@/components/LoadState.vue'

const product = ref(null)
const shop = ref(null)
const groupBuy = ref(null)
const images = ref([])
const videoUrl = computed(() => getFileUrl(product.value?.video))
const favorited = ref(false)
const loading = ref(true)
const loadError = ref('')
const loggedIn = ref(false)
const userSnapshot = ref(null)
let productId = ''
let lastRefreshTime = 0
let firstShow = true

const user = computed(() => userSnapshot.value ?? getUser())
const isOwner = computed(() => {
  const sid = product.value?.sellerId?._id || product.value?.sellerId
  return sid?.toString() === user.value?._id?.toString()
})
const isExchange = computed(() => product.value?.tradeMode === 'exchange')
const canContact = computed(() => product.value?.status === 'on_sale' && !isOwner.value)
const canBuy = computed(
  () =>
    user.value &&
    user.value.role === 'student' &&
    user.value.studentVerified &&
    product.value?.status === 'on_sale' &&
    !isOwner.value &&
    !isExchange.value
)
const needVerify = computed(
  () =>
    user.value &&
    user.value.role === 'student' &&
    !user.value.studentVerified &&
    product.value?.status === 'on_sale' &&
    !isOwner.value &&
    !isExchange.value
)
const canJoinGroup = computed(
  () =>
    canBuy.value &&
    groupBuy.value?.enabled &&
    groupBuy.value?.status === 'open' &&
    !groupBuy.value.joined &&
    !groupBuy.value.isFull
)
const canGroupOrder = computed(() => canBuy.value && groupBuy.value?.joined && groupBuy.value.isFull)

const priceText = computed(() => {
  const p = product.value
  if (!p) return ''
  if (groupBuy.value?.enabled && groupBuy.value.groupPrice > 0) {
    return `拼单价 ¥${groupBuy.value.groupPrice}（原价 ¥${p.price}）`
  }
  return formatPrice(p.price, p.tradeMode)
})
const conditionText = computed(() => CONDITIONS[product.value?.condition] || product.value?.condition || '')
const categoryLabel = computed(() => labelOf(CATEGORIES, product.value?.category))
const statusTag = computed(() => STATUS_LABELS[product.value?.status] || '')
const statusTagClass = computed(() => {
  if (product.value?.status === 'on_sale') return 'success'
  if (product.value?.status === 'sold') return 'info'
  return 'warning'
})
const groupProgress = computed(() => {
  if (!groupBuy.value?.minCount) return 0
  return Math.min(100, Math.round((groupBuy.value.participantCount / groupBuy.value.minCount) * 100))
})
const buyDisabledLabel = computed(() => {
  if (isOwner.value) return '自己的商品'
  if (product.value?.status === 'sold') return '已售出'
  if (product.value?.status === 'off_shelf') return '已下架'
  if (needVerify.value) return '需学生认证'
  if (isExchange.value) return '以物换物'
  return '暂不可购'
})

onLoad((options) => {
  productId = options.id
  loadDetail()
})

onShow(refreshSession)

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
    groupBuy.value = res.groupBuy || null
    favorited.value = !!res.favorited
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

async function handleJoinGroup() {
  if (!ensureLogin()) return
  try {
    const res = await joinGroupBuy(productId)
    groupBuy.value = res.groupBuy
    uni.showToast({ title: '已参与拼单', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '参与失败', icon: 'none' })
  }
}

async function handleLeaveGroup() {
  uni.showModal({
    title: '退出拼单',
    content: '确定退出当前拼单？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        const data = await leaveGroupBuy(productId)
        groupBuy.value = data.groupBuy
        uni.showToast({ title: '已退出', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    },
  })
}

async function buyNow(useGroupPrice) {
  if (!ensureLogin()) return
  const p = product.value
  const price = useGroupPrice ? groupBuy.value.groupPrice : p.price
  uni.showModal({
    title: '确认下单',
    content: useGroupPrice ? `以拼单价 ¥${price} 下单？` : `以 ¥${price} 下单？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await createOrder({ productId: p._id, useGroupPrice: !!useGroupPrice })
        uni.showToast({ title: '下单成功', icon: 'success' })
        setTimeout(() => uni.navigateTo({ url: '/pages/orders/index' }), 500)
      } catch (e) {
        uni.showToast({ title: e.message || '下单失败', icon: 'none' })
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
.group-card .group-head { display: flex; justify-content: space-between; align-items: center; }
.progress-wrap { margin-top: 16rpx; }
.progress-bar { height: 12rpx; background: #ebeef5; border-radius: 6rpx; overflow: hidden; margin-bottom: 8rpx; }
.progress-fill { height: 100%; background: #409eff; border-radius: 6rpx; }
.group-actions { margin-top: 16rpx; display: flex; gap: 12rpx; align-items: center; }
.tip-card { background: #fdf6ec; color: #e6a23c; font-size: 26rpx; line-height: 1.5; display: flex; flex-direction: column; gap: 16rpx; }
.fav-btn { min-width: 140rpx; }
.buy-btn { flex: 1; }
</style>
