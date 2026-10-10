<template>
  <div class="beian-footer" :class="{ compact }">
    <a
      v-if="LEGAL_META.icpNumber"
      class="beian-link"
      :href="LEGAL_META.icpUrl"
      target="_blank"
      rel="noopener noreferrer"
    >{{ LEGAL_META.icpNumber }}</a>
    <template v-if="LEGAL_META.policeNumber">
      <span class="sep">·</span>
      <a
        class="beian-link"
        :href="LEGAL_META.policeUrl"
        target="_blank"
        rel="noopener noreferrer"
      >{{ LEGAL_META.policeNumber }}</a>
    </template>
  </div>
</template>

<script setup>
import { LEGAL_META } from '@/content/legal'

defineProps({
  compact: { type: Boolean, default: false },
})
</script>

<style scoped>
.beian-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
}
.beian-footer.compact {
  margin-top: 12px;
}
.beian-link {
  color: #909399;
  text-decoration: none;
}
.beian-link:hover {
  color: #409eff;
  text-decoration: underline;
}
.sep {
  color: #c0c4cc;
}
</style>
