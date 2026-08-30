<template>
  <el-card v-loading="loading" header="账号设置">
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-form label-width="100px" style="max-width:520px">
      <el-form-item label="头像">
        <div class="avatar-row">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            accept="image/*"
            :http-request="uploadAvatar"
          >
            <el-avatar v-if="avatarPreview" :size="80" :src="avatarPreview" />
            <el-avatar v-else :size="80">{{ auth.user?.nickname?.[0] || '?' }}</el-avatar>
            <div class="avatar-tip">点击更换</div>
          </el-upload>
        </div>
      </el-form-item>
      <el-form-item label="通知邮箱">
        <el-input v-model="form.email" placeholder="选填，离线时接收邮件通知" />
        <p class="hint">配置 SMTP 后，您不在线时会收到订单/消息邮件提醒</p>
      </el-form-item>
      <el-form-item label="收款码">
        <p class="hint">买家待面交时可扫码付款（微信/支付宝收款码图片）</p>
        <el-upload
          v-if="!qrPreview"
          :show-file-list="false"
          accept="image/*"
          :http-request="uploadQr"
        >
          <el-button type="primary" plain :icon="Plus">上传收款码</el-button>
        </el-upload>
        <div v-else class="qr-box">
          <img :src="qrPreview" alt="收款码" class="qr-img" />
          <el-button type="danger" link @click="removeQr">删除</el-button>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import * as userApi from '@/api/user'
import * as productApi from '@/api/product'
import { getFileUrl } from '@/utils/fileUrl'
import { pickUserForSession } from '@/utils/userSession'

const auth = useAuthStore()
const saving = ref(false)
const loading = ref(false)
const loadError = ref('')
const form = ref({
  email: '',
  paymentQrUrl: '',
  avatar: '',
})
const qrPreview = ref('')
const avatarPreview = ref('')

function applyFormFromUser() {
  form.value.email = auth.user?.email || ''
  form.value.paymentQrUrl = auth.user?.paymentQrUrl || ''
  form.value.avatar = auth.user?.avatar || ''
  qrPreview.value = form.value.paymentQrUrl ? getFileUrl(form.value.paymentQrUrl) : ''
  avatarPreview.value = form.value.avatar ? getFileUrl(form.value.avatar) : ''
}

async function load() {
  loading.value = true
  loadError.value = ''
  applyFormFromUser()
  try {
    await auth.fetchMe()
    applyFormFromUser()
  } catch (e) {
    loadError.value = e.message || '加载账号信息失败'
    console.warn('[UserSettings] fetchMe failed', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function uploadImageFile(file) {
  const res = await productApi.uploadImages([file])
  return res.paths?.[0] ?? res.urls?.[0] ?? ''
}

async function uploadAvatar({ file }) {
  try {
    const path = await uploadImageFile(file)
    if (!path) throw new Error('上传失败')
    form.value.avatar = path
    avatarPreview.value = getFileUrl(path)
    ElMessage.success('头像已上传，请点击保存')
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  }
}

async function uploadQr({ file }) {
  try {
    const path = await uploadImageFile(file)
    if (!path) throw new Error('上传失败')
    form.value.paymentQrUrl = path
    qrPreview.value = getFileUrl(path)
    ElMessage.success('收款码已上传，请点击保存')
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  }
}

function removeQr() {
  form.value.paymentQrUrl = ''
  qrPreview.value = ''
}

async function save() {
  saving.value = true
  try {
    const user = await userApi.updateProfile({
      email: form.value.email,
      paymentQrUrl: form.value.paymentQrUrl,
      avatar: form.value.avatar,
    })
    auth.user = { ...auth.user, ...user }
    sessionStorage.setItem('user', JSON.stringify(pickUserForSession(auth.user)))
    ElMessage.success('已保存')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.avatar-row {
  display: flex;
  align-items: center;
}
.avatar-uploader {
  cursor: pointer;
  text-align: center;
}
.avatar-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--app-muted);
}
.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--app-muted);
  line-height: 1.5;
}
.qr-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.qr-img {
  width: 160px;
  height: 160px;
  object-fit: contain;
  border: 1px solid var(--app-border);
  border-radius: 8px;
}
</style>
