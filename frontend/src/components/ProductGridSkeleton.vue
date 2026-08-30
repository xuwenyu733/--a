<template>
  <el-row :gutter="gutter">
    <el-col v-for="i in count" :key="i" :xs="12" :sm="8" :md="6">
      <ProductCardSkeleton />
    </el-col>
  </el-row>
</template>

<script setup>
import ProductCardSkeleton from './ProductCardSkeleton.vue'

defineProps({
  count: { type: Number, default: 8 },
  gutter: { type: Number, default: 16 },
})
</script>
