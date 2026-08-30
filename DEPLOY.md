# 生产环境部署指南（PM2 + Nginx）

本文档说明如何将「校园二手」部署到 Linux 云服务器（Ubuntu / Debian 为例），使用 **PM2** 守护 Node 进程、**Nginx** 反向代理并支持 **HTTPS / WebSocket**。

> **上线前必做**：按 [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) 完成环境与四角色回归测试后再对外开放。

> **未购买 OSS**：图片走服务器本地目录，见 **[LOCAL_STORAGE_DEPLOY.md](./LOCAL_STORAGE_DEPLOY.md)**（不要配置 `OSS_*` 环境变量）。

---

## 一、架构说明

```
用户浏览器
    │  HTTPS (443) / HTTP (80)
    ▼
  Nginx（反向代理）
    │  http://127.0.0.1:3001
    ▼
  Node.js + Express（PM2 守护）
    ├── /api          REST API
    ├── /ws           WebSocket 聊天
    ├── /uploads      上传图片
    └── /*            Vue 构建产物（SPA）
    │
    ▼
  MongoDB（本机或 Atlas）
```

生产模式下 **前后端同端口**：先构建 `frontend/dist`，再由 `backend` 在 `NODE_ENV=production` 时托管静态资源。

---

## 二、服务器环境准备

### 2.1 安装依赖

```bash
# Node.js 18+（推荐用 nvm）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB（本机部署时）
sudo apt install -y mongodb-org

# Nginx + PM2
sudo apt install -y nginx
sudo npm install -g pm2
```

### 2.2 创建部署目录

```bash
sudo mkdir -p /opt/campus-secondhand
sudo chown $USER:$USER /opt/campus-secondhand
cd /opt/campus-secondhand
```

将项目代码上传至此（`git clone`、rsync 或 scp 均可）。

---

## 三、配置环境变量

```bash
cd /opt/campus-secondhand/backend
cp .env.example .env
nano .env
```

**生产环境务必修改**：

```env
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
MONGODB_URI=mongodb://127.0.0.1:27017/campus_secondhand
# 或使用 MongoDB Atlas：
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/campus_secondhand

JWT_SECRET=请替换为随机长字符串
JWT_REFRESH_SECRET=请替换为另一随机长字符串
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

SUPER_ADMIN_PHONE=13800000000
SUPER_ADMIN_PASSWORD=请设置强密码
DEV_SMS_CODE=123456
```

说明：

- `HOST=127.0.0.1`：仅本机监听，由 Nginx 对外暴露，更安全。
- 勿将 `.env` 提交到 Git。
- **本地图片（默认）**：`mkdir -p backend/uploads && chmod 755 backend/uploads`，勿配置 `OSS_*`。
- 图片上云（可选）：见 **[OSS_SETUP.md](./OSS_SETUP.md)**。

---

## 四、构建与初始化

```bash
# 1. 安装依赖
cd /opt/campus-secondhand/backend && npm install
cd /opt/campus-secondhand/frontend && npm install

# 2. 构建前端
cd /opt/campus-secondhand/frontend && npm run build

# 3. 确认 dist 存在
ls /opt/campus-secondhand/frontend/dist/index.html

# 4. 初始化数据库（首次）
cd /opt/campus-secondhand/backend && npm run seed

# 5. 确保上传目录可写
mkdir -p /opt/campus-secondhand/backend/uploads
chmod 755 /opt/campus-secondhand/backend/uploads
```

---

## 五、使用 PM2 启动

项目已包含 `backend/ecosystem.config.cjs`：

```bash
cd /opt/campus-secondhand/backend

# 启动
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status
pm2 logs campus-secondhand

# 开机自启
pm2 save
pm2 startup
# 按提示执行 sudo 命令
```

常用命令：

| 命令 | 说明 |
|------|------|
| `pm2 restart campus-secondhand` | 重启应用 |
| `pm2 reload campus-secondhand` | 零停机重载 |
| `pm2 stop campus-secondhand` | 停止 |
| `pm2 monit` | 监控 CPU / 内存 |

### 更新发布流程

```bash
cd /opt/campus-secondhand
git pull   # 或重新上传代码

cd frontend && npm install && npm run build
cd ../backend && npm install
pm2 restart campus-secondhand
```

---

## 六、Nginx 反向代理

### 6.1 复制站点配置

```bash
sudo cp /opt/campus-secondhand/deploy/nginx-campus-secondhand.conf \
  /etc/nginx/sites-available/campus-secondhand

# 编辑域名
sudo nano /etc/nginx/sites-available/campus-secondhand
# 将 your-domain.com 改为你的域名或服务器 IP

sudo ln -sf /etc/nginx/sites-available/campus-secondhand \
  /etc/nginx/sites-enabled/campus-secondhand

sudo nginx -t
sudo systemctl reload nginx
```

### 6.2 仅用 IP 访问（无域名）

将配置中的 `server_name` 改为服务器公网 IP，或 `_`，然后访问 `http://你的IP/`。

### 6.3 配置 HTTPS（推荐）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot 会自动修改 Nginx 并配置证书续期。配置完成后 WebSocket 使用 `wss://`（前端已按 `location.protocol` 自动切换）。

---

## 七、防火墙与安全

```bash
# 仅开放 SSH、HTTP、HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

- **不要** 将 3001 端口直接暴露到公网（仅 Nginx 访问）。
- MongoDB 若在本机，保持 `bindIp: 127.0.0.1`。
- 定期备份 `uploads/` 与 MongoDB 数据。

---

## 八、健康检查

```bash
# 本机
curl http://127.0.0.1:3001/api/health

# 经 Nginx
curl http://your-domain.com/api/health
```

正常返回：`{"code":0,"message":"ok",...}`

### 本机生产模式快速验证（部署前）

```bash
cd frontend && npm run build
cd ../backend && NODE_ENV=production npm run start
# 另开终端
curl -s http://127.0.0.1:3001/api/health
# 浏览器访问 http://127.0.0.1:3001 ，抽查登录、商品图、聊天 WS
```

完整回归项见 **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)**。

---

## 九、常见问题

### 1. `EADDRINUSE: 3001`

端口被占用：

```bash
lsof -i :3001
kill <PID>
pm2 restart campus-secondhand
```

### 2. 页面空白 / 404

- 确认已执行 `cd frontend && npm run build`
- 确认 `NODE_ENV=production`
- 查看 `pm2 logs` 是否有路径错误

### 3. WebSocket 连不上

- Nginx 配置需包含 `Upgrade` / `Connection` 头（见 `deploy/nginx-campus-secondhand.conf`）
- HTTPS 站点必须使用 `wss`，且证书有效

### 4. 图片上传失败

- 检查 `backend/uploads` 目录权限
- Nginx `client_max_body_size` 建议 ≥ `10m`

### 5. MongoDB 连接失败

- 本机：`sudo systemctl status mongod`
- Atlas：检查 IP 白名单与连接串用户名密码

---

## 十、与本机开发的区别

| 项目 | 开发 | 生产 |
|------|------|------|
| 前端 | Vite `5175` | 构建进 `frontend/dist`，由 Node 托管 |
| 后端 | `npm run dev` | PM2 + `NODE_ENV=production` |
| 访问 | `localhost:5175` + 代理 | 域名 / IP → Nginx → 3001 |
| 局域网 | 见 [LAN_ACCESS.md](./LAN_ACCESS.md) | 一般不需要 |

---

## 十一、相关文件

| 文件 | 说明 |
|------|------|
| `docs/TESTING.md` | 单元/集成测试与冒烟脚本 |
| `docs/SECURITY.md` | 密钥扫描与生产安全配置 |
| `docs/DATABASE.md` | MongoDB 索引说明 |
| `uniapp/README.md` | 微信小程序（UniApp）开发与编译 |
| `backend/ecosystem.config.cjs` | PM2 配置 |
| `.github/workflows/ci.yml` | GitHub Actions（单元 + 集成测试） |
| `deploy/nginx-campus-secondhand.conf` | Nginx 站点模板 |
| `backend/.env.example` | 环境变量示例 |

部署完成后，使用浏览器访问你的域名即可使用全站功能（含聊天 WebSocket）。
