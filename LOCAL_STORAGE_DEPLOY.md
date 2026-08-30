# 本地存储上线指南（未购买 OSS）

本项目**默认**将商品图、聊天图保存在服务器目录 `backend/uploads/`，通过 **同源路径** `/uploads/文件名` 访问。  
**无需配置任何 OSS 环境变量**，启动日志应显示：`对象存储: 本地 uploads/ 目录`。

---

## 一、环境变量（backend/.env）

复制示例并修改密钥即可，**不要**填写 `OSS_*` 相关项：

```env
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
MONGODB_URI=mongodb://127.0.0.1:27017/campus_secondhand

JWT_SECRET=请改为随机长字符串
JWT_REFRESH_SECRET=请改为另一随机长字符串

SUPER_ADMIN_PHONE=13800000000
SUPER_ADMIN_PASSWORD=请改为强密码
```

前端生产构建 **无需** `VITE_OSS_BASE_URL`（留空即可，图片走 `/uploads/...`）。

---

## 二、本机一键验证（上线前）

```bash
# 1. 构建前端
cd frontend && npm install && npm run build

# 2. 准备上传目录
mkdir -p ../backend/uploads
chmod 755 ../backend/uploads

# 3. 初始化数据（首次）
cd ../backend && npm install && npm run seed

# 4. 生产模式启动
NODE_ENV=production npm run start
```

浏览器打开 **http://localhost:3001**：

- 登录学生账号 → 发布带图商品 → 列表/详情图片能显示  
- 聊天发图 → 能加载  
- 地址栏图片路径应为 `/uploads/xxxx.jpg`（不是 `/api/uploads`）

另开终端：

```bash
cd backend && npm run smoke    # API 冒烟
curl -s http://127.0.0.1:3001/api/health
```

---

## 三、云服务器部署（PM2 + Nginx）

完整步骤见 **[DEPLOY.md](./DEPLOY.md)**，本地存储只需额外注意：

### 1. 上传目录持久化

```bash
mkdir -p /opt/campus-secondhand/backend/uploads
chmod 755 /opt/campus-secondhand/backend/uploads
# 若用 PM2 以某用户运行，确保该用户对 uploads 可写
```

### 2. Nginx 两种写法（二选一）

**方案 A（推荐，最简单）**：全部反代到 Node，由 Express 提供 `/uploads`  
使用 `deploy/nginx-campus-secondhand.conf` 时，可**注释掉** `location /uploads/` 整段，只保留 `location / { proxy_pass ... }`。

**方案 B（略快）**：Nginx 直接读磁盘  

```nginx
location /uploads/ {
    alias /opt/campus-secondhand/backend/uploads/;
    expires 7d;
}
```

其余请求仍 `proxy_pass` 到 `127.0.0.1:3001`。

### 3. PM2 启动

```bash
cd /opt/campus-secondhand/frontend && npm run build
cd /opt/campus-secondhand/backend
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

确认日志：**本地 uploads/ 目录**，而非 OSS。

---

## 四、备份（必做）

图片在磁盘上，**重装系统或误删目录会丢图**。建议每日备份：

```bash
# 在项目根目录
./scripts/backup-data.sh
```

或手动：

```bash
tar -czf uploads-20 20 12 61 79 80 81 33 98 100 204 250 395 398 399 400 701date +%Y%m%d).tar.gz -C backend uploads
mongodump --uri="mongodb://127.0.0.1:27017/campus_secondhand" --out=./backup/mongo-$(date +%Y%m%d)
```

将压缩包传到另一台机器或对象存储（仅作冷备，不必接 OSS 上传接口）。

---

## 五、容量与限制

| 项 | 说明 |
|----|------|
| 单张图片 | 最大 5MB（multer 限制） |
| 单次上传 | 最多 9 张 |
| 磁盘 | 建议预留 ≥ 10GB；定期清理已下架商品的旧图（可后续做管理功能） |

用户量较大后再考虑 [OSS_SETUP.md](./OSS_SETUP.md) 迁移，存库路径仍为 `/uploads/...` 格式，迁移脚本可另行编写。

---

## 六、常见问题

**图片 404**  
- 确认文件存在于 `backend/uploads/`  
- 生产是否 `NODE_ENV=production` 且已 build 前端  
- 路径是否为 `/uploads/xxx` 而非 `/api/uploads/xxx`

**上传成功但看不到图**  
- 检查目录权限 `chmod 755`  
- `pm2 logs` 是否有写入错误  

**换服务器**  
- 除代码与 `.env` 外，必须拷贝 `backend/uploads/` 与 MongoDB 数据  

---

## 相关文档

- [DEPLOY.md](./DEPLOY.md) — Nginx / HTTPS / PM2  
- [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) — 上线勾选清单  
- [OSS_SETUP.md](./OSS_SETUP.md) — 以后上云时再读  
