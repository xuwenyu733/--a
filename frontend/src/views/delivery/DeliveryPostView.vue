<template>
  <el-card>
    <template #header>
      <div class="head">
        <span>发布跑腿需求</span>
        <el-button link @click="$router.push('/delivery')">返回</el-button>
      </div>
    </template>

    <el-alert
      v-if="zonesError"
      type="error"
      :title="zonesError"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    >
      <el-button link type="primary" @click="loadZones">重试</el-button>
    </el-alert>

    <el-alert
      v-if="zonesLoaded && !zonesError && !zones.length"
      type="warning"
      show-icon
      :closable="false"
      title="当前校区尚未配置配送区域，请联系管理员或区域代理在后台初始化"
      class="zone-alert"
    />

    <el-form v-else :model="form" label-width="100px" style="max-width:560px">
      <el-form-item label="类型" required>
        <el-radio-group v-model="form.type">
          <el-radio v-for="t in DELIVERY_ORDER_TYPES" :key="t.value" :value="t.value">{{ t.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="配送区域" required>
        <el-select v-model="form.zoneId" placeholder="选择公寓/区域" style="width:100%">
          <el-option v-for="z in zones" :key="z._id" :label="z.name" :value="z._id" />
        </el-select>
      </el-form-item>
      <el-form-item label="标题">
        <el-input v-model="form.title" placeholder="如：南门取外卖送到1号公寓" />
      </el-form-item>
      <el-form-item label="取件地址" required>
        <el-input v-model="form.pickupAddress" placeholder="如：南门美团外卖柜" />
      </el-form-item>
      <el-form-item label="送达地址" required>
        <el-input v-model="form.dropoffAddress" placeholder="如：1号公寓 302" />
      </el-form-item>
      <el-form-item label="联系电话" required>
        <el-input v-model="form.contactPhone" />
      </el-form-item>
      <el-form-item label="酬劳(元)" required>
        <el-input-number v-model="form.fee" :min="1" :max="500" :step="1" />
      </el-form-item>
      <el-form-item label="详细说明">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="取件码、快递单号、注意事项等" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="可选" />
      </el-form-item>
      <el-button type="primary" :loading="loading" @click="submit">发布订单</el-button>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as deliveryApi from '@/api/delivery'
import { DELIVERY_ORDER_TYPES } from '@/constants/delivery'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const zonesLoaded = ref(false)
const zonesError = ref('')
const zones = ref([])
const form = ref({
  type: 'food',
  zoneId: '',
  title: '',
  pickupAddress: '',
  dropoffAddress: '',
  contactPhone: auth.user?.phone || '',
  fee: 5,
  description: '',
  remark: '',
})

async function loadZones() {
  const regionId = auth.user?.regionId?._id || auth.user?.regionId
  if (!regionId) {
    ElMessage.warning('请先完善所属校区')
    zonesLoaded.value = true
    return
  }
  zonesError.value = ''
  try {
    zones.value = await deliveryApi.getDeliveryZones(regionId)
    if (zones.value.length) form.value.zoneId = zones.value[0]._id
  } catch (e) {
    zonesError.value = e.message || '加载配送区域失败'
  } finally {
    zonesLoaded.value = true
  }
}

onMounted(loadZones)

async function submit() {
  if (!form.value.zoneId || !form.value.pickupAddress?.trim() || !form.value.dropoffAddress?.trim()) {
    ElMessage.warning('请填写完整信息')
    return
  }
  loading.value = true
  try {
    await deliveryApi.createDeliveryOrder(form.value)
    ElMessage.success('发布成功')
    router.push('/delivery/orders')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.zone-alert {
  margin-bottom: 16px;
}
</style>
