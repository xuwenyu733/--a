<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="aside" role="navigation" aria-label="超管后台导航">
      <div class="logo" role="heading" aria-level="1">超管后台</div>
      <el-menu router :default-active="$route.path" background-color="#304156" text-color="#bfcbd9" active-text-color="#409eff" aria-label="管理菜单">
        <el-menu-item index="/admin"><el-icon><Odometer /></el-icon>概览</el-menu-item>
        <el-menu-item index="/admin/regions"><el-icon><Location /></el-icon>区域管理</el-menu-item>
        <el-menu-item index="/admin/delivery-zones"><el-icon><MapLocation /></el-icon>配送区域</el-menu-item>
        <el-menu-item index="/admin/delivery-orders"><el-icon><Van /></el-icon>跑腿订单</el-menu-item>
        <el-menu-item index="/admin/agents"><el-icon><User /></el-icon>代理管理</el-menu-item>
        <el-menu-item index="/admin/verifications"><el-icon><Document /></el-icon>审核中心</el-menu-item>
        <el-menu-item index="/admin/users"><el-icon><Avatar /></el-icon>用户管理</el-menu-item>
        <el-menu-item index="/admin/products"><el-icon><Goods /></el-icon>商品管理</el-menu-item>
        <el-menu-item index="/admin/orders"><el-icon><List /></el-icon>订单管理</el-menu-item>
        <el-menu-item index="/admin/reports"><el-icon><Warning /></el-icon>举报处理</el-menu-item>
        <el-menu-item index="/admin/settings"><el-icon><Setting /></el-icon>平台配置</el-menu-item>
        <el-menu-item index="/admin/audit-logs"><el-icon><Notebook /></el-icon>审计日志</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header" role="banner">
        <span>{{ auth.user?.nickname }}（超级管理员）</span>
        <el-button circle :icon="isDark ? Sunny : Moon" aria-label="切换深色模式" @click="toggleDark" />
        <el-button link type="danger" aria-label="退出登录" @click="handleLogout">退出</el-button>
      </el-header>
      <el-main role="main"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { Odometer, Location, MapLocation, Van, User, Document, Avatar, Warning, Setting, Notebook, Goods, List, Moon, Sunny } from '@element-plus/icons-vue'
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
.aside { background: #304156; }
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
