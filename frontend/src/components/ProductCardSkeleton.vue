<template>
  <div class="skeleton-card">
    <el-skeleton animated>
      <template #template>
        <el-skeleton-item variant="image" style="width:100%;height:140px;border-radius:8px" />
        <el-skeleton-item variant="text" style="width:80%;margin-top:10px" />
        <el-skeleton-item variant="text" style="width:50%" />
        <div style="display:flex;justify-content:space-between;margin-top:8px">
          <el-skeleton-item variant="text" style="width:30%" />
          <el-skeleton-item variant="text" style="width:20%" />
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.skeleton-card {
  padding: 8px;
  border: 1px solid var(--app-border, #ebeef5);
  border-radius: 8px;
  margin-bottom: 12px;
}
</style>
