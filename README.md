# 校园综合服务平台（二手 · 简历 · 跑腿）

> 校园二手交易 + AI 简历 + **校园跑腿（外卖/快递代取）**，统一登录与部署。详见 **[CAMPUS_PLATFORM.md](./CAMPUS_PLATFORM.md)**。

## 项目结构

```
校园二手/
├── backend/          # Node.js + Express + MongoDB 后端
├── frontend/          # Vue3 + Pinia + Element Plus 管理端 / Web
├── uniapp/          # UniApp 跨端（微信小程序等，唯一小程序入口）
├── docs/            # 测试、安全、数据库等文档
├── DEVELOPMENT_PLAN.md
├── DEPLOY.md          # 生产部署（PM2 + Nginx）
├── LAN_ACCESS.md      # 开发局域网访问
├── deploy/            # Nginx 配置模板
└── README.md
```

## 环境要求

- Node.js 18+
- MongoDB 6+（本地或 MongoDB Atlas）

## 快速启动

### 一键启动（推荐）

```bash
# 项目根目录
npm install   # 首次：分别在 backend、frontend 下 npm install
npm run dev   # 同时启动后端 3001 + 前端 5175
npm run stop  # 停止
```

### 微信小程序（UniApp）

```bash
cd uniapp && npm run dev:mp-weixin
# 微信开发者工具打开 uniapp/unpackage/dist/dev/mp-weixin
```

> 早期原生 `miniprogram/` 目录已移除，请统一使用 UniApp 编译小程序。

### 1. 启动 MongoDB

确保 MongoDB 运行在 `mongodb://127.0.0.1:27017`

### 2. 后端

```bash
cd backend
npm install
npm run seed    # 初始化区域、测试账号
npm run dev     # http://localhost:3001（支持局域网）
```

### 3. 前端

```bash
cd frontend
npm install
npm run dev:lan # 本机 + 局域网，用终端里 Network 地址
```

### 4. 同一 WiFi 下其他电脑访问

详见 **[LAN_ACCESS.md](./LAN_ACCESS.md)**：其他设备浏览器打开 `http://你的局域网IP:5175`（IP 以 Vite 启动时显示的 Network 为准）。

## 测试账号

| 身份 | 手机号 | 密码 |
|------|--------|------|
| 超级管理员 | 13800000000 | admin123456 |
| 区域代理 | 13800000001 | agent123456 |
| 商家 | 13800000002 | merchant123 |
| 学生（已认证） | 13800000003 | student123 |
| 学生 | 自行注册 | 验证码 `123456` |

## API 前缀

`http://localhost:3001/api`

健康检查：`GET /api/health`

## 已完成功能（第一阶段）

- [x] 四类身份 RBAC（学生 / 商家 / 区域代理 / 超级管理员）
- [x] 区域划分与数据隔离
- [x] 注册登录 + JWT 双 Token + 无感刷新
- [x] 学生认证 + 商家入驻 + 代理/超管审核
- [x] 四套后台 Layout 与路由守卫
- [x] 商品系统（发布/浏览/搜索/收藏/代理下架）
- [x] WebSocket 即时聊天（文字/图片、已读、联系卖家、通知）
- [x] 订单流程（下单/确认/完成/取消）
- [x] 举报功能（商品举报 + 代理/超管处理）
- [x] 首页轮播与公告（超管平台配置）
- [x] 生产模式单端口部署（后端托管前端 dist）
- [x] 移动端基础适配（导航抽屉、响应式布局）
- [x] 商家数据统计、代理区域看板增强
- [x] 审计/操作日志（代理 + 超管）
- [x] 店铺主页 `/shop/:userId`、用户主页 `/users/:id`
- [x] 搜索历史（登录用户）
- [x] 超管全平台商品管理（按区域/状态筛选、强制下架）
- [x] 商品推荐（首页热门、详情页同分类相关推荐）
- [x] 用户信用分（交易加分、举报扣分、个人页/详情展示）
- [x] **AI 简历创作**（`/resume/build`，登录后使用，需配置 `OPENAI_API_KEY`）
- [x] 简历创作记录 **MongoDB 云端保存**（每用户最多 50 条，可恢复）
- [x] 首页服务入口（二手市集、简历创作、校园跑腿）、品牌「校园服务」
- [x] **校园跑腿**（`/delivery`）：外卖代取、快递代取、发布订单、骑手接单
- [x] **骑手认证**：任意学生/商家可申请，**超管审核通过**后方可接单
- [x] **配送区域**：1～6 号公寓 + 校内其他区域，超管后台增删改；新建校区时自动初始化

## 逐步开发路线（P2）

| 步骤 | 功能 | 状态 |
|------|------|------|
| 1 | 超管全平台商品管理 | ✅ 已完成 |
| 2 | 首页商品简单推荐 | ✅ 已完成 |
| 3 | 用户信用评分 | ✅ 已完成 |
| 4 | PM2 / Nginx 部署文档 | ✅ 已完成 |

## 图片存储（默认：本地）

**未购买 OSS 时**：图片保存在 `backend/uploads/`，生产环境**不要**配置 `OSS_*` 变量。  
按 **[LOCAL_STORAGE_DEPLOY.md](./LOCAL_STORAGE_DEPLOY.md)** 构建、部署与备份即可。

以后上云可选：**[OSS_SETUP.md](./OSS_SETUP.md)**。

## 体验与安全补充

- [x] 深色模式（CSS 变量 + Element Plus dark）
- [x] 图片 URL 统一 `getFileUrl`（支持 OSS 前缀）
- [x] 聊天搜索高亮 XSS 防护（转义后高亮）
- [x] `.env.example` 补充 `OSS_BASE_URL` 说明

## 上线前检查

部署到公网前，请完成 **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)**（环境、四角色流程、WebSocket、图片、移动端）。

服务已启动且已 `npm run seed` 后，可跑 API 冒烟：

```bash
cd backend && npm run smoke
```

## 生产部署（本地存储）

**本机快速验证：**

```bash
cd frontend && npm run build
mkdir -p backend/uploads
cd backend && NODE_ENV=production npm run start
```

浏览器访问 `http://localhost:3001`（API、静态资源、上传图 `/uploads`、SPA 同端口）。

```bash
chmod +x scripts/prod-local-verify.sh scripts/backup-data.sh
./scripts/prod-local-verify.sh
cd backend && npm run smoke
```

**云服务器（PM2 + Nginx）：** [LOCAL_STORAGE_DEPLOY.md](./LOCAL_STORAGE_DEPLOY.md) · [DEPLOY.md](./DEPLOY.md)

```bash
cd frontend && npm run build
cd backend && npm run pm2:start   # 需先安装 pm2 并配置 .env
```
