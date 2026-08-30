<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import config from '@/config/index'
import { isLoggedIn, getRefreshToken, clearSession } from '@/utils/auth'
import { onSessionReady } from '@/utils/unread'

onLaunch(() => {
  console.log('[app] launch api=', config.API_BASE)
  if (!isLoggedIn()) return
  if (!getRefreshToken()) {
    clearSession()
    console.warn('[app] cleared stale session (no refreshToken)')
    return
  }
  setTimeout(() => onSessionReady(), 800)
})
</script>

<style lang="scss">
@import './uni.scss';

page {
  background: #f5f7fa;
  color: #303133;
  font-size: 28rpx;
}
</style>
