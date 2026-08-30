import config from '@/config/index'
import { getAccessToken } from './auth'
import { WS_EVENTS } from './wsEvents'

let socketTask = null
let reconnectTimer = null
let heartbeatTimer = null
let reconnectDelay = 1000
let connecting = false
let connected = false
let intentionalClose = false
let reconnectAttempts = 0
const MAX_RECONNECT = 5
const listeners = new Map()

const HEARTBEAT_INTERVAL = 30000

function isSocketTask(task) {
  return task && typeof task.onOpen === 'function'
}

let connectTimeoutTimer = null
const CONNECT_TIMEOUT = 8000

function clearConnectTimeout() {
  if (connectTimeoutTimer) {
    clearTimeout(connectTimeoutTimer)
    connectTimeoutTimer = null
  }
}

function bindSocketTask(task) {
  if (!isSocketTask(task)) {
    connecting = false
    clearConnectTimeout()
    console.error('[ws] connectSocket 未返回有效 SocketTask')
    scheduleReconnect()
    return
  }

  socketTask = task
  clearConnectTimeout()
  connectTimeoutTimer = setTimeout(() => {
    if (!connected && connecting) {
      connecting = false
      connected = false
      try { task.close({}) } catch { /* ignore */ }
      socketTask = null
      scheduleReconnect()
    }
  }, CONNECT_TIMEOUT)

  task.onOpen(() => {
    clearConnectTimeout()
    connecting = false
    connected = true
    reconnectAttempts = 0
    reconnectDelay = 1000
    send(WS_EVENTS.AUTH, { token: getAccessToken() })
    startHeartbeat()
  })

  task.onMessage((msg) => {
    try {
      const packet = JSON.parse(msg.data)
      if (packet.event === WS_EVENTS.PONG) return
      emit(packet.event, packet.data)
    } catch { /* ignore */ }
  })

  task.onClose(() => {
    clearConnectTimeout()
    connecting = false
    connected = false
    socketTask = null
    clearHeartbeat()
    if (!intentionalClose) scheduleReconnect()
  })

  task.onError(() => {
    clearConnectTimeout()
    connecting = false
    connected = false
    clearHeartbeat()
    scheduleReconnect()
  })
}

function closeSocket() {
  intentionalClose = true
  clearConnectTimeout()
  if (socketTask) {
    try { socketTask.close({}) } catch { /* ignore */ }
    socketTask = null
  }
  connecting = false
  connected = false
}

export function connectWs() {
  const token = getAccessToken()
  if (!token) return
  if (connecting || connected) return

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  closeSocket()
  intentionalClose = false
  connecting = true
  clearHeartbeat()

  try {
    const result = uni.connectSocket({
      url: config.WS_BASE,
      fail: () => {
        connecting = false
        scheduleReconnect()
      },
    })

    if (result && typeof result.then === 'function') {
      result.then(bindSocketTask).catch((err) => {
        console.warn('connectSocket failed', err)
        connecting = false
        scheduleReconnect()
      })
    } else {
      bindSocketTask(result)
    }
  } catch {
    connecting = false
    scheduleReconnect()
  }
}

function startHeartbeat() {
  clearHeartbeat()
  heartbeatTimer = setInterval(() => {
    send(WS_EVENTS.PING, {})
  }, HEARTBEAT_INTERVAL)
}

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

function scheduleReconnect() {
  if (reconnectTimer || intentionalClose) return
  if (!getAccessToken()) return
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.warn('[ws] stop reconnect after', MAX_RECONNECT, 'attempts')
    return
  }
  reconnectAttempts += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    connectWs()
  }, reconnectDelay)
}

function send(event, data) {
  if (!socketTask || !connected) return
  try {
    socketTask.send({ data: JSON.stringify({ event, data }) })
  } catch { /* ignore */ }
}

export function onWs(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(handler)
}

export function offWs(event, handler) {
  listeners.get(event)?.delete(handler)
}

function emit(event, data) {
  listeners.get(event)?.forEach((fn) => {
    try { fn(data) } catch { /* ignore */ }
  })
}

export function disconnectWs() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  clearHeartbeat()
  clearConnectTimeout()
  closeSocket()
  intentionalClose = false
}
