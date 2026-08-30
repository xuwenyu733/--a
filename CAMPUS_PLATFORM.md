# 校园生活服务平台 — 二手 · 简历 · 跑腿

统一品牌、统一登录、统一部署的本校综合服务。

## 三大模块

| 模块 | 入口 | 说明 |
|------|------|------|
| 校园二手 | `/` `/products` | 闲置发布、聊天、下单、四角色后台 |
| AI 简历 | `/resume/build` | 在线创作；记录存 MongoDB |
| 校园跑腿 | `/delivery` | 外卖代取、快递代取；骑手接单配送 |

## 校园跑腿

### 配送区域

- 默认模板：**1～6 号公寓** + **校内其他区域**（`backend/src/constants/delivery.js`）
- 超管：**后台 → 配送区域**（`/admin/delivery-zones`）增删改；可按校区筛选
- 新建校区时自动 **seed** 默认区域；已有校区可点「初始化默认区域」

### 骑手

1. 登录用户（学生或商家）→ **个人中心 / 骑手认证** 或 `/user/verify/courier`
2. 填写姓名、服务类型（外卖/快递）、可选服务区域
3. **超管或本区区域代理 → 审核中心 → 骑手** 通过后 `courierVerified=true`，方可进入 **接单大厅**（`/delivery/hall`）

### 区域代理权限

| 功能 | 路径 | 说明 |
|------|------|------|
| 审核中心 | `/agent/verifications` | 本区学生 / 商家 / **骑手** 认证审核 |
| 配送区域 | `/agent/delivery-zones` | 本区配送区增删改、初始化默认公寓区 |

### 发单与接单

| 角色 | 路径 | 说明 |
|------|------|------|
| 发单人 | `/delivery/post` | 选区域、类型、取件/送达地址、赏金 |
| 骑手 | `/delivery/hall` | 浏览待接单（按区域/类型筛选） |
| 双方 | `/delivery/orders` | 我发布的 / 我接取的订单 |

### API 摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/delivery/zones?regionId=` | 当前校区配送区列表 |
| POST | `/api/delivery/orders` | 发布跑腿单 |
| GET | `/api/delivery/orders/open` | 骑手：待接单列表（需已认证） |
| PATCH | `/api/delivery/orders/:id/accept` | 骑手接单 |
| GET/POST/PUT/DELETE | `/api/admin/delivery-zones` | 超管配送区 CRUD |
| GET/POST/PUT/DELETE | `/api/agent/delivery-zones` | 区域代理配送区 CRUD（仅本区） |
| GET/PATCH | `/api/agent/verifications` | 区域代理审核（含骑手） |
| GET | `/api/agent/delivery-orders` | 区域代理查看本区跑腿单 |
| GET | `/api/admin/delivery-orders` | 超管按校区查看跑腿单 |
| POST | `/api/users/verify/courier` | 提交骑手申请 |

## 简历云端存储

- 集合：`ResumeRecord`（按 `userId` 隔离）
- 优化成功后**自动保存**；侧栏「云端记录」可恢复、删除
- 每用户最多 **50 条**，超出自动删最旧一条
- 本机 `localStorage` 仍作草稿缓存，与云端互补

### API（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/resume/history` | 列表（不含正文） |
| GET | `/api/resume/history/:id` | 详情含全文 |
| POST | `/api/resume/history` | 新建 |
| PUT | `/api/resume/history/:id` | 更新 |
| DELETE | `/api/resume/history/:id` | 删除 |

导出仍为 `/api/resume/export` 等（`resume-module`）。

## 环境变量

`backend/.env`：

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## 目录结构

```
校园二手/
├── frontend/src/modules/resume/   # 简历前端
├── frontend/src/api/resumeHistory.js
├── backend/resume-module/        # 简历 AI（CommonJS）
├── backend/src/models/ResumeRecord.js
├── backend/src/routes/resumeHistory.js
└── CAMPUS_PLATFORM.md
```

## 启动

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev:lan
```

首页服务卡片 → **校园二手** / **简历创作** / **简历优化** / **校园跑腿**。

## 毕设表述建议

> 面向在校师生的 **校园生活服务平台**，包含本校二手交易闭环（认证、区域隔离、即时通讯、信用与审核）与 **AI 简历优化** 子系统（多格式解析、A4 适配、云端历史），采用 Vue3 + Node + MongoDB 统一架构。
