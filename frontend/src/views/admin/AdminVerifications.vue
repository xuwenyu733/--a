<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>全平台审核中心</span>
        <el-radio-group v-model="filterType" size="small" @change="load">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="student">学生</el-radio-button>
          <el-radio-button value="merchant">商家</el-radio-button>
          <el-radio-button value="courier">骑手</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-table :data="list" v-loading="loading" row-key="_id">
      <el-table-column type="expand">
        <template #default="{ row }">
          <div v-if="row.type === 'courier'" class="payload">
            <p><strong>姓名：</strong>{{ row.payload?.realName }}</p>
            <p><strong>电话：</strong>{{ row.payload?.contactPhone || '—' }}</p>
            <p><strong>简介：</strong>{{ row.payload?.intro || '—' }}</p>
          </div>
          <pre v-else class="payload-json">{{ JSON.stringify(row.payload, null, 2) }}</pre>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="区域">
        <template #default="{ row }">{{ row.regionId?.name }}</template>
      </el-table-column>
      <el-table-column label="用户">
        <template #default="{ row }">{{ row.userId?.phone }} / {{ row.userId?.nickname }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="success" @click="review(row._id, 'approved')">通过</el-button>
            <el-button size="small" type="danger" @click="review(row._id, 'rejected')">拒绝</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as adminApi from '@/api/admin'
const list = ref([])
const loading = ref(false)
const error = ref('')
const filterType = ref('')

function typeLabel(type) {
  const map = { student: '学生', merchant: '商家', courier: '骑手' }
  return map[type] || type
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = filterType.value ? { type: filterType.value } : {}
    const res = await adminApi.getAdminVerifications(params)
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载审核列表失败'
  } finally {
    loading.value = false
  }
}

async function review(id, status) {
  await adminApi.adminReviewVerification(id, { status })
  ElMessage.success('操作成功')
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
.payload {
  padding: 8px 16px;
  font-size: 13px;
  line-height: 1.8;
}
.payload p {
  margin: 0;
}
.payload-json {
  margin: 0;
  padding: 8px 16px;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
