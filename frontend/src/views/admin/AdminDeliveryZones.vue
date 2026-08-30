<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>配送区域管理</span>
        <div class="actions">
          <el-select v-model="filterRegionId" placeholder="筛选校区" clearable style="width:180px" @change="load">
            <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
          </el-select>
          <el-button @click="seedDefaults" :disabled="!filterRegionId">初始化默认区域</el-button>
          <el-button type="primary" @click="openCreate">新增区域</el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-table :data="zones" v-loading="loading">
      <el-table-column label="校区">
        <template #default="{ row }">{{ row.regionId?.name || '—' }}</template>
      </el-table-column>
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑配送区域' : '新增配送区域'" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="所属校区" required>
          <el-select v-model="form.regionId" placeholder="选择校区" style="width:100%">
            <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如 1号公寓" />
        </el-form-item>
        <el-form-item label="编码" required>
          <el-input v-model="form.code" placeholder="如 apt_1" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as adminApi from '@/api/admin'
import * as deliveryApi from '@/api/delivery'

const regions = ref([])
const zones = ref([])
const loading = ref(false)
const error = ref('')
const filterRegionId = ref('')
const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ regionId: '', name: '', code: '', sortOrder: 0, status: 'active' })

async function loadRegions() {
  regions.value = await adminApi.getRegions()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await deliveryApi.getAdminDeliveryZones({
      regionId: filterRegionId.value || undefined,
      pageSize: 100,
    })
    zones.value = res.list || []
  } catch (e) {
    error.value = e.message || '加载配送区域失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.value = {
    regionId: filterRegionId.value || regions.value[0]?._id || '',
    name: '',
    code: '',
    sortOrder: 0,
    status: 'active',
  }
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row._id
  form.value = {
    regionId: row.regionId?._id || row.regionId,
    name: row.name,
    code: row.code,
    sortOrder: row.sortOrder ?? 0,
    status: row.status,
  }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.regionId || !form.value.name?.trim() || !form.value.code?.trim()) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (editingId.value) {
    await deliveryApi.updateAdminDeliveryZone(editingId.value, form.value)
    ElMessage.success('已更新')
  } else {
    await deliveryApi.createAdminDeliveryZone(form.value)
    ElMessage.success('已创建')
  }
  dialogVisible.value = false
  load()
}

async function remove(row) {
  await ElMessageBox.confirm(`删除「${row.name}」？`, '确认', { type: 'warning' })
  await deliveryApi.deleteAdminDeliveryZone(row._id)
  ElMessage.success('已删除')
  load()
}

async function seedDefaults() {
  if (!filterRegionId.value) return
  await deliveryApi.seedAdminDeliveryZones(filterRegionId.value)
  ElMessage.success('已初始化默认公寓区域')
  load()
}

onMounted(async () => {
  try {
    await loadRegions()
    if (regions.value.length) filterRegionId.value = regions.value[0]._id
  } catch (e) {
    error.value = e.message || '加载校区列表失败'
  }
  load()
})
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
