<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="aside" role="navigation" aria-label="代理后台导航">
      <div class="logo" role="heading" aria-level="1">代理后台</div>
      <el-menu router :default-active="$route.path" background-color="#1d4e89" text-color="#bfcbd9" active-text-color="#67c23a" aria-label="代理菜单">
        <el-menu-item index="/agent"><el-icon><Odometer /></el-icon>区域概览</el-menu-item>
        <el-menu-item index="/agent/verifications"><el-icon><Document /></el-icon>审核中心</el-menu-item>
        <el-menu-item index="/agent/delivery-zones"><el-icon><MapLocation /></el-icon>配送区域</el-menu-item>
        <el-menu-item index="/agent/delivery-orders"><el-icon><Van /></el-icon>跑腿订单</el-menu-item>
        <el-menu-item index="/agent/users"><el-icon><Avatar /></el-icon>用户管理</el-menu-item>
        <el-menu-item index="/agent/products"><el-icon><Goods /></el-icon>商品管理</el-menu-item>
        <el-menu-item index="/agent/orders"><el-icon><List /></el-icon>二手订单</el-menu-item>
        <el-menu-item index="/agent/reports"><el-icon><Warning /></el-icon>举报处理</el-menu-item>
        <el-menu-item index="/agent/audit-logs"><el-icon><Document /></el-icon>操作日志</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header" role="banner">
        <span>{{ auth.user?.nickname }}（区域代理）</span>
        <el-button circle :icon="isDark ? Sunny : Moon" aria-label="切换深色模式" @click="toggleDark" />
        <el-button link type="danger" aria-label="退出登录" @click="handleLogout">退出</el-button>
      </el-header>
      <el-main role="main"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { Odometer, MapLocation, Van, Avatar, Goods, List, Warning, Document, Moon, Sunny } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useRouter } from 'vue-router'

const { isDark, toggle: toggleDark } = useDarkMode()
const auth = useAuthStore()
const router = useRouter()
async function handleLogout() {
  try {
    await authApi.logout()
  } catch (err) {
    console.warn('logout request failed', err)
  }
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-layout { min-height: 100vh; min-height: 100dvh; }
.aside { background: #1d4e89; }
.logo { color: #fff; font-weight: 700; padding: 20px; text-align: center; }
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-header-bg);
  color: var(--app-text);
}
</style>
