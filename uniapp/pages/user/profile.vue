<template>
  <view class="container">
    <view v-if="loading && !profile && !loadError" class="empty">加载中…</view>
    <LoadState
      v-else-if="loadError && !profile"
      :error="loadError"
      :has-data="false"
      :show-empty="false"
      @retry="load"
    />
    <template v-else-if="profile">
      <view class="card profile-head">
        <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill" />
        <view v-else class="avatar">{{ profile.user?.nickname?.[0] || '?' }}</view>
        <view class="profile-body">
          <text class="nickname">{{ profile.user?.nickname }}</text>
          <text class="muted">{{ profile.user?.regionId?.name || '' }}</text>
          <view class="tags">
            <text v-if="profile.user?.role === 'merchant'" class="tag warning">认证商家</text>
            <text v-else-if="profile.user?.studentVerified" class="tag success">学生认证</text>
            <text class="tag" :class="creditTag.type">信用 {{ creditScore }} · {{ creditTag.label }}</text>
          </view>
          <text v-if="profile.reviewStats?.count" class="review muted">
            交易评价 {{ profile.reviewStats.count }} 条
            <text v-if="profile.reviewStats.avgRating != null"> · 均分 {{ profile.reviewStats.avgRating }} 星</text>
          </text>
          <text v-if="profile.user?.bio" class="bio">{{ profile.user.bio }}</text>
        </view>
      </view>

      <view v-if="profile.shop" class="card shop-entry">
        <button type="primary" size="mini" @tap="goShop">进入店铺：{{ profile.shop.shopName }}</button>
      </view>

      <view v-if="showFriendActions" class="card friend-actions">
        <view v-if="relation === 'none'" class="friend-btn primary" @tap="onAddFriend">添加好友</view>
        <text v-else-if="relation === 'pending_out'" class="friend-status">好友申请已发送</text>
        <view v-else-if="relation === 'pending_in'" class="friend-btn primary" @tap="onAcceptFriend">通过好友申请</view>
        <text v-else-if="relation === 'friend'" class="friend-status ok">已是好友</text>
        <view v-if="relation === 'friend'" class="friend-btn ghost" @tap="onChat">发消息</view>
      </view>

      <text class="muted meta">在售商品 {{ profile.productCount || 0 }} 件</text>

      <view v-if="reviews.length" class="card">
        <text class="section-title">收到的评价</text>
        <view v-for="r in reviews" :key="r._id" class="review-item">
          <view class="review-head">
            <text class="reviewer">{{ r.reviewerId?.nickname || '用户' }}</text>
            <text class="stars">{{ starsText(r.rating) }}</text>
            <text class="time muted">{{ formatTime(r.createdAt) }}</text>
          </view>
          <text v-if="r.content" class="review-content">{{ r.content }}</text>
        </view>
      </view>

      <view v-if="products.length" class="section">
        <text class="section-title">Ta 的在售商品</text>
        <view class="grid-2">
          <view v-for="p in products" :key="p._id" class="grid-2-item">
            <ProductCard :product="p" />
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无在售商品</view>
    </template>
    <view v-else-if="!loading && !loadError" class="empty">用户不存在</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { getPublicUser } from '@/api/user'
import { getProducts } from '@/api/product'
import { sendFriendRequest, acceptFriendRequest } from '@/api/friend'
import { createConversation } from '@/api/chat'
import { getFileUrl } from '@/utils/fileUrl'
import { formatTime } from '@/utils/format'
import { getCreditLevel, starsText } from '@/constants/credit'
import { ensureLogin, getUser, isLoggedIn } from '@/utils/auth'
import ProductCard from '@/components/ProductCard.vue'
import LoadState from '@/components/LoadState.vue'

const loading = ref(false)
const loadError = ref('')
const profile = ref(null)
const products = ref([])
const relation = ref('none')
const friendshipId = ref(null)
let userId = ''
let acting = false

const avatarUrl = computed(() => getFileUrl(profile.value?.user?.avatar))
const creditScore = computed(() => profile.value?.creditScore ?? profile.value?.user?.creditScore ?? 100)
const creditTag = computed(() => getCreditLevel(creditScore.value))
const reviews = computed(() => profile.value?.recentReviews || [])
const showFriendActions = computed(() => {
  if (!isLoggedIn() || !profile.value?.user) return false
  const me = getUser()
  return me?._id && me._id !== userId && relation.value !== 'self'
})

onLoad((options) => {
  userId = options.id
  if (userId) {
    uni.setNavigationBarTitle({ title: '用户主页' })
    load()
  }
})

onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()))

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    profile.value = await getPublicUser(userId)
    relation.value = profile.value.relation || 'none'
    friendshipId.value = profile.value.friendshipId || null
    uni.setNavigationBarTitle({ title: profile.value.user?.nickname || '用户主页' })
    const regionId = profile.value.user.regionId?._id || profile.value.user.regionId
    const res = await getProducts({ regionId, sellerId: userId, pageSize: 8 })
    products.value = res.list || []
  } catch (e) {
    profile.value = null
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goShop() {
  uni.navigateTo({ url: `/pages/shop/index?userId=${userId}` })
}

async function onAddFriend() {
  if (!ensureLogin() || acting) return
  acting = true
  try {
    await sendFriendRequest({ userId })
    relation.value = 'pending_out'
    uni.showToast({ title: '申请已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    acting = false
  }
}

async function onAcceptFriend() {
  if (!friendshipId.value || acting) return
  acting = true
  try {
    await acceptFriendRequest(friendshipId.value)
    relation.value = 'friend'
    uni.showToast({ title: '已添加好友', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  } finally {
    acting = false
  }
}

async function onChat() {
  if (!ensureLogin() || acting) return
  acting = true
  try {
    const conv = await createConversation({ receiverId: userId })
    const id = conv?._id || conv?.id
    if (!id) throw new Error('无法发起聊天')
    const title = encodeURIComponent(profile.value?.user?.nickname || '聊天')
    uni.navigateTo({ url: `/pages/chat/room?id=${id}&title=${title}` })
  } catch (e) {
    uni.showToast({ title: e.message || '无法发起聊天', icon: 'none' })
  } finally {
    acting = false
  }
}
</script>

<style lang="scss" scoped>
.profile-head { display: flex; gap: 24rpx; align-items: flex-start; }
.avatar, .avatar-img {
  width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0;
}
.avatar {
  background: #409eff; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 40rpx;
}
.avatar-img { background: #eef2f7; }
.profile-body { flex: 1; min-width: 0; }
.nickname { display: block; font-size: 34rpx; font-weight: 600; }
.tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.review { display: block; margin-top: 12rpx; }
.bio { display: block; margin-top: 12rpx; color: #606266; font-size: 28rpx; line-height: 1.5; }
.shop-entry { padding: 20rpx 24rpx; }
.friend-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}
.friend-btn {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
}
.friend-btn.primary { background: #409eff; color: #fff; }
.friend-btn.ghost { background: #f5f7fa; color: #606266; }
.friend-status { font-size: 26rpx; color: #909399; }
.friend-status.ok { color: #67c23a; }
.meta { display: block; margin: 16rpx 0 24rpx; padding: 0 8rpx; }
.section { margin-top: 8rpx; }
.section-title { display: block; font-size: 32rpx; font-weight: 600; margin-bottom: 16rpx; }
.review-item { padding: 20rpx 0; border-bottom: 1rpx solid #ebeef5; }
.review-item:last-child { border-bottom: none; }
.review-head { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.reviewer { font-weight: 600; font-size: 28rpx; }
.stars { color: #e6a23c; font-size: 24rpx; }
.time { margin-left: auto; font-size: 22rpx; }
.review-content { display: block; margin-top: 10rpx; color: #606266; font-size: 26rpx; line-height: 1.5; }
</style>
