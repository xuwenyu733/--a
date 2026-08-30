<template>
  <div v-loading="loading" class="profile-page">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <template v-if="profile">
      <el-card>
        <div class="profile-head">
          <el-avatar :size="72" :src="fileUrl(profile.user?.avatar)">{{ profile.user?.nickname?.[0] }}</el-avatar>
          <div>
            <h2>{{ profile.user?.nickname }}</h2>
            <p>{{ profile.user?.regionId?.name }}</p>
            <el-tag v-if="profile.user?.role === 'merchant'" type="warning">认证商家</el-tag>
            <el-tag v-else-if="profile.user?.studentVerified" type="success">学生认证</el-tag>
            <div class="credit-row">
              <CreditTag :score="profile.creditScore ?? profile.user?.creditScore ?? 100" />
            </div>
            <p v-if="profile.reviewStats?.count" class="review-summary">
              交易评价 {{ profile.reviewStats.count }} 条
              <template v-if="profile.reviewStats.avgRating != null">
                · 均分 {{ profile.reviewStats.avgRating }} 星
              </template>
            </p>
            <p v-if="profile.user?.bio" class="bio">{{ profile.user.bio }}</p>
          </div>
        </div>
        <div v-if="profile.shop" class="shop-link">
          <el-button type="primary" @click="$router.push(`/shop/${profile.user._id}`)">
            进入店铺：{{ profile.shop.shopName }}
          </el-button>
        </div>
        <p class="meta">在售商品 {{ profile.productCount }} 件</p>
      </el-card>

      <el-card v-if="profile.recentReviews?.length" style="margin-top:16px">
        <template #header>收到的评价</template>
        <div v-for="r in profile.recentReviews" :key="r._id" class="review-item">
          <div class="review-head">
            <el-avatar :size="32" :src="fileUrl(r.reviewerId?.avatar)">
              {{ r.reviewerId?.nickname?.[0] }}
            </el-avatar>
            <strong>{{ r.reviewerId?.nickname }}</strong>
            <el-rate :model-value="r.rating" disabled size="small" />
            <span class="review-time">{{ formatTime(r.createdAt) }}</span>
          </div>
          <p v-if="r.content" class="review-content">{{ r.content }}</p>
        </div>
      </el-card>

      <el-card style="margin-top:16px" v-if="products.length">
        <template #header>Ta 的在售商品</template>
        <el-row :gutter="16">
          <el-col v-for="p in products" :key="p._id" :xs="12" :sm="8" :md="6">
            <ProductCard :product="p" />
          </el-col>
        </el-row>
      </el-card>
    </template>
    <el-empty v-else-if="!loading && !error" description="用户不存在" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as userApi from '@/api/user'
import * as productApi from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'
import { getFileUrl } from '@/utils/fileUrl'
import CreditTag from '@/components/CreditTag.vue'

const fileUrl = getFileUrl
const route = useRoute()
const loading = ref(false)
const error = ref('')
const profile = ref(null)
const products = ref([])

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN') : ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    profile.value = await userApi.getPublicUser(route.params.id)
    const res = await productApi.getProducts({
      regionId: profile.value.user.regionId?._id || profile.value.user.regionId,
      sellerId: route.params.id,
      pageSize: 8,
    })
    products.value = res.list
  } catch (e) {
    profile.value = null
    error.value = e.message || '加载用户信息失败'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<style scoped>
.profile-page { max-width: 900px; margin: 0 auto; }
.profile-head { display: flex; gap: 20px; align-items: flex-start; }
.profile-head h2 { margin: 0 0 8px; }
.credit-row { margin-top: 8px; }
.review-summary { margin-top: 8px; font-size: 13px; color: var(--el-color-warning); }
.bio { margin-top: 8px; color: #606266; }
.shop-link { margin-top: 16px; }
.meta { margin-top: 12px; color: #909399; font-size: 14px; }
.review-item { padding: 12px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.review-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.review-time { font-size: 12px; color: var(--el-text-color-secondary); margin-left: auto; }
.review-content { margin: 8px 0 0 40px; font-size: 13px; color: var(--el-text-color-regular); }
</style>
