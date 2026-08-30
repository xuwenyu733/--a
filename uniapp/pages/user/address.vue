<template>
  <view class="container">
    <LoadState
      :loading="loading"
      :error="loadError"
      :has-data="list.length > 0"
      empty-text="暂无地址，点击下方按钮添加"
      @retry="load"
    />
    <view v-for="addr in list" :key="addr._id" class="card addr-card" @tap="edit(addr)">
      <view class="addr-head">
        <text class="name">{{ addr.name }}</text>
        <text class="phone">{{ addr.phone }}</text>
        <text v-if="addr.isDefault" class="tag success">默认</text>
      </view>
      <text class="full-addr muted">{{ addr.region }} {{ addr.detail }}</text>
      <view class="addr-actions">
        <text v-if="!addr.isDefault" class="action-link" @tap.stop="setDefault(addr._id)">设默认</text>
        <text class="action-link danger" @tap.stop="remove(addr._id)">删除</text>
      </view>
    </view>

    <button class="add-btn" type="primary" @tap="openAdd">添加新地址</button>

    <!-- 编辑弹窗 -->
    <view v-if="showForm" class="mask" @tap="closeForm">
      <view class="form-panel card" @tap.stop>
        <text class="section-title">{{ editId ? '编辑地址' : '添加地址' }}</text>
        <text class="label">收件人 *</text>
        <input class="input" v-model="form.name" placeholder="姓名" />
        <text class="label">电话 *</text>
        <input class="input" type="number" maxlength="11" v-model="form.phone" placeholder="手机号" />
        <text class="label">区域</text>
        <input class="input" v-model="form.region" placeholder="如：XX校区XX宿舍楼" />
        <text class="label">详细地址 *</text>
        <input class="input" v-model="form.detail" placeholder="楼栋、楼层、房间号" />
        <button type="primary" :loading="saving" @tap="save">保存</button>
        <button @tap="closeForm">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/api/address'
import { ensureLogin } from '@/utils/auth'
import LoadState from '@/components/LoadState.vue'

const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const list = ref([])
const showForm = ref(false)
const editId = ref('')
const form = ref({ name: '', phone: '', region: '', detail: '' })

onShow(() => {
  if (ensureLogin()) load()
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getAddresses()
    list.value = (res.list || res || [])
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editId.value = ''
  form.value = { name: '', phone: '', region: '', detail: '' }
  showForm.value = true
}

function edit(addr) {
  editId.value = addr._id
  form.value = {
    name: addr.name || '',
    phone: addr.phone || '',
    region: addr.region || '',
    detail: addr.detail || '',
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

async function save() {
  if (!form.value.name?.trim() || !form.value.phone?.trim() || !form.value.detail?.trim()) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  saving.value = true
  try {
    if (editId.value) {
      await updateAddress(editId.value, form.value)
    } else {
      await createAddress(form.value)
    }
    uni.showToast({ title: '已保存', icon: 'success' })
    closeForm()
    load()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function setDefault(id) {
  try {
    await setDefaultAddress(id)
    load()
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

function remove(id) {
  uni.showModal({
    title: '删除确认',
    content: '确定删除该地址？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteAddress(id)
        uni.showToast({ title: '已删除', icon: 'none' })
        load()
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.container { padding: 24rpx; min-height: 100vh; background: #f5f7fa; }
.addr-card { position: relative; padding: 24rpx; margin-bottom: 16rpx; }
.addr-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 10rpx; }
.name { font-weight: 600; font-size: 30rpx; }
.phone { color: #606266; font-size: 28rpx; }
.full-addr { display: block; margin-bottom: 6rpx; }
.addr-actions { display: flex; gap: 24rpx; margin-top: 12rpx; }
.action-link { font-size: 26rpx; color: #409eff; }
.action-link.danger { color: #f56c6c; }
.add-btn { width: 100%; margin-top: 32rpx; background: #409eff; }
.mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200;
  display: flex; align-items: flex-end;
}
.form-panel {
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 32rpx 28rpx calc(32rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
}
.section-title { display: block; font-size: 32rpx; font-weight: 600; margin-bottom: 24rpx; }
.label { display: block; margin: 16rpx 0 8rpx; font-weight: 500; font-size: 28rpx; }
.input {
  display: block; width: 100%; height: 80rpx; padding: 0 20rpx;
  background: #f5f7fa; border-radius: 12rpx; font-size: 28rpx; box-sizing: border-box;
}
button[type='primary'] { margin: 24rpx 0 12rpx; background: #409eff; }
</style>
