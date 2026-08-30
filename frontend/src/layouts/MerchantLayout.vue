<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="aside" role="navigation" aria-label="商家中心导航">
      <div class="logo" role="heading" aria-level="1">商家中心</div>
      <el-menu router :default-active="$route.path" background-color="#2d6a4f" text-color="#d8f3dc" active-text-color="#ffd166" aria-label="商家菜单">
        <el-menu-item index="/merchant"><el-icon><Odometer /></el-icon>工作台</el-menu-item>
        <el-menu-item index="/merchant/products"><el-icon><Goods /></el-icon>商品管理</el-menu-item>
        <el-menu-item index="/merchant/orders"><el-icon><List /></el-icon>订单管理</el-menu-item>
        <el-menu-item index="/merchant/shop"><el-icon><Shop /></el-icon>店铺设置</el-menu-item>
        <el-menu-item index="/merchant/stats"><el-icon><DataAnalysis /></el-icon>数据统计</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header" role="banner">
        <span>{{ auth.user?.nickname }}（商家）</span>
        <el-button circle :icon="isDark ? Sunny : Moon" aria-label="切换深色模式" @click="toggleDark" />
        <el-button link aria-label="返回用户端" @click="$router.push('/')">返回用户端</el-button>
        <el-button link type="danger" aria-label="退出登录" @click="handleLogout">退出</el-button>
      </el-header>
      <el-main role="main"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { Odometer, Shop, Goods, List, DataAnalysis, Moon, Sunny } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useRouter } from 'vue-router'

const { isDark, toggle: toggleDark } = useDarkMode()
const auth = useAuthStore()
const router = useRouter()
function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-layout { min-height: 100vh; min-height: 100dvh; }
.aside { background: #2d6a4f; }
.logo { color: #fff; font-weight: 700; padding: 20px; text-align: center; }
.header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-header-bg);
  color: var(--app-text);
}
</style>
