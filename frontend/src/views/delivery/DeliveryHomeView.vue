<template>
  <div class="delivery-home">
    <header class="hero">
      <h1>校园跑腿</h1>
      <p>外卖代取 · 快递代取 · 校内互助配送</p>
    </header>

    <div class="cards">
      <el-card shadow="hover" class="card" @click="$router.push('/delivery/post')">
        <div class="icon">📦</div>
        <h3>发布需求</h3>
        <p>填写取件/送达地址，发布跑腿订单</p>
        <el-button type="primary">我要下单</el-button>
      </el-card>
      <el-card shadow="hover" class="card" @click="goHall">
        <div class="icon">🛵</div>
        <h3>骑手接单</h3>
        <p>认证骑手可浏览待接订单</p>
        <el-button type="success">{{ auth.user?.courierVerified ? '进入大厅' : '申请成为骑手' }}</el-button>
      </el-card>
      <el-card shadow="hover" class="card" @click="$router.push('/delivery/orders')">
        <div class="icon">📋</div>
        <h3>我的订单</h3>
        <p>查看我发布的或接取的跑腿单</p>
        <el-button>查看订单</el-button>
      </el-card>
    </div>

    <el-alert
      v-if="auth.user?.courierVerified && !loadingOpen && openCount > 0"
      :title="`当前有 ${openCount} 单待接，点击进入接单大厅`"
      type="success"
      show-icon
      :closable="false"
      class="tip tip--open"
      @click="router.push('/delivery/hall')"
    />

    <el-alert
      v-if="auth.isLoggedIn && !auth.user?.courierVerified"
      title="任何人都可以申请成为骑手，管理员审核通过后即可接单"
      type="info"
      show-icon
      :closable="false"
      class="tip"
    >
      <template #default>
        <el-button link type="primary" @click="$router.push('/user/verify/courier')">去申请骑手</el-button>
      </template>
    </el-alert>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as deliveryApi from '@/api/delivery'

const auth = useAuthStore()
const router = useRouter()
const openCount = ref(0)
const loadingOpen = ref(false)

onMounted(async () => {
  if (!auth.user?.courierVerified) return
  loadingOpen.value = true
  try {
    const res = await deliveryApi.getOpenDeliveryOrders({ pageSize: 1 })
    openCount.value = res.pagination?.acceptableTotal ?? 0
  } catch (e) {
    console.warn('load open delivery orders failed', e)
    openCount.value = 0
  } finally {
    loadingOpen.value = false
  }
})

function goHall() {
  if (!auth.user?.courierVerified) {
    router.push('/user/verify/courier')
    return
  }
  router.push('/delivery/hall')
}
</script>

<style scoped>
.delivery-home {
  max-width: 960px;
  margin: 0 auto;
}
.hero {
  text-align: center;
  margin-bottom: 24px;
}
.hero h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
}
.hero p {
  margin: 0;
  color: var(--app-muted);
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.card {
  text-align: center;
  cursor: pointer;
  border-radius: 12px;
  transition: transform 0.2s;
}
.card:hover {
  transform: translateY(-2px);
}
.icon {
  font-size: 36px;
  margin-bottom: 8px;
}
.card h3 {
  margin: 0 0 8px;
}
.card p {
  font-size: 13px;
  color: var(--app-muted);
  margin: 0 0 16px;
  min-height: 40px;
}
.tip {
  margin-top: 8px;
}
.tip--open {
  cursor: pointer;
}
@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
