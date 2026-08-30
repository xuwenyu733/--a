<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>配送区域管理 · {{ regionName }}</span>
        <div class="actions">
          <el-button @click="seedDefaults">初始化默认区域</el-button>
          <el-button type="primary" @click="openCreate">新增区域</el-button>
        </div>
      </div>
    </template>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="仅可管理本代理负责校区的配送区域（1～6 号公寓、校内其他区域等）"
      class="tip"
    />

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-table :data="zones" v-loading="loading" style="margin-top:12px">
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '停用' }}
          </el-tag>
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as agentApi from '@/api/agent'

const auth = useAuthStore()
const zones = ref([])
const loading = ref(false)
const error = ref('')
const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ name: '', code: '', sortOrder: 0, status: 'active' })

const regionName = computed(() => auth.user?.regionId?.name || '本区域')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await agentApi.getAgentDeliveryZones({ pageSize: 100 })
    zones.value = res.list || []
  } catch (e) {
    error.value = e.message || '加载配送区域失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.value = { name: '', code: '', sortOrder: 0, status: 'active' }
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row._id
  form.value = {
    name: row.name,
    code: row.code,
    sortOrder: row.sortOrder ?? 0,
    status: row.status,
  }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name?.trim() || !form.value.code?.trim()) {
    ElMessage.warning('请填写名称与编码')
    return
  }
  if (editingId.value) {
    await agentApi.updateAgentDeliveryZone(editingId.value, form.value)
    ElMessage.success('已更新')
  } else {
    await agentApi.createAgentDeliveryZone(form.value)
    ElMessage.success('已创建')
  }
  dialogVisible.value = false
  load()
}

async function remove(row) {
  await ElMessageBox.confirm(`删除「${row.name}」？`, '确认', { type: 'warning' })
  await agentApi.deleteAgentDeliveryZone(row._id)
  ElMessage.success('已删除')
  load()
}

async function seedDefaults() {
  await agentApi.seedAgentDeliveryZones()
  ElMessage.success('已初始化默认公寓区域')
  load()
}

onMounted(load)
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
}
.tip {
  margin-bottom: 0;
}
</style>
