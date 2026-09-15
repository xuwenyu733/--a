<template>
  <div class="cart-page" v-loading="loading">
    <div class="cart-head">
      <h2>购物车</h2>
      <el-button v-if="list.length" link type="danger" @click="handleClear">清空</el-button>
    </div>

    <el-empty v-if="!loading && !list.length" description="购物车是空的">
      <el-button type="primary" @click="$router.push('/products')">去逛逛</el-button>
    </el-empty>

    <template v-else-if="list.length">
      <div class="cart-list">
        <div v-for="item in list" :key="item._id" class="cart-item">
          <el-checkbox v-model="selectedMap[item._id]" :disabled="!isBuyable(item)" />
          <img
            class="thumb"
            :src="fileUrl(item.productId?.images?.[0])"
            alt=""
            @click="goDetail(item)"
          />
          <div class="info">
            <div class="title" @click="goDetail(item)">{{ item.productId?.title || '商品已失效' }}</div>
            <div class="meta">
              <span class="price">¥{{ item.productId?.price ?? '-' }}</span>
              <span v-if="!isBuyable(item)" class="warn">不可购买</span>
              <span v-else class="stock">库存 {{ item.productId?.stock ?? 0 }}</span>
            </div>
            <div class="row">
              <el-input-number
                v-model="item.quantity"
                :min="1"
                :max="Math.max(1, Number(item.productId?.stock) || 1)"
                size="small"
                :disabled="!isBuyable(item)"
                @change="(v) => handleQty(item, v)"
              />
              <el-button link type="danger" @click="handleRemove(item)">删除</el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="cart-footer">
        <el-checkbox v-model="selectAll" :indeterminate="isIndeterminate" @change="toggleSelectAll">
          全选
        </el-checkbox>
        <div class="summary">
          已选 {{ selectedIds.length }} 件，合计
          <strong class="price">¥{{ totalPrice.toFixed(2) }}</strong>
        </div>
        <el-button type="danger" :disabled="!selectedIds.length" :loading="checkingOut" @click="handleCheckout">
          结算
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as cartApi from '@/api/cart'
import { getFileUrl } from '@/utils/fileUrl'

const fileUrl = getFileUrl
const router = useRouter()
const loading = ref(false)
const checkingOut = ref(false)
const list = ref([])
const selectedMap = reactive({})

function isBuyable(item) {
  const p = item.productId
  return p && p.status === 'on_sale' && Number(p.stock) >= 1
}

const selectedIds = computed(() =>
  list.value.filter((i) => selectedMap[i._id] && isBuyable(i)).map((i) => i._id)
)

const buyableList = computed(() => list.value.filter(isBuyable))

const selectAll = computed({
  get: () => buyableList.value.length > 0 && buyableList.value.every((i) => selectedMap[i._id]),
  set: () => {},
})

const isIndeterminate = computed(() => {
  const n = selectedIds.value.length
  return n > 0 && n < buyableList.value.length
})

const totalPrice = computed(() =>
  list.value
    .filter((i) => selectedMap[i._id] && isBuyable(i))
    .reduce((sum, i) => sum + Number(i.productId?.price || 0) * Number(i.quantity || 1), 0)
)

function toggleSelectAll(val) {
  buyableList.value.forEach((i) => {
    selectedMap[i._id] = !!val
  })
}

function goDetail(item) {
  const id = item.productId?._id
  if (id) router.push(`/products/${id}`)
}

async function load() {
  loading.value = true
  try {
    const data = await cartApi.getCart()
    list.value = data.list || []
    list.value.forEach((i) => {
      if (selectedMap[i._id] === undefined) selectedMap[i._id] = isBuyable(i)
    })
  } catch (e) {
    ElMessage.error(e.message || '加载购物车失败')
  } finally {
    loading.value = false
  }
}

async function handleQty(item, qty) {
  if (!qty || qty < 1) return
  try {
    const updated = await cartApi.updateCartItem(item._id, { quantity: qty })
    Object.assign(item, updated)
  } catch (e) {
    ElMessage.error(e.message || '更新失败')
    load()
  }
}

async function handleRemove(item) {
  await ElMessageBox.confirm('从购物车移除该商品？', '提示', { type: 'warning' })
  await cartApi.removeCartItem(item._id)
  delete selectedMap[item._id]
  ElMessage.success('已移除')
  load()
}

async function handleClear() {
  await ElMessageBox.confirm('清空购物车？', '提示', { type: 'warning' })
  await cartApi.clearCart()
  Object.keys(selectedMap).forEach((k) => delete selectedMap[k])
  ElMessage.success('已清空')
  load()
}

async function handleCheckout() {
  if (!selectedIds.value.length) return
  checkingOut.value = true
  try {
    const data = await cartApi.checkoutCart({ itemIds: selectedIds.value })
    ElMessage.success(data.failedCount ? `成功 ${data.successCount} 件，失败 ${data.failedCount} 件` : '下单成功')
    router.push('/user/orders')
  } catch (e) {
    ElMessage.error(e.message || '结算失败')
    load()
  } finally {
    checkingOut.value = false
  }
}

watch(
  () => list.value.map((i) => i._id).join(','),
  () => {
    list.value.forEach((i) => {
      if (selectedMap[i._id] === undefined) selectedMap[i._id] = isBuyable(i)
    })
  }
)

onMounted(load)
</script>

<style scoped>
.cart-page {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 88px;
}
.cart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.cart-head h2 {
  margin: 0;
  font-size: 20px;
}
.cart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cart-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}
.thumb {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 8px;
  background: #f2f3f5;
  cursor: pointer;
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 8px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.price {
  color: #f56c6c;
  font-weight: 700;
}
.warn {
  color: #e6a23c;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cart-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  z-index: 20;
}
.summary {
  flex: 1;
  text-align: right;
}
</style>
