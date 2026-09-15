import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLES, ROLE_HOME_MAP } from '@/constants/roles'
import { resolveRouteTitle, setPageMeta } from '@/utils/pageMeta'

/** 路由级代码分割：所有页面组件均使用动态 import，按访问路径懒加载 */

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/views/legal/LegalDocView.vue'),
    props: { kind: 'privacy' },
    meta: { title: '隐私政策' },
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/views/legal/LegalDocView.vue'),
    props: { kind: 'terms' },
    meta: { title: '用户服务协议' },
  },
  {
    path: '/',
    component: () => import('@/layouts/UserLayout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('@/views/home/HomeView.vue') },
      { path: 'chat', component: () => import('@/views/chat/ChatListView.vue'), meta: { auth: true } },
      { path: 'chat/:conversationId', component: () => import('@/views/chat/ChatRoomView.vue'), meta: { auth: true } },
      { path: 'notifications', component: () => import('@/views/notification/NotificationView.vue'), meta: { auth: true } },
      { path: 'products', component: () => import('@/views/product/ProductListView.vue') },
      { path: 'products/new', component: () => import('@/views/product/ProductFormView.vue'), meta: { auth: true, roles: [ROLES.STUDENT] } },
      { path: 'products/:id', component: () => import('@/views/product/ProductDetailView.vue') },
      { path: 'products/:id/edit', component: () => import('@/views/product/ProductFormView.vue'), meta: { auth: true, roles: [ROLES.STUDENT] } },
      { path: 'user', component: () => import('@/views/user/UserCenterView.vue'), meta: { auth: true } },
      { path: 'user/products', component: () => import('@/views/user/MyProductsView.vue'), meta: { auth: true, roles: [ROLES.STUDENT] } },
      { path: 'user/favorites', component: () => import('@/views/user/FavoritesView.vue'), meta: { auth: true } },
      { path: 'user/orders', component: () => import('@/views/order/OrdersView.vue'), meta: { auth: true } },
      { path: 'cart', component: () => import('@/views/cart/CartView.vue'), meta: { auth: true, roles: [ROLES.STUDENT] } },
      { path: 'user/settings', component: () => import('@/views/user/UserSettingsView.vue'), meta: { auth: true } },
      { path: 'user/verify/student', component: () => import('@/views/user/StudentVerifyView.vue'), meta: { auth: true, roles: [ROLES.STUDENT] } },
      { path: 'user/verify/merchant', component: () => import('@/views/user/MerchantVerifyView.vue'), meta: { auth: true, roles: [ROLES.STUDENT] } },
      { path: 'shop/:userId', component: () => import('@/views/shop/ShopView.vue') },
      { path: 'users/:id', component: () => import('@/views/user/UserProfileView.vue') },
      {
        path: 'resume',
        redirect: '/resume/build',
      },
      {
        path: 'resume/build',
        name: 'ResumeBuild',
        component: () => import('@/views/resume/ResumeBuildView.vue'),
        meta: { auth: true },
      },
      {
        path: 'resume/optimize',
        redirect: '/resume/build',
      },
      { path: 'delivery', component: () => import('@/views/delivery/DeliveryHomeView.vue'), meta: { auth: true } },
      { path: 'delivery/post', component: () => import('@/views/delivery/DeliveryPostView.vue'), meta: { auth: true } },
      { path: 'delivery/hall', component: () => import('@/views/delivery/CourierHallView.vue'), meta: { auth: true } },
      { path: 'delivery/orders', component: () => import('@/views/delivery/DeliveryOrdersView.vue'), meta: { auth: true } },
      { path: 'user/verify/courier', component: () => import('@/views/user/CourierVerifyView.vue'), meta: { auth: true } },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { auth: true, roles: [ROLES.SUPER_ADMIN] },
    children: [
      { path: '', component: () => import('@/views/admin/AdminDashboard.vue') },
      { path: 'regions', component: () => import('@/views/admin/AdminRegions.vue') },
      { path: 'delivery-zones', component: () => import('@/views/admin/AdminDeliveryZones.vue') },
      {
        path: 'delivery-orders',
        component: () => import('@/views/shared/DeliveryOrdersManageView.vue'),
        props: { mode: 'admin' },
      },
      { path: 'agents', component: () => import('@/views/admin/AdminAgents.vue') },
      { path: 'verifications', component: () => import('@/views/admin/AdminVerifications.vue') },
      { path: 'users', component: () => import('@/views/admin/AdminUsers.vue') },
      { path: 'products', component: () => import('@/views/admin/AdminProducts.vue') },
      { path: 'orders', component: () => import('@/views/admin/AdminOrders.vue') },
      { path: 'reports', component: () => import('@/views/shared/ReportsManageView.vue') },
      { path: 'settings', component: () => import('@/views/admin/AdminSettings.vue') },
      {
        path: 'audit-logs',
        component: () => import('@/views/shared/AuditLogsView.vue'),
        props: { apiPath: '/admin/audit-logs' },
      },
    ],
  },
  {
    path: '/agent',
    component: () => import('@/layouts/AgentLayout.vue'),
    meta: { auth: true, roles: [ROLES.REGIONAL_AGENT] },
    children: [
      { path: '', component: () => import('@/views/agent/AgentDashboard.vue') },
      {
        path: 'verifications',
        component: () => import('@/views/agent/AgentVerificationsCenter.vue'),
      },
      {
        path: 'verifications/student',
        redirect: { path: '/agent/verifications', query: { type: 'student' } },
      },
      {
        path: 'verifications/merchant',
        redirect: { path: '/agent/verifications', query: { type: 'merchant' } },
      },
      {
        path: 'verifications/courier',
        redirect: { path: '/agent/verifications', query: { type: 'courier' } },
      },
      {
        path: 'delivery-zones',
        component: () => import('@/views/agent/AgentDeliveryZones.vue'),
      },
      {
        path: 'delivery-orders',
        component: () => import('@/views/shared/DeliveryOrdersManageView.vue'),
        props: { mode: 'agent' },
      },
      { path: 'users', component: () => import('@/views/agent/AgentUsers.vue') },
      { path: 'products', component: () => import('@/views/agent/AgentProducts.vue') },
      { path: 'orders', component: () => import('@/views/agent/AgentOrders.vue') },
      { path: 'reports', component: () => import('@/views/shared/ReportsManageView.vue') },
      {
        path: 'audit-logs',
        component: () => import('@/views/shared/AuditLogsView.vue'),
        props: { apiPath: '/agent/audit-logs' },
      },
    ],
  },
  {
    path: '/merchant',
    component: () => import('@/layouts/MerchantLayout.vue'),
    meta: { auth: true, roles: [ROLES.MERCHANT] },
    children: [
      { path: '', component: () => import('@/views/merchant/MerchantDashboard.vue') },
      { path: 'shop', component: () => import('@/views/merchant/MerchantShop.vue') },
      { path: 'products', component: () => import('@/views/merchant/MerchantProducts.vue') },
      { path: 'orders', component: () => import('@/views/merchant/MerchantOrders.vue') },
      { path: 'stats', component: () => import('@/views/merchant/MerchantStats.vue') },
      { path: 'products/new', component: () => import('@/views/product/ProductFormView.vue') },
      { path: 'products/:id/edit', component: () => import('@/views/product/ProductFormView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.accessToken && auth.user) {
    const ok = await auth.restoreSession()
    if (!ok && auth.user) auth.logout()
  }

  if (to.meta.guest && auth.isLoggedIn) {
    return auth.homePath
  }

  if (to.meta.auth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const requiredRoles = to.matched.flatMap((r) => r.meta.roles || []).filter(Boolean)
  if (requiredRoles.length && !requiredRoles.includes(auth.role)) {
    return auth.homePath || '/'
  }

  if (to.path.startsWith('/user/verify') && auth.role !== ROLES.STUDENT) {
    return ROLE_HOME_MAP[auth.role] || '/'
  }
})

router.afterEach((to) => {
  const title = resolveRouteTitle(to)
  setPageMeta({ title: title || undefined })
})

export default router
