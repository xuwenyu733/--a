# 测试指南

## 一键运行

在项目根目录：

```bash
npm test                          # backend + frontend + uniapp 全量
npm run test:backend:unit          # 仅 backend 单元测试（无 MongoDB）
npm run test:backend:integration   # 仅 backend 集成测试（vitest.integration.config.js）
```

后端单独跑类型检查：

```bash
cd backend && npm run typecheck
cd backend && npm run typecheck:helpers   # helpers 纯函数开启 checkJs
```

冒烟接口（需先启动 `npm run dev` 或生产服务，并已 seed）：

```bash
npm run smoke
# 或指定 v1 前缀
SMOKE_BASE_URL=http://127.0.0.1:3001/api/v1 node scripts/smoke-api.mjs
```

## 测试分布

| 包 | 框架 | 目录 | 说明 |
|----|------|------|------|
| `backend/` | Vitest + Supertest | `backend/tests/` | 单元测试 + MongoDB 集成测试 |
| `frontend/` | Vitest | `frontend/tests/` | `userSession`、`fileUrl` 等纯函数 |
| `uniapp/` | Vitest | `uniapp/tests/` | `format`、`fileUrl`、`verify` 等纯函数 |

## 集成测试文件

| 文件 | 覆盖 |
|------|------|
| `auth.api.integration.test.js` | 注册、登录、refresh-token、logout、me |
| `products.api.integration.test.js` | 发布、列表、收藏 |
| `orders.api.integration.test.js` | 下单、列表、线下 mark-paid |
| `delivery.api.integration.test.js` | 配送区、发单、接单、完成 |
| `addresses.api.integration.test.js` | 收货地址 CRUD、设默认 |
| `payments.api.integration.test.js` | 沙箱支付、模拟付款 |
| `reviews.api.integration.test.js` | 订单评价、重复拒绝 |
| `chat.api.integration.test.js` | 联系卖家、发消息、已读 |

## Server 单元测试（纯函数）

| 文件 | 说明 |
|------|------|
| `orderHelpers.test.js` | 订单状态流转、下单校验 |
| `paymentHelpers.test.js` | 在线支付权限 |
| `deliveryHelpers.test.js` | 跑腿状态机 |
| `chatHelpers.test.js` | 会话与消息校验 |
| `reviewHelpers.test.js` | 评价与信用分 |
| `pagination.test.js` | 分页上限 |
| `authCookie.test.js` | refresh Cookie Path=/api |
| `productService.test.js` | 发布权限、字段清洗 |
| `favoriteService.test.js` | 收藏列表降价标记 |
| `recommendationService.test.js` | 推荐算法 |
| `authService.test.js` | 密码校验、用户脱敏 |
| `cache.test.js` | 内存缓存 TTL |
| `productQuery.test.js` | 商品软删除 filter |
| `orderQuery.test.js` | 订单软删除 filter |
| `response.test.js` | `success` / `fail` / `ErrorCodes` |
| `publicBaseUrl.test.js` | 公共 URL 配置 |
| `productSearch.test.js` | 商品关键词搜索 filter |
| `jwt.test.js` | `buildTokenPayload` |
| `deliveryWs.test.js` | 跑腿 WS 推送 |
| `imageThumb.test.js` | WebP 缩略图生成 |

## 集成测试（service 层）

| 文件 | 说明 |
|------|------|
| `authService.integration.test.js` | 注册、登录、refresh、logout |

## 前端单测

| 包 | 文件 | 说明 |
|----|------|------|
| `frontend/` | `tests/userSession.test.js` | session 用户字段白名单 |
| `frontend/` | `tests/fileUrl.test.js` | 静态资源 URL |
| `uniapp/` | `tests/format.test.js` | 价格、时间、消息预览 |
| `uniapp/` | `tests/fileUrl.test.js` | 小程序静态资源 URL |
| `uniapp/` | `tests/verify.test.js` | 认证状态刷新与 `verifyError` |
| `uniapp/` | `tests/profileForm.test.js` | 设置页表单映射 |

## CI

GitHub Actions（`.github/workflows/ci.yml`）在 push/PR 时执行：

- `backend-unit`：`typecheck` + 单元测试
- `backend-integration`：MongoDB 集成测试（含 binary 缓存）
- `frontend-test` / `uniapp-test`
- `secret-scan`：`npm run check:secrets`

共享种子数据：

- `tests/helpers/seedTrade.js` — 买卖家 + 商品
- `tests/helpers/seedDelivery.js` — 跑腿场景
- `tests/helpers/mongoMemory.js` — 内存 MongoDB

## 编写约定

- 业务校验优先抽成 **纯函数**（如 `orderHelpers`、`paymentHelpers`），便于单测。
- 集成测试命名：`*.integration.test.js`，放在 `backend/tests/`。
- 涉及通知的 API 测试可 mock `notificationService`。

## 相关文档

- [DEPLOY.md](../DEPLOY.md) — 生产部署与健康检查
- [docs/SECURITY.md](./SECURITY.md) — 密钥扫描与轮换
