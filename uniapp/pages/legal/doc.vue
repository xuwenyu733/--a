<template>
  <scroll-view class="page" scroll-y>
    <view class="card">
      <text class="brand">{{ LEGAL_META.brand }}</text>
      <text class="title">{{ doc.title }}</text>
      <text class="meta"
        >运营方：{{ LEGAL_META.operator }} · {{ LEGAL_META.creditCode }} · 经营者
        {{ LEGAL_META.legalPerson }}</text
      >
      <text class="meta"
        >联系方式：{{ LEGAL_META.phone }} · {{ LEGAL_META.email }}</text
      >
      <text class="meta">更新日期：{{ LEGAL_META.updatedAt }}</text>

      <view v-for="(s, i) in doc.sections" :key="i" class="section">
        <text class="heading">{{ s.heading }}</text>
        <text class="body">{{ s.body }}</text>
      </view>

      <view class="footer-links">
        <text class="link" @tap="openOther">查看{{ other.title }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { LEGAL_META, getLegalDoc, privacyDoc, termsDoc } from '@/content/legal'

const kind = ref('privacy')
const doc = computed(() => getLegalDoc(kind.value))
const other = computed(() => (kind.value === 'terms' ? privacyDoc : termsDoc))

onLoad((query) => {
  kind.value = query?.kind === 'terms' ? 'terms' : 'privacy'
  uni.setNavigationBarTitle({ title: doc.value.title })
})

function openOther() {
  uni.redirectTo({ url: `/pages/legal/doc?kind=${other.value.kind}` })
}
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #f5f7fa;
  box-sizing: border-box;
}
.card {
  margin: 24rpx;
  padding: 36rpx 32rpx 48rpx;
  background: #fff;
  border-radius: 20rpx;
}
.brand {
  display: block;
  font-size: 24rpx;
  color: #0f766e;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-bottom: 8rpx;
}
.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #111827;
  margin-bottom: 12rpx;
}
.meta {
  display: block;
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 32rpx;
}
.section {
  margin-bottom: 28rpx;
}
.heading {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #134e4a;
  margin-bottom: 10rpx;
}
.body {
  display: block;
  font-size: 28rpx;
  line-height: 1.7;
  color: #4b5563;
}
.footer-links {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #ebeef5;
  text-align: center;
}
.link {
  font-size: 28rpx;
  color: #409eff;
}
</style>
