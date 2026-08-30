import { publishWsToCluster } from './redisBridge.js'
import { resolveUploadUrls } from '../utils/resolveUploadUrls.js'

class ConnectionManager {
  /** @type {Map<string, Set<import('ws').WebSocket>>} */
  connections = new Map()

  add(userId, ws) {
    const id = userId.toString()
    if (!this.connections.has(id)) {
      this.connections.set(id, new Set())
    }
    this.connections.get(id).add(ws)
    ws.userId = id
  }

  remove(ws) {
    const id = ws.userId
    if (!id) return
    const set = this.connections.get(id)
    if (!set) return
    set.delete(ws)
    if (set.size === 0) this.connections.delete(id)
  }

  sendToLocal(userId, event, data) {
    const set = this.connections.get(userId.toString())
    if (!set) return false
    const payload = JSON.stringify({ event, data })
    set.forEach((ws) => {
      if (ws.readyState === 1) ws.send(payload)
    })
    return true
  }

  sendToUser(userId, event, data) {
    const resolved = resolveUploadUrls(data)
    const sent = this.sendToLocal(userId, event, resolved)
    publishWsToCluster(userId, event, resolved)
    return sent
  }

  isOnline(userId) {
    return this.connections.has(userId.toString())
  }
}

export const connectionManager = new ConnectionManager()
