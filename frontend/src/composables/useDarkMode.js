import { ref, watch } from 'vue'

const isDark = ref(localStorage.getItem('theme') === 'dark')

if (isDark.value) {
  document.documentElement.classList.add('dark')
}

watch(isDark, (val) => {
  document.documentElement.classList.toggle('dark', val)
  localStorage.setItem('theme', val ? 'dark' : 'light')
})

export function useDarkMode() {
  function toggle() {
    isDark.value = !isDark.value
  }
  return { isDark, toggle }
}
