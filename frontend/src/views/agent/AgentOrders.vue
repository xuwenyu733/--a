<template>
  <OrdersManageView
    title="本区域订单管理"
    list-path="/agent/orders"
    restore-path="/agent/orders/:id/restore"
  />
</template>

<script setup>
import OrdersManageView from '@/views/shared/OrdersManageView.vue'
</script>
