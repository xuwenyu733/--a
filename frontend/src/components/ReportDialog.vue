<template>
  <el-dialog v-model="visible" title="举报" width="420px" @closed="reset">
    <el-form label-width="80px">
      <el-form-item label="举报原因" required>
        <el-select v-model="reason" placeholder="请选择" style="width:100%">
          <el-option v-for="(label, key) in reasons" :key="key" :label="label" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item label="补充说明">
        <el-input v-model="description" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="选填，便于我们核实" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="danger" :loading="submitting" @click="submit">提交举报</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as reportApi from '@/api/report'

const props = defineProps({
  modelValue: Boolean,
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const visible = ref(false)
const reason = ref('')
const description = ref('')
const reasons = ref({})
const submitting = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
    if (v && !Object.keys(reasons.value).length) loadReasons()
  }
)
watch(visible, (v) => emit('update:modelValue', v))

async function loadReasons() {
  reasons.value = await reportApi.getReportReasons()
}

function reset() {
  reason.value = ''
  description.value = ''
}

async function submit() {
  if (!reason.value) return ElMessage.warning('请选择举报原因')
  submitting.value = true
  try {
    await reportApi.submitReport({
      targetType: props.targetType,
      targetId: props.targetId,
      reason: reason.value,
      description: description.value,
    })
    ElMessage.success('举报已提交')
    visible.value = false
    emit('submitted')
  } catch (e) {
    ElMessage.error(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>
