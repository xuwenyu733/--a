<template>
  <view class="container">
    <view v-if="loading && !shop && !loadError" class="empty">加载中…</view>
    <LoadState
      v-else-if="loadError && !shop"
      :error="loadError"
      :has-data="false"
      :show-empty="false"
      @retry="() => load(true)"
    />
    <template v-else-if="shop">
      <view class="card shop-header">
        <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill" @tap="goProfile" />
        <view v-else class="avatar" @tap="goProfile">{{ user?.nickname?.[0] || '商' }}</view>
        <view class="info">
          <text class="shop-name">{{ shop.shopName }}</text>
          <text class="muted owner" @tap="goProfile">店主：{{ user?.nickname || '商家' }} ›</text>
          <text class="muted">{{ shop.description || '认证商家店铺' }}</text>
          <text class="addr muted">📍 {{ shop.address || '地址待完善' }}</text>
          <text v-if="shop.contactPhone" class="phone muted" @tap="callPhone">📞 {{ shop.contactPhone }}</text>
          <text class="tag warning">认证商家</text>
        </view>
      </view>

      <text class="section-title">店铺商品（{{ total }}）</text>
      <view v-if="products.length" class="grid-2">
        <view v-for="p in products" :key="p._id" class="grid-2-item">
          <ProductCard :product="p" />
        </view>
      </view>
      <view v-else class="empty">暂无在售商品</view>
      <view v-if="hasMore" class="load-more">
        <button size="mini" :loading="loadingMore" @tap="loadMore">加载更多</button>
      </view>
    </template>
    <view v-else-if="!loading && !loadError" class="empty">店铺不存在或未营业</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { getPublicShop } from '@/api/merchant'
import { getFileUrl } from '@/utils/fileUrl'
import ProductCard from '@/components/ProductCard.vue'
import LoadState from '@/components/LoadState.vue'

const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref('')
const shop = ref(null)
const user = ref(null)
const products = ref([])
const page = ref(1)
const total = ref(0)
let userId = ''

const hasMore = computed(() => products.value.length < total.value)
const avatarUrl = computed(() => getFileUrl(user.value?.avatar))

onLoad((options) => {
  userId = options.userId
  if (userId) load(true)
})

onPullDownRefresh(() => load(true).finally(() => uni.stopPullDownRefresh()))

async function load(reset) {
  if (reset) {
    loading.value = true
    page.value = 1
    loadError.value = ''
  } else {
    loadingMore.value = true
  }
  try {
    const nextPage = reset ? 1 : page.value + 1
    const data = await getPublicShop(userId, { page: nextPage, pageSize: 12 })
    shop.value = data.shop
    user.value = data.user
    const list = data.products?.list || []
    total.value = data.products?.pagination?.total ?? list.length
    products.value = reset ? list : [...products.value, ...list]
    page.value = nextPage
    uni.setNavigationBarTitle({ title: data.shop?.shopName || '店铺' })
  } catch (e) {
    if (reset) {
      shop.value = null
      loadError.value = e.message || '加载失败'
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (hasMore.value && !loadingMore.value) load(false)
}

function goProfile() {
  if (userId) uni.navigateTo({ url: `/pages/user/profile?id=${userId}` })
}

function callPhone() {
  const phone = shop.value?.contactPhone
  if (!phone) return
  uni.makePhoneCall({ phoneNumber: String(phone) })
}
</script>

<style lang="scss" scoped>
.shop-header { display: flex; gap: 24rpx; align-items: flex-start; }
.avatar, .avatar-img {
  width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0;
}
.avatar {
  background: #e6a23c; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 40rpx;
}
.avatar-img { background: #eef2f7; }
.shop-name { display: block; font-size: 34rpx; font-weight: 700; margin-bottom: 8rpx; }
.owner { display: block; margin-bottom: 8rpx; }
.addr, .phone { display: block; margin: 8rpx 0; }
.section-title { display: block; font-size: 32rpx; font-weight: 600; margin: 24rpx 0 16rpx; }
.load-more { text-align: center; padding: 24rpx 0; }
</style>
