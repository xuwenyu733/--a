<template>
  <el-card>
    <template #header>骑手认证申请</template>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="loadPage">重试</el-button>
    </el-alert>
    <el-alert v-if="auth.user?.courierVerified" title="您已是认证骑手，可前往接单大厅接单" type="success" show-icon>
      <template #default>
        <el-button link type="primary" @click="$router.push('/delivery/hall')">进入接单大厅</el-button>
      </template>
    </el-alert>
    <el-alert v-else-if="status?.courier?.status === 'pending'" title="骑手申请审核中，请耐心等待管理员审核" type="warning" show-icon />
    <el-alert v-else-if="status?.courier?.status === 'rejected'" :title="`申请被拒绝：${status.courier.rejectReason || '无'}`" type="error" show-icon />
    <el-alert
      v-else-if="status?.courier?.status === 'approved' && !auth.user?.courierVerified"
      title="审核已通过，请点击下方按钮刷新登录状态后即可接单"
      type="success"
      show-icon
      class="zone-tip"
    >
      <template #default>
        <el-button type="primary" size="small" @click="refreshProfile">刷新认证状态</el-button>
      </template>
    </el-alert>

    <el-alert
      v-if="!zones.length && !auth.user?.courierVerified"
      title="当前校区尚未配置配送区域，请联系管理员在后台「配送区域」中初始化"
      type="warning"
      show-icon
      class="zone-tip"
    />

    <el-form
      v-if="!auth.user?.courierVerified && status?.courier?.status !== 'pending'"
      :model="form"
      label-width="100px"
      style="max-width:520px;margin-top:20px"
    >
      <el-form-item label="真实姓名" required>
        <el-input v-model="form.realName" placeholder="与证件一致" />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input v-model="form.contactPhone" :placeholder="auth.user?.phone" />
      </el-form-item>
      <el-form-item label="服务类型">
        <el-checkbox-group v-model="form.serviceTypes">
          <el-checkbox v-for="t in COURIER_SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="服务区域">
        <el-select v-model="form.allowedZoneIds" multiple placeholder="不选则服务全校配送区" style="width:100%">
          <el-option v-for="z in zones" :key="z._id" :label="z.name" :value="z._id" />
        </el-select>
      </el-form-item>
      <el-form-item label="个人简介">
        <el-input v-model="form.intro" type="textarea" :rows="3" placeholder="可选，介绍您的空闲时间与经验" />
      </el-form-item>
      <el-button type="primary" :loading="loading" @click="submit">提交骑手申请</el-button>
      <el-button v-if="status?.courier?.status === 'approved'" @click="refreshProfile">刷新认证状态</el-button>
    </el-form>

    <div v-if="status?.courier?.status === 'pending'" class="pending-actions">
      <el-button @click="refreshProfile">刷新审核状态</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as userApi from '@/api/user'
import * as deliveryApi from '@/api/delivery'
import { COURIER_SERVICE_TYPES } from '@/constants/delivery'

const auth = useAuthStore()
const loading = ref(false)
const loadError = ref('')
const status = ref(null)
const zones = ref([])
const form = ref({
  realName: '',
  contactPhone: '',
  serviceTypes: ['food', 'express'],
  allowedZoneIds: [],
  intro: '',
})

async function loadPage() {
  loadError.value = ''
  try {
    status.value = await userApi.getVerifyStatus()
    const regionId = auth.user?.regionId?._id || auth.user?.regionId
    if (regionId) {
      zones.value = await deliveryApi.getDeliveryZones(regionId)
    }
  } catch (e) {
    loadError.value = e.message || '加载认证信息失败'
  }
}

onMounted(loadPage)

async function submit() {
  if (!form.value.realName?.trim()) {
    ElMessage.warning('请填写真实姓名')
    return
  }
  loading.value = true
  try {
    await userApi.submitCourierVerify(form.value)
    ElMessage.success('已提交，等待管理员审核通过后即可接单')
    status.value = await userApi.getVerifyStatus()
  } finally {
    loading.value = false
  }
}

async function refreshProfile() {
  await auth.fetchMe()
  status.value = await userApi.getVerifyStatus()
  if (auth.user?.courierVerified) {
    ElMessage.success('骑手认证已通过')
  }
}
</script>

<style scoped>
.zone-tip {
  margin-top: 12px;
}
.pending-actions {
  margin-top: 16px;
}
</style>
