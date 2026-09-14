# 数据库索引说明

MongoDB 索引定义在各自 Model 的 Schema 中。改 Schema 后重启服务，Mongoose 会在连接时尝试创建/同步索引，**无需单独 migration 脚本**。

## 商品 Product

| 索引 | 用途 |
|------|------|
| `{ regionId, status, category, createdAt }` | 市集列表、分类筛选 |
| `{ regionId, status, price }` | 价格排序 |
| `{ sellerId, createdAt }` | 卖家商品管理 |
| `{ title: text, description: text }` | 全文搜索 |
| `{ searchText }` | 拼音/关键词检索 |

## 订单 Order

| 索引 | 用途 |
|------|------|
| `{ buyerId, createdAt }` | 买家订单列表 |
| `{ sellerId, createdAt }` | 卖家订单列表 |
| `{ regionId, status, createdAt }` | 区域代理后台 |
| `{ productId, status }` | 防重复下单 |
| `{ deletedAt }` | 软删除过滤 |

## 用户 / 会话 / 消息

| 集合 | 索引 | 用途 |
|------|------|------|
| User | `{ phone }` unique | 登录 |
| User | `{ wechatOpenId }` | 微信登录 |
| Conversation | `{ participants }` | 会话列表 |
| Message | `{ conversationId, createdAt }` | 聊天记录分页 |
| Favorite | `{ userId, productId }` unique | 收藏 |

## 跑腿

| 集合 | 索引 | 用途 |
|------|------|------|
| DeliveryZone | `{ regionId, code }` unique | 校区配送区 |
| DeliveryOrder | `{ regionId, status, createdAt }` | 跑腿大厅 |
| CourierProfile | `{ userId }` unique | 骑手资料 |

## 运维建议

- 生产环境启用 MongoDB 认证与 IP 白名单
- 定期 `mongodump` 备份（见 `scripts/backup-data.sh`）
- 大版本升级前在 staging 核对 `explain()` 是否命中预期索引

## 相关

- [DEPLOY.md](../DEPLOY.md)
- [docs/SECURITY.md](./SECURITY.md)
