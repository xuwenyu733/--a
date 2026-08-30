import os from 'os'

/** 获取本机局域网 IPv4 地址列表（排除 127.0.0.1） */
export function getLanAddresses() {
  const nets = os.networkInterfaces()
  const list = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        list.push({ name, address: net.address })
      }
    }
  }
  return list
}

export function printLanUrls(port) {
  const addrs = getLanAddresses()
  if (!addrs.length) {
    console.log('\n⚠️  未检测到局域网 IP，其他设备请确认已连接 WiFi/有线网')
    return
  }
  console.log('\n📱 局域网访问（同一 WiFi 下的其他电脑/手机）:')
  addrs.forEach(({ name, address }) => {
    console.log(`   [${name}]  http://${address}:${port}`)
    console.log(`           ws://${address}:${port}/ws`)
  })
  console.log('')
}
