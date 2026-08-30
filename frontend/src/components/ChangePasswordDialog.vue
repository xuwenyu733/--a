<template>
  <el-dialog
    :model-value="visible"
    title="请修改密码"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!forced"
    @update:model-value="(v) => !v && !forced && emit('update:modelValue', false)"
  >
    <el-alert
      v-if="forced"
      type="warning"
      :closable="false"
      show-icon
      title="检测到默认或弱密码，请先修改后再继续使用。"
      style="margin-bottom:16px"
    />
    <el-form label-position="top">
      <el-form-item label="当前密码" required>
        <el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密码" required>
        <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
        <p class="hint">至少 6 位，需包含字母和数字</p>
      </el-form-item>
      <el-form-item label="确认新密码" required>
        <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button v-if="!forced" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  forced: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'success'])

const auth = useAuthStore()
const submitting = ref(false)
const form = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })

watch(
  () => props.modelValue,
  (open) => {
    if (open) form.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  },
)

async function submit() {
  const { oldPassword, newPassword, confirmPassword } = form.value
  if (!oldPassword || !newPassword) {
    ElMessage.warning('请填写完整')
    return
  }
  if (newPassword !== confirmPassword) {
    ElMessage.warning('两次新密码不一致')
    return
  }
  submitting.value = true
  try {
    await auth.changePassword({ oldPassword, newPassword })
    ElMessage.success('密码已修改')
    emit('success')
    emit('update:modelValue', false)
  } catch (e) {
    ElMessage.error(e.message || '修改失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--app-muted);
}
</style>
