<template>
  <div class="legal-page">
    <article class="legal-card">
      <header class="legal-header">
        <p class="brand">{{ LEGAL_META.brand }}</p>
        <h1>{{ doc.title }}</h1>
        <p class="meta">更新日期：{{ LEGAL_META.updatedAt }}（草稿，正式上线前以公示版本为准）</p>
      </header>
      <section v-for="(s, i) in doc.sections" :key="i" class="legal-section">
        <h2>{{ s.heading }}</h2>
        <p>{{ s.body }}</p>
      </section>
      <footer class="legal-footer">
        <router-link to="/register">返回注册</router-link>
        <span class="sep">·</span>
        <router-link :to="other.path">{{ other.title }}</router-link>
        <span class="sep">·</span>
        <router-link to="/">回首页</router-link>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { LEGAL_META, privacyDoc, termsDoc } from '@/content/legal'

const props = defineProps({
  kind: { type: String, required: true },
})

const doc = computed(() => (props.kind === 'terms' ? termsDoc : privacyDoc))
const other = computed(() => (props.kind === 'terms' ? privacyDoc : termsDoc))
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px 16px 48px;
  background: linear-gradient(160deg, #0f766e 0%, #34d399 55%, #ecfdf5 100%);
}
.legal-card {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 28px 20px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(15, 118, 110, 0.18);
}
.legal-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.brand {
  margin: 0 0 6px;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #0f766e;
  font-weight: 600;
}
.legal-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  color: #111827;
}
.meta {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}
.legal-section {
  margin-bottom: 18px;
}
.legal-section h2 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #134e4a;
}
.legal-section p {
  margin: 0;
  line-height: 1.7;
  color: #374151;
  font-size: 14px;
}
.legal-footer {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  font-size: 14px;
}
.legal-footer a {
  color: #0f766e;
  text-decoration: none;
}
.legal-footer a:hover {
  text-decoration: underline;
}
.sep {
  margin: 0 8px;
  color: #9ca3af;
}
</style>
