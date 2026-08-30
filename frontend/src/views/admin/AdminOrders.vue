<template>
  <OrdersManageView
    title="全平台订单管理"
    list-path="/admin/orders"
    restore-path="/admin/orders/:id/restore"
    show-region
    :regions-loader="loadRegions"
  />
</template>

<script setup>
import OrdersManageView from '@/views/shared/OrdersManageView.vue'
import * as adminApi from '@/api/admin'

async function loadRegions() {
  return adminApi.getRegions()
}
</script>
