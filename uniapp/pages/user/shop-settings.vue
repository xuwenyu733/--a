<template>
  <view class="container">
    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="form" class="card">
      <text class="hint muted">修改店铺信息后，买家在店铺页可见</text>
      <text class="label">店铺名称 *</text>
      <input class="input" v-model="form.shopName" placeholder="店铺名称" />
      <text class="label">联系电话</text>
      <input class="input" type="number" v-model="form.contactPhone" placeholder="买家可致电咨询" />
      <text class="label">地址</text>
      <input class="input" v-model="form.address" placeholder="校内取货/面交地址" />
      <text class="label">简介</text>
      <textarea class="textarea" v-model="form.description" placeholder="店铺介绍" maxlength="200" />
      <button type="primary" class="btn-primary btn-block" :loading="saving" @tap="save">保存</button>
    </view>
    <view v-else class="empty">暂无店铺信息，请先完成商家入驻</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyShop, updateMyShop } from '@/api/merchant'
import { ensureLogin, getUser } from '@/utils/auth'

const loading = ref(false)
const saving = ref(false)
const form = ref(null)

onShow(() => {
  if (!ensureLogin()) return
  const u = getUser()
  if (u?.role !== 'merchant') {
    uni.showToast({ title: '仅商家可管理店铺', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 500)
    return
  }
  loadShop()
})

async function loadShop() {
  loading.value = true
  try {
    const shop = await getMyShop()
    form.value = {
      shopName: shop.shopName || '',
      contactPhone: shop.contactPhone || '',
      address: shop.address || '',
      description: shop.description || '',
    }
  } catch (e) {
    form.value = null
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value?.shopName?.trim()) {
    uni.showToast({ title: '请填写店铺名称', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await updateMyShop(form.value)
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.hint { display: block; margin-bottom: 20rpx; line-height: 1.5; }
.btn-block { margin-top: 32rpx; }
</style>
