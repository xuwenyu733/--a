<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>区域审核中心</span>
        <el-radio-group v-model="filterType" size="small" @change="load">
          <el-radio-button value="student">学生认证</el-radio-button>
          <el-radio-button value="merchant">商家入驻</el-radio-button>
          <el-radio-button value="courier">骑手认证</el-radio-button>
        </el-radio-group>
        <el-select v-model="filterStatus" style="width:120px" @change="load">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
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
      <el-table-column label="用户" min-width="160">
        <template #default="{ row }">{{ row.userId?.nickname }} ({{ row.userId?.phone }})</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="提交时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="success" @click="review(row._id, 'approved')">通过</el-button>
            <el-button size="small" type="danger" @click="openReject(row)">拒绝</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="rejectVisible" title="拒绝原因" width="400px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写拒绝原因" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as agentApi from '@/api/agent'
const route = useRoute()
const list = ref([])
const loading = ref(false)
const error = ref('')
const filterType = ref(route.query.type || 'student')
const filterStatus = ref('pending')
const rejectVisible = ref(false)
const rejectReason = ref('')
const currentId = ref('')

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await agentApi.getAgentVerifications({
      type: filterType.value,
      status: filterStatus.value,
      pageSize: 50,
    })
    list.value = res.list || []
  } catch (e) {
    error.value = e.message || '加载审核列表失败'
  } finally {
    loading.value = false
  }
}

async function review(id, status) {
  await agentApi.reviewVerification(id, { status })
  ElMessage.success('操作成功')
  load()
}

function openReject(row) {
  currentId.value = row._id
  rejectReason.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  await agentApi.reviewVerification(currentId.value, {
    status: 'rejected',
    rejectReason: rejectReason.value,
  })
  rejectVisible.value = false
  ElMessage.success('已拒绝')
  load()
}

watch(
  () => route.query.type,
  (t) => {
    if (t && ['student', 'merchant', 'courier'].includes(t)) {
      filterType.value = t
      load()
    }
  }
)

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
