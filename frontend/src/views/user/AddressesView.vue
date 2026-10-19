<template>
  <el-card v-loading="loading" header="收货地址">
    <el-alert
      v-if="fromPay"
      type="info"
      :closable="false"
      show-icon
      title="支付前需要至少一条收货地址，添加后请返回订单页重新付款"
      style="margin-bottom: 16px"
    />
    <el-alert
      v-if="error"
      type="error"
      :title="error"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    >
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <div class="toolbar">
      <el-button type="primary" @click="openAdd">添加地址</el-button>
      <el-button v-if="fromPay" @click="$router.push('/user/orders')">返回订单</el-button>
    </div>

    <el-empty v-if="!loading && !error && !list.length" description="暂无收货地址，请先添加" />

    <div v-for="addr in list" :key="addr._id" class="addr-card">
      <div class="addr-head">
        <strong>{{ addr.name }}</strong>
        <span class="phone">{{ addr.phone }}</span>
        <el-tag v-if="addr.isDefault" type="success" size="small">默认</el-tag>
      </div>
      <p class="detail">{{ addr.region }} {{ addr.detail }}</p>
      <div class="actions">
        <el-button v-if="!addr.isDefault" link type="primary" @click="setDefault(addr._id)">设为默认</el-button>
        <el-button link type="primary" @click="openEdit(addr)">编辑</el-button>
        <el-button link type="danger" @click="remove(addr)">删除</el-button>
      </div>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editId ? '编辑地址' : '添加地址'"
      width="420px"
      destroy-on-close
    >
      <el-form label-width="88px">
        <el-form-item label="收件人" required>
          <el-input v-model="form.name" maxlength="30" placeholder="姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" maxlength="11" placeholder="手机号" />
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="form.region" maxlength="100" placeholder="如：XX校区XX宿舍楼" />
        </el-form-item>
        <el-form-item label="详细地址" required>
          <el-input v-model="form.detail" maxlength="200" placeholder="楼栋、楼层、房间号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as addressApi from '@/api/address'

const route = useRoute()
const fromPay = computed(() => route.query.from === 'pay')

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const list = ref([])
const formVisible = ref(false)
const editId = ref('')
const form = ref({ name: '', phone: '', region: '', detail: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await addressApi.getAddresses()
    list.value = res?.list || res || []
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editId.value = ''
  form.value = { name: '', phone: '', region: '', detail: '' }
  formVisible.value = true
}

function openEdit(addr) {
  editId.value = addr._id
  form.value = {
    name: addr.name || '',
    phone: addr.phone || '',
    region: addr.region || '',
    detail: addr.detail || '',
  }
  formVisible.value = true
}

async function save() {
  if (!form.value.name?.trim() || !form.value.phone?.trim() || !form.value.detail?.trim()) {
    ElMessage.warning('请填写收件人、手机号和详细地址')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      phone: form.value.phone.trim(),
      region: (form.value.region || '').trim(),
      detail: form.value.detail.trim(),
    }
    if (editId.value) {
      await addressApi.updateAddress(editId.value, payload)
      ElMessage.success('已更新')
    } else {
      await addressApi.createAddress(payload)
      ElMessage.success('已添加')
    }
    formVisible.value = false
    await load()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function setDefault(id) {
  try {
    await addressApi.setDefaultAddress(id)
    ElMessage.success('已设为默认')
    await load()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '操作失败')
  }
}

async function remove(addr) {
  try {
    await ElMessageBox.confirm(`确定删除「${addr.name}」的地址？`, '删除地址', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await addressApi.deleteAddress(addr._id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.addr-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.addr-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.phone {
  color: var(--el-text-color-secondary);
}
.detail {
  margin: 8px 0 0;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}
.actions {
  margin-top: 8px;
}
</style>
