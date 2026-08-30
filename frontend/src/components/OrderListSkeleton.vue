<template>
  <div class="order-skeleton-list">
    <OrderCardSkeleton v-for="i in count" :key="i" />
  </div>
</template>

<script setup>
import OrderCardSkeleton from './OrderCardSkeleton.vue'

defineProps({
  count: { type: Number, default: 4 },
})
</script>

<style scoped>
.order-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
