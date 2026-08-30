# UniApp 依赖升级评估

## 当前版本（2026-06）

| 依赖 | uniapp | backend / frontend |
|------|:------:|:---------------:|
| vite | **5.2.8** | 8.x |
| vue | **3.4.21** | 3.5.x |
| sass | **1.77** | 1.80+ |
| vitest | 3.2.6 | 3.2.6 |

UniApp 核心包统一锁定在 `@dcloudio/*@3.0.0-5000720260410001`，由 DCloud 发布节奏决定，**不能单独把 Vite 升到 8**。

## 结论

**短期不建议强行对齐 backend/frontend 的 Vite 8。** 原因：

1. `@dcloudio/vite-plugin-uni` 与 Vite 大版本强绑定，跨 major 升级需等官方适配。
2. 当前 `npm run build:mp-weixin` 与 `npm run dev:mp-weixin` 已稳定，升级收益主要是构建速度，风险是小程序编译失败。
3. 项目三端（backend/frontend/uniapp）各自独立 `package.json`，Vite 版本不一致**不影响运行时**，仅影响本地开发体验。

## 推荐策略

### 现阶段（保持）

- 继续使用 UniApp 官方推荐的 Vite 5 + Vue 3.4 组合。
- 小版本可在 `@dcloudio` 同批次号内跟随升级（改 `package.json` 中 `3.0.0-5000720260410001` 后缀）。
- 升级前务必跑：`cd uniapp && npm run build:mp-weixin && npm run check:mp`

### 中期（观察官方）

- 关注 [uni-app 更新日志](https://uniapp.dcloud.net.cn/release.html) 是否宣布支持 Vite 6/8。
- 官方支持后再一次性升级 `@dcloudio/*` 全家桶，而非只改 `vite` 字段。

### 可安全小步升级

| 包 | 操作 |
|----|------|
| `vitest` | 已与 monorepo 对齐，保持同步即可 |
| `sass` | 可尝试 `^1.80`，升级后跑 `build:mp-weixin` 验证 |
| `vue` | 仅在 `@dcloudio` 对应版本要求时升级，勿单独升到 3.5 |

## 验证清单（每次动 uniapp 依赖后）

```bash
cd uniapp
npm install
npm run build:mp-weixin
npm run check:mp
npm test
```

微信开发者工具导入 `unpackage/dist/dev/mp-weixin` 或 build 产物，抽查：首页、商品列表、聊天、跑腿。
