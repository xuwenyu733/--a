<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
})
</script>

<template>
  <div class="resume-page">
    <header class="header">
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </header>
    <slot />
  </div>
</template>

<style scoped>
.resume-page {
  padding: 16px 24px 24px;
  max-width: 1680px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
  color: var(--app-text);
}

.header p {
  color: var(--app-muted);
  margin: 0;
  font-size: 14px;
}

@media (max-width: 960px) {
  .resume-page {
    padding: 12px;
  }
}
</style>
