<template>
  <el-card v-loading="loading">
    <template #header>个人中心</template>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    >
      <el-button link type="primary" @click="loadProfile">重试</el-button>
    </el-alert>

    <el-empty v-if="!loading && !error && !auth.user" description="未登录或用户信息不可用">
      <el-button type="primary" @click="$router.push('/login')">去登录</el-button>
    </el-empty>

    <template v-else-if="auth.user">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="昵称">{{ auth.user.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ auth.user.phone }}</el-descriptions-item>
        <el-descriptions-item label="身份">{{ ROLE_LABELS[auth.user.role] }}</el-descriptions-item>
        <el-descriptions-item label="区域">{{ auth.user.regionId?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="学生认证">
          <el-tag :type="auth.user.studentVerified ? 'success' : 'info'">
            {{ auth.user.studentVerified ? '已认证' : '未认证' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="骑手认证">
          <el-tag :type="auth.user.courierVerified ? 'success' : 'info'">
            {{ auth.user.courierVerified ? '已认证' : '未认证' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="账号状态">{{ auth.user.status }}</el-descriptions-item>
        <el-descriptions-item label="信用分">
          <CreditTag :score="auth.user.creditScore ?? 100" />
        </el-descriptions-item>
      </el-descriptions>
      <div class="actions">
        <el-button @click="$router.push('/user/settings')">账号设置</el-button>
        <el-button @click="pwdVisible = true">修改密码</el-button>
        <el-button type="primary" @click="$router.push('/user/products')">我的发布</el-button>
        <el-button @click="$router.push('/user/favorites')">我的收藏</el-button>
        <el-button @click="$router.push('/cart')">购物车</el-button>
        <el-button @click="$router.push('/user/orders')">二手订单</el-button>
        <el-button type="warning" plain @click="$router.push('/delivery')">校园跑腿</el-button>
        <el-button @click="$router.push('/delivery/orders')">跑腿订单</el-button>
        <el-button @click="$router.push('/user/verify/student')">学生认证</el-button>
        <el-button @click="$router.push('/user/verify/merchant')">申请商家入驻</el-button>
        <el-button type="success" plain @click="$router.push('/user/verify/courier')">
          {{ auth.user.courierVerified ? '骑手信息' : '申请成为骑手' }}
        </el-button>
      </div>
    </template>
  </el-card>
  <ChangePasswordDialog v-model="pwdVisible" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS } from '@/constants/roles'
import CreditTag from '@/components/CreditTag.vue'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const auth = useAuthStore()
const pwdVisible = ref(false)
const loading = ref(false)
const error = ref('')

async function loadProfile() {
  if (!auth.isLoggedIn) return
  loading.value = true
  error.value = ''
  try {
    await auth.fetchMe()
  } catch (e) {
    error.value = e.message || '加载用户信息失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
