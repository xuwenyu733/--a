<template>
  <el-tooltip v-if="showTip" placement="top">
    <template #content>
      <div class="credit-tip">
        <p>信用分：{{ score }}</p>
        <p v-for="(r, i) in CREDIT_RULES" :key="i">{{ r }}</p>
      </div>
    </template>
    <el-tag :type="level.type || 'info'" size="small" class="credit-tag">
      信用 {{ score }} · {{ level.label }}
    </el-tag>
  </el-tooltip>
  <el-tag v-else :type="level.type || 'info'" size="small">信用 {{ score }} · {{ level.label }}</el-tag>
</template>

<script setup>
import { computed } from 'vue'
import { getCreditLevel, CREDIT_RULES } from '@/constants/credit'

const props = defineProps({
  score: { type: Number, default: 100 },
  showTip: { type: Boolean, default: true },
})

const level = computed(() => getCreditLevel(props.score))
</script>

<style scoped>
.credit-tip p { margin: 4px 0; font-size: 12px; max-width: 220px; }
.credit-tag { cursor: help; }
</style>
