# 安全说明

## 密钥与 `.env`

- **切勿**将 `backend/.env`、真实 API Key、数据库密码提交到 Git。
- 确认根目录 `.gitignore` 包含 `.env` 及 `backend/.env`。
- 若密钥曾进入 Git 历史，必须在对应平台**立即轮换**，不能仅删除文件。

## 本地扫描

```bash
npm run check:secrets
```

脚本 `scripts/check-secrets.mjs` 会扫描已跟踪文件中的常见密钥模式（OpenAI/DeepSeek `sk-`、AWS AKIA 等）。CI 的 `secret-scan` job 会同样执行此命令。

## 生产环境必配项

| 项 | 说明 |
|----|------|
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | 勿使用默认值 |
| `MONGODB_URI` | 启用认证，限制 IP |
| `OPENAI_API_KEY` | 仅通过环境变量注入 |
| 短信服务 | 生产勿依赖固定验证码 `123456` |

详见 [DEPLOY.md](../DEPLOY.md) 环境变量章节。

## 上传与静态资源

- `/uploads/private/*` 不可直接访问，需走鉴权接口。
- 生产建议 OSS + CDN，并配置 `OSS_BASE_URL` / `VITE_OSS_BASE_URL`。

## 相关

- [docs/TESTING.md](./TESTING.md) — 测试与 CI
- [DEPLOY.md](../DEPLOY.md) — 部署清单
