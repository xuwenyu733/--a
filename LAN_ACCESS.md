# 局域网访问指南

在同一 WiFi / 有线局域网内，让**其他电脑、手机**访问你这台 Mac 上运行的项目。

## 一、在本机（开发机）启动

需要开 **两个终端**，都在项目目录下操作。

### 终端 1：后端（监听所有网卡）

```bash
cd backend
npm run dev
# 或 npm run start
```

启动后会打印类似：

```
📱 局域网访问（同一 WiFi 下的其他电脑/手机）:
   [en0]  http://192.168.1.100:3001
```

### 终端 2：前端（局域网可访问）

```bash
cd frontend
npm run dev:lan
```

启动后 Vite 会显示：

```
➜  Local:   http://localhost:5175/
➜  Network: http://192.168.1.100:5175/
```

**请认准终端里 `Network` 那一行**，不要用已失效的 5176/5177 端口。

> ⚠️ 若浏览器显示 `ERR_CONNECTION_REFUSED` 或 `localhost:5176`，说明端口错了或前端未启动。请用下方 **5175** 地址。

---

## 二、在其他电脑 / 手机打开

1. 确保与开发机连接**同一个路由器 / 热点**
2. 浏览器访问：`http://你的局域网IP:5175`（**不要用 localhost**）
   - 例如：`http://192.168.31.194:5175`
3. 使用测试账号登录即可（与 localhost 相同）

API 和 WebSocket 会通过 Vite 代理转发到本机后端，**无需在其他设备上安装 MongoDB**。

---

## 三、查看本机局域网 IP

**macOS：**

```bash
ipconfig getifaddr en0
# 或
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**系统设置：** 系统设置 → 网络 → Wi‑Fi → 详细信息 → IP 地址

---

## 四、常见问题

### 1. 其他设备打不开页面

- 确认两台设备在同一局域网
- 确认本机防火墙未拦截（见下方 macOS 防火墙）
- 确认后端、前端都已启动
- 尝试关闭 VPN

### 2. macOS 防火墙

系统设置 → 网络 → 防火墙 → 选项 → 允许 Node / 终端 传入连接

或临时关闭防火墙测试。

### 3. 只能访问后端 API、不能访问页面

必须启动 **前端** `npm run dev:lan`，只开后端只能调 API（`http://IP:3001/api/health`），没有网页界面。

### 4. MongoDB

数据库只跑在**开发机本机**，其他设备不装 MongoDB。确保开发机 MongoDB 已启动：

```bash
# Homebrew
brew services start mongodb-community
```

---

## 五、脚本说明

| 命令 | 位置 | 作用 |
|------|------|------|
| `npm run dev` | backend | 本机开发，已默认 `0.0.0.0` |
| `npm run dev:lan` | frontend | 前端允许局域网访问 |
| `npm run dev` | frontend | 仅本机 localhost（不加 --host） |

---

## 六、生产环境局域网（可选）

若已构建前端：

```bash
cd frontend && npm run build
cd backend && npm run start
```

需自行用 Nginx 托管 `frontend/dist`，或将静态文件交给 Express；MVP 开发阶段建议用上面的 **双 dev 模式**。
