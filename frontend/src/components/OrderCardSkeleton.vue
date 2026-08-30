<template>
  <div class="order-skeleton">
    <el-skeleton animated>
      <template #template>
        <el-skeleton-item variant="text" style="width:30%;height:24px" />
        <el-skeleton-item variant="image" style="width:100%;height:120px;margin-top:12px;border-radius:8px" />
        <el-skeleton-item variant="text" style="width:60%;margin-top:12px" />
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.order-skeleton {
  padding: 16px;
  border: 1px solid var(--app-border, #ebeef5);
  border-radius: 8px;
  background: var(--app-card-bg, #fff);
}
</style>
