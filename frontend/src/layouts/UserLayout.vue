<template>
  <el-container class="layout">
    <el-header class="header" role="banner">
      <el-button
        class="menu-btn"
        :icon="Menu"
        circle
        aria-label="打开导航菜单"
        @click="drawerVisible = true"
      />
      <div class="logo" role="button" tabindex="0" aria-label="返回首页" @click="$router.push('/')" @keyup.enter="$router.push('/')">
        <span class="logo-title">🎓 校园市集</span>
        <span class="logo-sub">二手 · 简历 · 跑腿</span>
      </div>
      <el-menu
        class="desktop-menu"
        mode="horizontal"
        :ellipsis="false"
        router
        :default-active="navMenuActive"
        role="navigation"
        aria-label="主导航"
      >
        <el-menu-item index="/">首页</el-menu-item>
        <el-menu-item index="/products">商品</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/cart">购物车</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/delivery">校园跑腿</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/resume/build">AI 简历创作</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/chat">
          <el-badge :value="chatStore.totalUnread" :hidden="!chatStore.totalUnread" :max="99">消息</el-badge>
        </el-menu-item>
      </el-menu>
      <div class="header-right">
        <el-button circle :icon="isDark ? Sunny : Moon" aria-label="切换深色模式" @click="toggleDark" />
        <template v-if="auth.isLoggedIn">
          <el-badge :value="notifyStore.unreadCount" :hidden="!notifyStore.unreadCount" :max="99">
            <el-button circle :icon="Bell" aria-label="通知" @click="$router.push('/notifications')" />
          </el-badge>
          <el-dropdown>
            <span class="user-entry" role="button" tabindex="0" aria-label="用户菜单">
              <el-avatar :size="28" :src="avatarUrl">{{ auth.user?.nickname?.[0] }}</el-avatar>
              <span class="nickname">{{ auth.user?.nickname }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/user')">个人中心</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/user/products')">我的发布</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/user/favorites')">我的收藏</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/cart')">购物车</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/user/orders')">我的订单</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/user/settings')">账号设置</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/delivery')">校园跑腿</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/resume/build')">AI 简历创作</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/user/verify/courier')">骑手认证</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/user/verify/student')">学生认证</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/user/verify/merchant')">商家入驻</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <el-button size="small" @click="$router.push('/login')">登录</el-button>
          <el-button type="primary" size="small" @click="$router.push('/register')">注册</el-button>
        </template>
      </div>
    </el-header>

    <el-drawer v-model="drawerVisible" direction="ltr" size="72%" title="导航" aria-label="移动端导航">
      <el-menu router :default-active="$route.path" role="navigation" aria-label="移动端主导航" @select="drawerVisible = false">
        <el-menu-item index="/">首页</el-menu-item>
        <el-menu-item index="/products">商品</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/cart">购物车</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/delivery">校园跑腿</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/resume/build">AI 简历创作</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/chat">消息</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/notifications">通知</el-menu-item>
        <el-menu-item v-if="auth.isLoggedIn" index="/user">个人中心</el-menu-item>
      </el-menu>
    </el-drawer>

    <el-main class="main-content" role="main">
      <router-view :key="$route.path" />
    </el-main>

    <el-footer class="site-footer" height="auto">
      <router-link to="/terms">用户协议</router-link>
      <span class="sep">·</span>
      <router-link to="/privacy">隐私政策</router-link>
      <span class="muted">校园市集</span>
    </el-footer>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, Menu, Moon, Sunny } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'
import { useDarkMode } from '@/composables/useDarkMode'
import { WS_EVENTS } from '@/constants/wsEvents'
import { useRouter } from 'vue-router'
import * as authApi from '@/api/auth'
import { getFileUrl } from '@/utils/fileUrl'

const auth = useAuthStore()
const { isDark, toggle: toggleDark } = useDarkMode()
const avatarUrl = computed(() => getFileUrl(auth.user?.avatar))
const chatStore = useChatStore()
const notifyStore = useNotificationStore()
const router = useRouter()
const route = useRoute()
const drawerVisible = ref(false)
let notifyWsBound = false

const navMenuActive = computed(() => {
  const path = route.path
  if (path.startsWith('/delivery')) return '/delivery'
  if (path.startsWith('/resume')) return '/resume/build'
  return path
})

async function refreshBadges() {
  if (!auth.isLoggedIn) return
  try {
    chatStore.initSocket()
    if (!notifyWsBound) {
      notifyWsBound = true
      chatStore.ws.on(WS_EVENTS.NOTIFICATION, (data) => {
        if (data?.type !== 'new_message') notifyStore.fetchUnread()
      })
    }
    await Promise.all([chatStore.fetchConversations(), notifyStore.fetchUnread()])
  } catch (err) {
    console.warn('refreshBadges failed', err)
  }
}

watch(() => auth.isLoggedIn, (v) => v && refreshBadges())
watch(
  () => route.path,
  (path, prev) => {
    if (prev === '/notifications' && path !== '/notifications') {
      notifyStore.fetchUnread()
    }
  }
)
onMounted(refreshBadges)

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
.layout { min-height: 100vh; min-height: 100dvh; }
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #eee;
  background: #fff;
  padding: 0 12px;
  height: 56px;
}
.menu-btn { display: none; flex-shrink: 0; }
.logo {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.logo-title { font-weight: 700; font-size: 16px; color: #409eff; }
.logo-sub { font-size: 11px; color: var(--app-muted); font-weight: 400; }
.desktop-menu { flex: 1; border: none; min-width: 0; }
.header-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
.user-entry { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.main-content { padding: 12px 16px; flex: 1; }
.site-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px 24px;
  font-size: 13px;
  border-top: 1px solid #eee;
  background: transparent;
}
.site-footer a { color: #409eff; text-decoration: none; }
.site-footer a:hover { text-decoration: underline; }
.site-footer .sep { color: #c0c4cc; }
.site-footer .muted { color: #909399; margin-left: 8px; }
@media (max-width: 768px) {
  .menu-btn { display: inline-flex; }
  .desktop-menu { display: none; }
  .nickname { display: none; }
  .main-content { padding: 8px 12px; }
}
</style>
