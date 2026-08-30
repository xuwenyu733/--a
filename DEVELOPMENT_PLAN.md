# 校园二手交易 + 即时通讯平台 — 完整开发计划

> **项目定位**：本校专属二手交易平台，主打「本校交易、当面验货、即时沟通、零手续费」  
> **MVP 目标**：2 个月内完成 Web 端上线，覆盖注册登录 → 商品发布浏览 → 实时聊天核心链路  
> **技术栈**：Vue3 + Pinia + Element Plus + TailwindCSS | Node.js + Express + JWT + ws | MongoDB + Mongoose

---

## 一、项目概述

### 1.1 解决的核心痛点

| 痛点 | 闲鱼/转转 | 本平台 |
|------|-----------|--------|
| 跨校交易麻烦 | 全国范围，面交难 | 仅限本校，宿舍/教学楼面交 |
| 骗子多 | 身份难验证 | 学号 + 姓名 + 入学年份认证 |
| 沟通不及时 | 消息延迟 | WebSocket 即时通讯 |
| 运费贵 | 需邮寄 | 当面验货，零运费 |
| 手续费 | 平台抽成 | 零手续费 |

### 1.2 四类身份与职责

平台采用 **RBAC（基于角色的访问控制）**，共四种身份：

| 身份 | 英文标识 | 定位 | 核心职责 |
|------|----------|------|----------|
| **学生** | `student` | 普通 C 端用户（默认注册身份） | 浏览/搜索商品、发布个人闲置、收藏、聊天、下单、学生认证 |
| **商家** | `merchant` | 校园周边 B 端商户 | 店铺主页、批量发布商品、商家标识、接单发货/面交、店铺数据统计 |
| **区域代理** | `regional_agent` | 某校区/区域运营负责人 | 审核本区域学生认证与商家入驻、商品/用户 moderation、本区域数据看板 |
| **超级管理员** | `super_admin` | 平台最高权限 | 全局用户/商家/代理管理、区域划分、系统配置、全平台数据与审计日志 |

**身份关系说明**
```
超级管理员
  ├── 创建/管理 区域代理（绑定负责区域）
  ├── 终审商家入驻、处理跨区域申诉
  └── 全平台配置与数据

区域代理（绑定 regionId，只能操作本区域数据）
  ├── 审核 学生认证 申请
  ├── 审核 商家入驻 申请
  ├── 处理本区域 举报/违规商品/封禁用户
  └── 查看本区域 运营数据

商家（需入驻审核通过）
  └── 在本区域发布商家商品，展示「认证商家」标识

学生（注册默认身份，认证后可发布个人闲置）
  └── 仅限本区域浏览与交易
```

**注册与身份切换规则**
- 注册时默认身份为 **学生**，需选择所属 **区域/学校**
- **商家**：学生可提交「商家入驻申请」，或由超级管理员/区域代理直接创建；审核通过后 `role` 变更为 `merchant`
- **区域代理**：仅 **超级管理员** 可在后台创建，不可自助注册
- **超级管理员**：系统初始化时种子账号创建，或通过环境变量指定首个超管；后续仅超管可新增超管
- 一个手机号对应一个账号；商家与学生不共存于同一账号（入驻成功后身份切换）

### 1.3 MVP 功能边界（2 个月）

**必须做（P0）**
- 四类身份 RBAC 权限体系（学生 / 商家 / 区域代理 / 超级管理员）
- 区域（学校）划分与数据隔离
- 用户注册/登录 + 学生认证 + 商家入驻审核
- 商品发布/浏览/搜索/筛选（区分个人闲置 / 商家商品）
- 一对一即时聊天（文字 + 图片）
- 个人中心 / 商家中心 / 代理后台 / 超管后台（基础版）
- 区域代理审核工作台

**第二阶段做（P1）**
- 系统通知（收藏、下单、订单状态、审核结果）
- 离线消息推送
- 商家数据报表、代理业绩统计
- 商品推荐算法（简单版）
- 举报与信用评分

**暂不纳入 MVP（P2）**
- 小程序/App
- 在线支付集成
- 失物招领、跑腿、拼车等扩展模块

### 1.4 成功指标

| 指标 | 上线 1 个月目标 |
|------|----------------|
| 注册用户（学生） | ≥ 200 人 |
| 学生认证通过 | ≥ 100 人 |
| 入驻商家 | ≥ 5 家 |
| 发布商品 | ≥ 300 条 |
| 日活用户 | ≥ 50 人 |
| 成交订单 | ≥ 30 单 |

---

## 二、系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 Web (Vue3 SPA)                   │
│  用户端(学生/商家) | 代理后台 | 超管后台 | 登录注册      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/HTTPS (REST API)
                         │ WebSocket (ws://)
┌────────────────────────▼────────────────────────────────┐
│                  Node.js + Express 后端                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Auth/RBAC│ │ Product  │ │ Chat     │ │ Upload   │   │
│  │ Module   │ │ Module   │ │ Module   │ │ Module   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Admin    │ │ Agent    │ │ Merchant │                │
│  │ Module   │ │ Module   │ │ Module   │                │
│  └──────────┘ └──────────┘ └──────────┘                │
│  JWT 中间件 | RBAC 权限中间件 | 区域隔离 | 错误处理       │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
    ┌────────▼────────┐         ┌────────▼────────┐
    │   MongoDB       │         │  本地/OSS 存储   │
    │  (Mongoose ODM) │         │  (商品图/头像)   │
    └─────────────────┘         └─────────────────┘
```

### 2.2 项目目录结构

```
campus-secondhand/
├── frontend/                          # 前端 Vue3 项目
│   ├── src/
│   │   ├── api/                     # Axios 接口封装
│   │   ├── assets/
│   │   ├── components/              # 公共组件
│   │   ├── composables/             # 组合式函数（useAuth, useChat...）
│   │   ├── layouts/                 # 布局组件
│   │   ├── router/                  # 路由 + 守卫
│   │   ├── stores/                  # Pinia 状态管理
│   │   ├── utils/                   # 工具函数（token、格式化）
│   │   ├── views/                   # 页面视图
│   │   │   ├── auth/                # 登录、注册、认证
│   │   │   ├── home/                # 首页
│   │   │   ├── product/             # 商品列表、详情、发布
│   │   │   ├── chat/                # 聊天列表、聊天室
│   │   │   ├── user/                # 个人中心（学生）
│   │   │   ├── merchant/            # 商家中心
│   │   │   ├── agent/               # 区域代理后台
│   │   │   └── admin/               # 超级管理员后台
│   │   ├── App.vue
│   │   └── main.js
│   ├── .env.development
│   ├── .env.production
│   ├── vite.config.js
│   └── package.json
│
├── backend/                          # 后端 Node.js 项目
│   ├── src/
│   │   ├── config/                  # 数据库、JWT、上传配置
│   │   ├── controllers/             # 控制器
│   │   ├── middlewares/             # 认证、权限、错误处理
│   │   ├── models/                  # Mongoose 模型
│   │   ├── routes/                  # 路由
│   │   ├── services/                # 业务逻辑层
│   │   ├── utils/                   # 工具（响应封装、验证码）
│   │   ├── websocket/               # WebSocket 服务
│   │   │   ├── index.js             # WS 入口
│   │   │   ├── connection.js        # 连接管理
│   │   │   └── handlers/            # 消息处理器
│   │   └── app.js                   # Express 入口
│   ├── uploads/                     # 本地上传目录（开发环境）
│   ├── .env
│   └── package.json
│
├── docs/                            # 接口文档、数据库设计
├── DEVELOPMENT_PLAN.md              # 本文件
└── README.md
```

### 2.3 统一接口规范

**请求格式**
```json
// 成功
{ "code": 0, "message": "ok", "data": { ... } }

// 失败
{ "code": 40001, "message": "手机号已注册", "data": null }
```

**错误码规划**

| 码段 | 含义 |
|------|------|
| 0 | 成功 |
| 400xx | 客户端错误（参数、权限） |
| 401xx | 认证错误（token 过期、无效） |
| 404xx | 资源不存在 |
| 500xx | 服务端错误 |

**分页格式**
```json
{
  "code": 0,
  "data": {
    "list": [],
    "pagination": { "page": 1, "pageSize": 20, "total": 100 }
  }
}
```

---

## 三、数据库设计

### 3.1 集合（Collection）概览

| 集合 | 说明 |
|------|------|
| regions | 区域/学校划分 |
| users | 用户账号与个人信息（含 role） |
| verifications | 认证申请（学生认证 / 商家入驻） |
| merchant_profiles | 商家店铺信息 |
| products | 商品信息 |
| favorites | 收藏关系 |
| orders | 订单 |
| conversations | 会话（聊天列表） |
| messages | 聊天消息 |
| notifications | 系统通知 |
| audit_logs | 操作审计日志（管理员/代理） |

### 3.2 角色权限矩阵

| 功能 | 游客 | 学生 | 商家 | 区域代理 | 超级管理员 |
|------|:----:|:----:|:----:|:--------:|:----------:|
| 浏览本区域商品 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 注册/登录 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 收藏商品 | | ✓ | ✓ | ✓ | ✓ |
| 即时聊天 | | ✓ | ✓ | ✓ | ✓ |
| 提交学生认证 | | ✓ | — | — | — |
| 发布个人闲置 | | ✓（已认证） | — | — | — |
| 提交商家入驻 | | ✓ | — | — | — |
| 发布商家商品 | | | ✓（已入驻） | — | — |
| 店铺主页管理 | | | ✓ | — | — |
| 审核学生认证 | | | | ✓（本区域） | ✓（全部） |
| 审核商家入驻 | | | | ✓（本区域） | ✓（全部） |
| 下架/删除违规商品 | | | | ✓（本区域） | ✓（全部） |
| 封禁/解封用户 | | | | ✓（本区域） | ✓（全部） |
| 查看区域数据看板 | | | | ✓（本区域） | ✓（全部） |
| 管理区域代理 | | | | — | ✓ |
| 区域划分/系统配置 | | | | — | ✓ |
| 查看审计日志 | | | | ✓（本区域） | ✓（全部） |

> **区域隔离原则**：除超级管理员外，所有角色只能访问 `regionId` 对应区域的数据；代理后台接口统一加 `regionScope` 中间件校验。

### 3.3 核心 Schema 设计

#### regions
```javascript
{
  _id: ObjectId,
  name: String,              // 区域名称，如「XX大学主校区」
  code: String,              // 唯一编码，如 xmu_main
  province: String,
  city: String,
  address: String,
  agentId: ObjectId,         // ref: users（role=regional_agent，可为空待分配）
  status: String,            // active | inactive
  createdAt: Date,
  updatedAt: Date
}
// 索引：code(unique), agentId, status
```

#### users
```javascript
{
  _id: ObjectId,
  phone: String,             // 唯一，登录账号
  password: String,          // bcrypt 加密
  nickname: String,
  avatar: String,
  gender: String,            // male | female | unknown
  bio: String,
  role: String,              // student | merchant | regional_agent | super_admin
  regionId: ObjectId,        // ref: regions（super_admin 可为 null）
  status: String,            // active | banned | pending
  // —— 学生认证 ——
  studentVerified: Boolean,
  studentInfo: {
    studentId: String,
    realName: String,
    enrollYear: Number,
    college: String
  },
  // —— 商家（role=merchant 时关联 merchant_profiles）——
  merchantProfileId: ObjectId,
  refreshToken: String,
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
// 索引：phone(unique), role, regionId, studentVerified, status
```

#### verifications
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  regionId: ObjectId,
  type: String,              // student | merchant
  status: String,            // pending | approved | rejected
  payload: {                 // 申请资料（按 type 不同）
    // student: studentId, realName, enrollYear, college
    // merchant: shopName, businessLicense, contactPhone, address, licenseImage
  },
  rejectReason: String,
  reviewerId: ObjectId,      // 审核人（代理或超管）
  reviewedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
// 索引：{ regionId: 1, type: 1, status: 1, createdAt: -1 }
```

#### merchant_profiles
```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // ref: users（唯一）
  regionId: ObjectId,
  shopName: String,
  shopLogo: String,
  description: String,
  contactPhone: String,
  address: String,           // 店铺地址
  businessLicense: String,   // 营业执照号
  licenseImage: String,      // 执照图片
  status: String,            // pending | active | suspended
  stats: {
    productCount: Number,
    orderCount: Number,
    rating: Number
  },
  createdAt: Date,
  updatedAt: Date
}
// 索引：userId(unique), regionId, status
```

#### products
```javascript
{
  _id: ObjectId,
  sellerId: ObjectId,        // ref: users
  regionId: ObjectId,        // ref: regions（冗余，便于区域隔离查询）
  sellerType: String,        // student | merchant
  title: String,
  description: String,
  price: Number,
  originalPrice: Number,
  category: String,          // book | electronics | daily | clothing | other
  images: [String],
  condition: String,         // new | like_new | good | fair（商家商品可为 new）
  status: String,            // on_sale | sold | off_shelf | rejected
  auditStatus: String,       // pending | approved | rejected（商家商品需审核，可选）
  viewCount: Number,
  favoriteCount: Number,
  tags: [String],
  location: String,
  createdAt: Date,
  updatedAt: Date
}
// 复合索引：{ regionId: 1, status: 1, category: 1, createdAt: -1 }
// 文本索引：{ title: "text", description: "text" }
```

#### conversations
```javascript
{
  _id: ObjectId,
  participants: [ObjectId],  // 固定 2 人，按 userId 排序存储
  productId: ObjectId,       // 关联商品（可选，从商品页发起聊天时绑定）
  lastMessage: {
    content: String,
    type: String,              // text | image | system
    senderId: ObjectId,
    createdAt: Date
  },
  unreadCount: {               // 每个用户的未读数
    userId1: Number,
    userId2: Number
  },
  updatedAt: Date
}
// 索引：participants
```

#### messages
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  receiverId: ObjectId,
  type: String,              // text | image | system
  content: String,           // 文字内容或图片 URL
  read: Boolean,             // 是否已读
  readAt: Date,
  createdAt: Date
}
// 索引：{ conversationId: 1, createdAt: -1 }
```

#### orders
```javascript
{
  _id: ObjectId,
  regionId: ObjectId,
  productId: ObjectId,
  buyerId: ObjectId,
  sellerId: ObjectId,
  sellerType: String,        // student | merchant
  price: Number,
  status: String,            // pending | confirmed | completed | cancelled
  remark: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### audit_logs
```javascript
{
  _id: ObjectId,
  operatorId: ObjectId,      // 操作人（代理/超管）
  operatorRole: String,
  regionId: ObjectId,        // 操作所属区域
  action: String,            // approve_student | reject_merchant | ban_user | off_shelf_product ...
  targetType: String,        // user | product | verification | region
  targetId: ObjectId,
  detail: Object,            // 变更详情
  ip: String,
  createdAt: Date
}
// 索引：{ regionId: 1, createdAt: -1 }, { operatorId: 1, createdAt: -1 }
```

---

## 四、API 接口规划

### 4.1 认证模块 `/api/auth`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /register | 手机号 + 验证码 + 密码 + 选择区域注册（默认 student） | 公开 |
| POST | /login | 手机号 + 密码登录 | 公开 |
| POST | /send-code | 发送短信验证码 | 公开 |
| POST | /refresh-token | 刷新 accessToken | 需 refreshToken |
| POST | /logout | 退出登录 | 登录 |
| GET | /me | 获取当前用户信息（含 role、region） | 登录 |
| GET | /regions | 获取可选区域/学校列表 | 公开 |

### 4.2 用户模块 `/api/users`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| PUT | /profile | 更新个人信息 | 登录 |
| POST | /avatar | 上传头像 | 登录 |
| POST | /verify/student | 提交学生认证 | student |
| POST | /verify/merchant | 提交商家入驻申请 | student |
| GET | /verify/status | 查询认证/入驻状态 | 登录 |
| GET | /:id | 获取用户公开信息 | 公开 |

### 4.3 商家模块 `/api/merchant`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /shop | 获取我的店铺信息 | merchant |
| PUT | /shop | 更新店铺资料 | merchant |
| GET | /shop/:userId | 获取商家店铺主页（公开） | 公开 |
| GET | /products | 我的商家商品列表 | merchant |
| GET | /stats | 店铺数据统计 | merchant |

### 4.4 商品模块 `/api/products`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | / | 商品列表（自动按 regionId 过滤） | 公开 |
| GET | /:id | 商品详情 | 公开 |
| POST | / | 发布商品 | student（已认证）或 merchant |
| PUT | /:id | 编辑商品 | 登录 + 本人 |
| DELETE | /:id | 删除商品 | 登录 + 本人 |
| PATCH | /:id/status | 上下架/标记已售 | 登录 + 本人 |
| GET | /mine | 我的发布 | student / merchant |
| POST | /:id/favorite | 收藏/取消收藏 | 登录 |
| GET | /favorites | 我的收藏 | 登录 |

### 4.5 订单模块 `/api/orders`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | / | 创建订单（意向购买） | student（已认证） |
| GET | / | 我的订单（买/卖） | 登录 |
| PATCH | /:id/status | 更新订单状态 | 登录 + 买卖双方 |

### 4.6 聊天模块 `/api/chat`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /conversations | 会话列表 | 登录 |
| POST | /conversations | 创建/获取会话 | 登录 |
| GET | /conversations/:id/messages | 历史消息（分页） | 登录 + 参与者 |
| PATCH | /conversations/:id/read | 标记已读 | 登录 + 参与者 |

### 4.7 区域代理模块 `/api/agent`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /dashboard | 本区域数据概览 | regional_agent |
| GET | /verifications | 待审核列表（学生/商家） | regional_agent |
| PATCH | /verifications/:id | 审核通过/拒绝 | regional_agent |
| GET | /users | 本区域用户列表 | regional_agent |
| PATCH | /users/:id/status | 封禁/解封用户 | regional_agent |
| GET | /products | 本区域商品列表 | regional_agent |
| PATCH | /products/:id/status | 强制下架违规商品 | regional_agent |
| GET | /orders | 本区域订单列表 | regional_agent |
| GET | /audit-logs | 本区域操作日志 | regional_agent |

### 4.8 超级管理员模块 `/api/admin`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /dashboard | 全平台数据概览 | super_admin |
| GET | /regions | 区域列表 | super_admin |
| POST | /regions | 创建区域 | super_admin |
| PUT | /regions/:id | 编辑区域 | super_admin |
| PATCH | /regions/:id/agent | 分配/更换区域代理 | super_admin |
| GET | /agents | 代理账号列表 | super_admin |
| POST | /agents | 创建区域代理账号 | super_admin |
| PATCH | /agents/:id/status | 启用/停用代理 | super_admin |
| GET | /verifications | 全部审核记录（可筛选） | super_admin |
| PATCH | /verifications/:id | 超管终审 | super_admin |
| GET | /users | 全平台用户列表 | super_admin |
| PATCH | /users/:id/role | 修改用户角色 | super_admin |
| PATCH | /users/:id/status | 封禁/解封 | super_admin |
| GET | /products | 全平台商品 | super_admin |
| GET | /audit-logs | 全平台审计日志 | super_admin |
| PUT | /config | 系统配置（轮播图、公告等） | super_admin |

### 4.9 WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| auth | Client → Server | 连接时发送 JWT 鉴权 |
| message:send | C → S | 发送消息 |
| message:receive | S → C | 接收消息 |
| message:read | C ↔ S | 已读回执 |
| typing | C ↔ S | 正在输入（可选） |
| notification | S → C | 系统通知推送 |
| ping/pong | C ↔ S | 心跳保活 |

---

## 五、分阶段开发计划（8 周）

### 第一阶段：基础架构 + 四类身份 RBAC（第 1-2 周）

**目标**：前后端项目跑通，完成注册登录、四类身份权限体系、区域划分、学生认证与商家入驻申请。

#### 第 1 周：项目初始化 + RBAC 基础

| 天数 | 后端任务 | 前端任务 |
|------|----------|----------|
| D1-2 | 初始化 Express 项目，MongoDB 连接，统一响应/错误处理；Region Model；超管种子账号 | 初始化 Vite + Vue3，TailwindCSS、Element Plus、Pinia、Vue Router |
| D3 | User Model（含 role/regionId），注册/登录，JWT 签发（payload 含 role + regionId） | Layout 布局，Axios 拦截器，区域选择组件 |
| D4 | RBAC 中间件：`requireAuth`、`requireRole(...roles)`、`requireRegionScope` | 登录/注册页（注册时选区域），路由守卫（按 role 分流） |
| D5 | 短信验证码接口；GET /regions 区域列表 | 对接登录/注册 API，Token 存储，按 role 跳转不同首页 |
| D6-7 | 头像上传、个人信息更新；audit_logs 基础写入 | 个人中心；JWT 无感刷新；学生/商家/代理/超管四套 Layout 骨架 |

**交付物**
- [ ] 可运行的前后端项目
- [ ] 注册时选择区域，默认 student 身份
- [ ] JWT 含 role，路由按身份隔离
- [ ] 超管种子账号可登录

#### 第 2 周：认证审核 + 代理/超管后台基础

| 天数 | 后端任务 | 前端任务 |
|------|----------|----------|
| D1-2 | Verification Model；学生认证 + 商家入驻申请接口 | 学生认证页、商家入驻申请页 |
| D3 | 代理审核接口 `/api/agent/verifications`；通过后更新 user.role / merchantProfile | 代理后台：待审核列表、通过/拒绝操作 |
| D4 | 超管：区域 CRUD、创建代理账号、分配区域 | 超管后台：区域管理、代理账号管理 |
| D5 | 商家入驻通过后创建 merchant_profiles，role 变更 student→merchant | 商家中心骨架页；商家店铺主页（公开） |
| D6-7 | 联调、API 文档；权限边界测试（代理不能跨区、学生不能进后台） | 未认证/未入驻时的权限提示与引导 |

**交付物**
- [ ] 学生认证 → 区域代理审核 → 通过后可发个人闲置
- [ ] 商家入驻 → 区域代理审核 → 通过后进入商家中心
- [ ] 超管可创建区域、创建代理、分配区域
- [ ] 四类身份登录后进入对应工作台

**技术要点**
```
JWT Payload 示例：
{ userId, role: 'student', regionId: '...', iat, exp }

RBAC 中间件：
requireRole('regional_agent', 'super_admin')  // 任一匹配
requireRegionScope(req)  // 代理只能操作 req.user.regionId 的数据

登录后跳转：
student        → /
merchant       → /merchant
regional_agent → /agent
super_admin    → /admin
```

---

### 第二阶段：商品系统 + 搜索筛选（第 3-4 周）

**目标**：商品发布、浏览、搜索、筛选、收藏全链路打通。

#### 第 3 周：商品 CRUD

| 天数 | 后端任务 | 前端任务 |
|------|----------|----------|
| D1-2 | Product Model（含 regionId、sellerType），发布接口；学生/商家分别校验 | 发布页：个人闲置 / 商家商品两种模式；商家商品展示「认证商家」标 |
| D3 | 商品详情（卖家/店铺信息）；强制 regionId 过滤 | 商品详情：个人卖家卡片 vs 商家店铺入口 |
| D4 | 编辑/删除/上下架；代理/超管强制下架接口 | 我的发布；代理后台违规商品处理 |
| D5-7 | 收藏接口（Favorite Model），我的收藏列表 | 收藏功能对接，我的收藏页 |

**交付物**
- [ ] 学生（已认证）可发布个人闲置
- [ ] 商家（已入驻）可发布商家商品，展示店铺标识
- [ ] 商品按区域隔离，跨区不可见

#### 第 4 周：首页 + 搜索筛选

| 天数 | 后端任务 | 前端任务 |
|------|----------|----------|
| D1-2 | 商品列表：regionId 强制过滤 + 关键词/分类/价格/ sellerType 筛选 | 首页：本区域商品、商家专区入口、最新发布 |
| D3 | 分页优化，列表只返回必要字段（projection） | 商品列表页：筛选栏 + 排序 + 分页/无限滚动 |
| D4 | 热门商品（按收藏数/浏览量排序） | 搜索页：关键词搜索 + 历史记录 |
| D5-7 | 性能测试：1000 条数据下搜索 < 200ms | 首页/列表/详情联调，空状态、加载态、错误态 |

**交付物**
- [ ] 首页可浏览商品
- [ ] 搜索 + 多维度筛选 + 排序
- [ ] 商品状态流转：在售 → 已售 / 已下架

**MongoDB 索引策略**
```javascript
// 搜索
db.products.createIndex({ title: "text", description: "text" })
// 列表筛选排序
db.products.createIndex({ status: 1, category: 1, createdAt: -1 })
db.products.createIndex({ status: 1, price: 1 })
// 我的发布
db.products.createIndex({ sellerId: 1, createdAt: -1 })
```

---

### 第三阶段：WebSocket 即时通讯（第 5-6 周）

**目标**：一对一实时聊天，消息持久化，已读/未读，聊天列表。

#### 第 5 周：WebSocket 基础 + 文字聊天

| 天数 | 后端任务 | 前端任务 |
|------|----------|----------|
| D1-2 | ws 服务集成到 Express（同端口或独立端口），连接时 JWT 鉴权 | useWebSocket composable：连接、断线重连、心跳 |
| D3 | ConnectionManager：userId → socket 映射，支持多端 | 聊天列表页：会话列表、未读角标、最后消息预览 |
| D4 | Conversation + Message Model，创建/获取会话接口 | 聊天室页面：消息气泡、时间分割、滚动到底部 |
| D5-7 | 消息发送/接收/持久化，历史消息分页加载 | 文字消息收发联调，发送失败重试 |

**交付物**
- [ ] WebSocket 连接稳定，支持断线重连
- [ ] 可发送/接收文字消息
- [ ] 聊天历史可翻页加载

#### 第 6 周：图片消息 + 已读 + 通知

| 天数 | 后端任务 | 前端任务 |
|------|----------|----------|
| D1-2 | 图片消息（先 HTTP 上传拿 URL，再通过 WS 发送） | 聊天中发送图片，图片预览 |
| D3 | 已读状态：message:read 事件，未读数更新 | 进入聊天室自动标记已读，未读数实时更新 |
| D4 | 离线消息：用户上线时推送未读消息 | 离线期间消息上线后自动展示 |
| D5 | 系统通知 Model + 推送（商品被收藏、新订单） | 通知铃铛 + 通知列表页 |
| D6-7 | 「联系卖家」按钮 → 自动创建会话并跳转聊天 | 商品详情页「联系卖家」完整流程 |

**交付物**
- [ ] 文字 + 图片即时聊天
- [ ] 已读/未读状态同步
- [ ] 从商品页一键联系卖家
- [ ] 基础系统通知

**WebSocket 核心设计**
```javascript
// 连接管理（避免广播风暴）
class ConnectionManager {
  connections = new Map() // userId -> Set<WebSocket>

  sendToUser(userId, event, data) {
    const sockets = this.connections.get(userId)
    if (!sockets) return // 用户离线，消息已持久化，上线后拉取
    sockets.forEach(ws => ws.send(JSON.stringify({ event, data })))
  }
}

// 断线重连策略（前端）
// 1. 指数退避：1s → 2s → 4s → 8s → 最大 30s
// 2. 重连成功后重新 auth + 拉取离线消息
// 3. 心跳：每 30s 发送 ping
```

---

### 第四阶段：订单 + 打磨 + 上线（第 7-8 周）

**目标**：订单流程、UI 打磨、部署上线、推广准备。

#### 第 7 周：订单系统 + UI 优化

| 天数 | 任务 |
|------|------|
| D1-2 | 后端：创建订单、买卖方订单列表、状态流转（pending → confirmed → completed） |
| D3 | 前端：「我想要」按钮 → 创建订单 + 跳转聊天；我的订单页（买入/卖出 Tab） |
| D4 | UI 打磨：Loading 骨架屏、空状态插画、Toast 统一、移动端适配 |
| D5 | 性能优化：图片懒加载、路由懒加载、列表虚拟滚动（可选） |
| D6-7 | 全流程测试：四角色账号 → 认证/入驻 → 发布 → 浏览 → 聊天 → 下单 | 代理/超管审核流程端到端测试 |

#### 第 8 周：部署 + 推广

| 天数 | 任务 |
|------|------|
| D1-2 | 后端部署（云服务器 + PM2 + Nginx 反代），MongoDB Atlas 或自建 |
| D3 | 前端构建部署（Nginx 静态托管或 Vercel），配置 HTTPS |
| D4 | 域名配置、环境变量、CORS、WS 代理配置 |
| D5 | 准备推广素材：产品介绍图、使用说明、FAQ |
| D6 | 班级群/年级群/表白墙推广，收集首批用户反馈 |
| D7 | Bug 修复、监控日志（morgan + 简单错误告警） |

**交付物**
- [ ] 生产环境可访问
- [ ] 完整交易闭环：发布 → 沟通 → 下单 → 面交完成
- [ ] 推广启动

---

## 六、前端页面清单

### 6.1 公共 / 学生端

| 页面 | 路由 | 权限 | 优先级 |
|------|------|------|--------|
| 首页 | `/` | 公开（按区域展示） | P0 |
| 登录 | `/login` | 公开 | P0 |
| 注册 | `/register` | 公开（选区域） | P0 |
| 商品列表/搜索 | `/products` | 公开 | P0 |
| 商品详情 | `/products/:id` | 公开 | P0 |
| 发布个人闲置 | `/products/new` | student（已认证） | P0 |
| 编辑商品 | `/products/:id/edit` | 登录 + 本人 | P0 |
| 商家店铺主页 | `/shop/:userId` | 公开 | P0 |
| 聊天列表 | `/chat` | 登录 | P0 |
| 聊天室 | `/chat/:conversationId` | 登录 | P0 |
| 个人中心 | `/user` | student | P0 |
| 我的发布 | `/user/products` | student | P0 |
| 我的收藏 | `/user/favorites` | 登录 | P0 |
| 我的订单 | `/user/orders` | 登录 | P0 |
| 学生认证 | `/user/verify/student` | student | P0 |
| 商家入驻申请 | `/user/verify/merchant` | student | P0 |
| 用户主页 | `/user/:id` | 公开 | P1 |
| 通知中心 | `/notifications` | 登录 | P1 |

### 6.2 商家中心 `/merchant`

| 页面 | 路由 | 权限 | 优先级 |
|------|------|------|--------|
| 商家工作台 | `/merchant` | merchant | P0 |
| 发布商家商品 | `/merchant/products/new` | merchant | P0 |
| 商品管理 | `/merchant/products` | merchant | P0 |
| 订单管理 | `/merchant/orders` | merchant | P0 |
| 店铺设置 | `/merchant/shop` | merchant | P0 |
| 数据统计 | `/merchant/stats` | merchant | P1 |

### 6.3 区域代理后台 `/agent`

| 页面 | 路由 | 权限 | 优先级 |
|------|------|------|--------|
| 区域概览 | `/agent` | regional_agent | P0 |
| 学生认证审核 | `/agent/verifications/student` | regional_agent | P0 |
| 商家入驻审核 | `/agent/verifications/merchant` | regional_agent | P0 |
| 用户管理 | `/agent/users` | regional_agent | P0 |
| 商品管理 | `/agent/products` | regional_agent | P0 |
| 订单查看 | `/agent/orders` | regional_agent | P1 |
| 操作日志 | `/agent/audit-logs` | regional_agent | P1 |

### 6.4 超级管理员后台 `/admin`

| 页面 | 路由 | 权限 | 优先级 |
|------|------|------|--------|
| 全平台概览 | `/admin` | super_admin | P0 |
| 区域管理 | `/admin/regions` | super_admin | P0 |
| 代理管理 | `/admin/agents` | super_admin | P0 |
| 用户管理 | `/admin/users` | super_admin | P0 |
| 商家管理 | `/admin/merchants` | super_admin | P0 |
| 商品管理 | `/admin/products` | super_admin | P0 |
| 审核中心 | `/admin/verifications` | super_admin | P0 |
| 系统配置 | `/admin/config` | super_admin | P1 |
| 审计日志 | `/admin/audit-logs` | super_admin | P1 |

### 6.5 前端路由守卫策略

```javascript
// router/index.js 伪代码
const roleHomeMap = {
  student: '/',
  merchant: '/merchant',
  regional_agent: '/agent',
  super_admin: '/admin'
}

router.beforeEach((to, from, next) => {
  const { role } = useAuthStore()
  // 1. 未登录 → 需要 auth 的路由跳转 /login
  // 2. 已登录访问 /admin → 仅 super_admin
  // 3. 已登录访问 /agent → 仅 regional_agent
  // 4. 已登录访问 /merchant → 仅 merchant
  // 5. merchant 访问 /products/new → 重定向 /merchant/products/new
})
```

---

## 七、关键技术方案

### 7.1 JWT 双 Token 机制

```
accessToken  → 有效期 2 小时，放 Authorization Header
refreshToken → 有效期 7 天，放 HttpOnly Cookie 或 localStorage

过期处理：
- accessToken 过期 → 拦截器自动 refresh → 重发请求
- refreshToken 过期 → 跳转登录页
```

### 7.2 图片上传方案

```
开发环境：multer → backend/uploads/ → 静态资源服务
生产环境：multer → 阿里云 OSS / 腾讯云 COS

前端压缩：canvas 压缩至 maxWidth=800, quality=0.8
限制：单张 ≤ 5MB，商品最多 9 张
```

### 7.3 搜索方案

```
MVP：MongoDB text index 全文搜索
优化（数据量 > 5000）：引入 MongoDB Atlas Search 或 Meilisearch

筛选参数：
?keyword=教材&category=book&minPrice=0&maxPrice=100
&sort=createdAt&order=desc&page=1&pageSize=20
```

### 7.4 WebSocket 与 HTTP 共存

```javascript
// 方案：同一端口，HTTP 走 Express，WS 走 upgrade
const server = http.createServer(app)
const wss = new WebSocketServer({ server })
server.listen(3000)

// Nginx 反代
// location /ws { proxy_pass http://backend; proxy_http_version 1.1;
//   proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
```

### 7.5 四类身份认证方案

```
【学生认证】
1. student 提交学号 + 姓名 + 入学年份 + 学院
2. 进入本区域 regional_agent 待审队列
3. 代理 approve → studentVerified=true → 可发布个人闲置
4. 超管可查看/复审全部申请

【商家入驻】
1. student 提交店铺名 + 营业执照 + 联系方式 + 地址
2. 进入本区域 regional_agent 待审队列
3. 代理 approve → 创建 merchant_profiles，user.role 改为 merchant
4. 拒绝后仍为 student，可修改重新申请

【区域代理创建】
1. 仅 super_admin 在 /admin/agents 创建账号
2. 指定 phone + 初始密码 + 绑定 regionId
3. 一个区域同一时间仅绑定一个 active 代理

【超级管理员】
1. 首次部署：环境变量 SUPER_ADMIN_PHONE + SUPER_ADMIN_PASSWORD 种子账号
2. 后续：超管可在后台新增其他 super_admin（慎用）
```

### 7.6 RBAC 权限中间件设计

```javascript
// middlewares/rbac.js

// 角色校验
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ code: 40301, message: '无权访问' })
    }
    next()
  }
}

// 区域隔离：代理只能操作本区域
function requireRegionScope(options = {}) {
  return async (req, res, next) => {
  const { role, regionId } = req.user
  if (role === 'super_admin') return next()  // 超管跳过

  const targetRegionId = req.params.regionId
    || req.body.regionId
    || req.query.regionId
    || (await lookupTargetRegion(req))  // 从 targetId 反查

  if (targetRegionId && targetRegionId !== regionId.toString()) {
    return res.status(403).json({ code: 40302, message: '无权操作其他区域' })
  }
  next()
  }
}

// 资源归属校验
function requireOwner(model, paramKey = 'id') { ... }
```

---

## 八、测试计划

| 类型 | 覆盖范围 | 工具 |
|------|----------|------|
| 接口测试 | 所有 REST API | Postman / Apifox |
| 手动测试 | 核心用户流程 | 测试用例表 |
| WebSocket 测试 | 连接、消息、重连 | wscat / 浏览器 DevTools |
| 兼容性 | Chrome、Safari、移动端 | 真机 + 模拟器 |

**核心测试用例**
1. 未登录浏览商品 → 点击发布 → 跳转登录
2. 学生未认证 → 点击发布 → 引导学生认证
3. 学生提交商家入驻 → 代理审核通过 → 登录跳转商家中心
4. 代理 A 不能审核/查看代理 B 负责区域的数据
5. 超管可查看全平台数据，可创建区域和代理
6. 发布商品 → 搜索找到 → 收藏 → 联系卖家 → 聊天 → 下单
7. Token 过期 → 无感刷新 → 操作不中断
8. 代理强制下架商品 → 学生端不可见 + 审计日志记录

---

## 九、部署方案

### 9.1 推荐配置（学生项目低成本）

| 组件 | 方案 | 预估成本 |
|------|------|----------|
| 服务器 | 阿里云/腾讯云 2核4G | ~50-100 元/月 |
| 数据库 | MongoDB Atlas 免费版（512MB） | 免费 |
| 域名 | .cn 域名 | ~30 元/年 |
| 对象存储 | 阿里云 OSS 按量 | ~几元/月 |
| HTTPS | Let's Encrypt | 免费 |

### 9.2 部署架构

```
用户 → 域名(HTTPS) → Nginx
                      ├── /        → 前端静态文件 (dist/)
                      ├── /api     → proxy → Node.js:3000
                      ├── /ws      → proxy → Node.js:3000 (WebSocket)
                      └── /uploads → 静态文件或 OSS
```

### 9.3 环境变量清单

```bash
# backend/.env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
UPLOAD_DIR=./uploads
# OSS（生产环境）
OSS_ACCESS_KEY=
OSS_SECRET_KEY=
OSS_BUCKET=
```

---

## 十、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 短信验证码成本 | 注册门槛 | MVP 用邮箱验证或固定测试码 |
| 无真实用户 | 项目价值降低 | 上线前在 2-3 个群预热，找 10 人内测 |
| 聊天消息丢失 | 用户体验差 | 消息先持久化再推送，ACK 确认机制 |
| 虚假商品/诈骗 | 平台信誉 | 学生认证 + 商家执照审核 + 代理/超管 moderation + 举报 |
| 图片存储爆满 | 服务不可用 | 限制上传数量/大小，定期清理，上 OSS |
| WebSocket 连接数过多 | 服务器压力 | 连接池管理，单用户限 3 连接 |

---

## 十一、后续扩展路线图

```
Phase 1 (MVP, 2个月)     → 四角色 RBAC + 区域隔离 + 核心交易 + 聊天
Phase 2 (+1个月)         → 举报信用、商家报表、代理业绩、消息通知完善
Phase 3 (+1个月)         → 微信小程序
Phase 4 (+2个月)         → 多校联盟、失物招领、校园跑腿
Phase 5 (持续)           → 推荐算法、在线支付、数据分析
```

---

## 十二、每周 Checklist 模板

```markdown
## 第 X 周 Checklist

### 后端
- [ ] 任务 1
- [ ] 任务 2

### 前端
- [ ] 任务 1
- [ ] 任务 2

### 联调测试
- [ ] 核心流程走通
- [ ] 无阻塞 Bug

### 下周计划
- ...
```

---

## 十三、立即开始的行动项

1. **今天**：初始化 `frontend/` 和 `backend/`，Region Model + 超管种子账号
2. **明天**：User Model（含 role）+ 注册登录 + RBAC 中间件
3. **本周内**：四套 Layout + 路由守卫 + 个人中心
4. **第 2 周末**：学生认证 + 商家入驻 + 代理/超管审核后台
5. **第 4 周末**：商品系统（区分学生/商家）+ 区域隔离
6. **第 6 周末**：聊天系统完整可用
7. **第 8 周末**：部署上线 + 推广

---

*文档版本：v1.1 | 更新日期：2026-05-25 | 变更：新增四类身份 RBAC 体系*
