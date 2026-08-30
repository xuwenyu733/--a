import { ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { WS_EVENTS } from '@/constants/wsEvents'

const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

let ws = null
let reconnectTimer = null
let reconnectDelay = 1000
let authed = false
const pendingOutbound = []
const listeners = new Map()

export function useWebSocket() {
  const connected = ref(false)
  const auth = useAuthStore()

  function flushPending() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !authed) return
    while (pendingOutbound.length) {
      const { event, data } = pendingOutbound.shift()
      ws.send(JSON.stringify({ event, data }))
    }
  }

  function connect() {
    if (!auth.accessToken) return
    if (ws?.readyState === WebSocket.OPEN) return

    authed = false
    ws = new WebSocket(WS_BASE)

    ws.onopen = () => {
      ws.send(JSON.stringify({ event: WS_EVENTS.AUTH, data: { token: auth.accessToken } }))
    }

    ws.onmessage = (ev) => {
      try {
        const { event, data } = JSON.parse(ev.data)
        if (event === WS_EVENTS.AUTH_OK) {
          connected.value = true
          authed = true
          reconnectDelay = 1000
          flushPending()
          emit('connected', data)
          return
        }
        if (event === WS_EVENTS.PONG) return
        emit(event, data)
      } catch {
        /* ignore malformed frame */
      }
    }

    ws.onclose = () => {
      connected.value = false
      authed = false
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (!auth.accessToken) return
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
      connect()
    }, reconnectDelay)
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
    pendingOutbound.length = 0
    ws?.close()
    ws = null
    connected.value = false
    authed = false
  }

  function send(event, data) {
    const payload = { event, data }
    if (event === WS_EVENTS.AUTH) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload))
      }
      return
    }
    if (ws?.readyState === WebSocket.OPEN && authed) {
      ws.send(JSON.stringify(payload))
      return
    }
    pendingOutbound.push(payload)
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connect()
    }
  }

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(handler)
    return () => listeners.get(event)?.delete(handler)
  }

  function emit(event, data) {
    listeners.get(event)?.forEach((h) => h(data))
  }

  function startHeartbeat() {
    const id = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN && authed) {
        send(WS_EVENTS.PING, {})
      }
    }, 30000)
    onUnmounted(() => clearInterval(id))
  }

  return { connected, connect, disconnect, send, on, startHeartbeat }
}
