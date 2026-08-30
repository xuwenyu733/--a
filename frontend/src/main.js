import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import './style.css'
import '@/modules/resume/styles/resume-templates.css'

const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const auth = useAuthStore()
await auth.restoreSession()

app.use(router)
app.mount('#app')
