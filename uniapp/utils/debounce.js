/**
 * 防抖：连续触发时，仅在停止触发 wait ms 后执行一次
 */
export function debounce(fn, wait = 300) {
  let timer = null
  function debounced(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(this, args)
    }, wait)
  }
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}

/**
 * 节流：wait ms 内最多执行一次（leading + trailing）
 */
export function throttle(fn, wait = 800) {
  let last = 0
  let timer = null
  function throttled(...args) {
    const now = Date.now()
    const remaining = wait - (now - last)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn.apply(this, args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn.apply(this, args)
      }, remaining)
    }
  }
  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return throttled
}
