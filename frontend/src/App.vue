<template>
  <el-config-provider :locale="locale">
    <router-view />
    <ChangePasswordDialog v-model="pwdDialog" forced @success="onPwdChanged" />
  </el-config-provider>
</template>

<script setup>
import { ref, watch } from 'vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { useAuthStore } from '@/stores/auth'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const locale = zhCn
const auth = useAuthStore()
const pwdDialog = ref(false)

watch(
  () => auth.mustChangePassword && auth.isLoggedIn,
  (need) => {
    pwdDialog.value = !!need
  },
  { immediate: true },
)

function onPwdChanged() {
  pwdDialog.value = false
}
</script>
