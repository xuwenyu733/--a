# 校园二手 · uni-app 小程序（HBuilderX 工程）

**标准 HBuilderX 工程结构**，可在 HBuilderX 中 **运行 → 运行到小程序模拟器 → 微信开发者工具** 一键编译预览。

与 Web 端共用后端 `../backend/`（Express + MongoDB）。

---

## 在 HBuilderX 中运行（推荐）

### 1. 安装环境

| 工具 | 说明 |
|------|------|
| [HBuilderX](https://www.dcloud.io/hbuilderx.html) | 正式版，建议 4.x |
| 微信开发者工具 | [下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) |
| HBuilderX 插件 | 工具 → 插件安装 → **uni-app（vue3）编译** |

### 2. HBuilderX 配置微信开发者工具路径

**HBuilderX → 设置 → 运行配置 → 小程序运行配置**  
填写微信开发者工具 `cli.bat` / `cli` 所在目录（macOS 一般在 `/Applications/wechatwebdevtools.app`）。

### 3. 打开项目

**文件 → 打开目录**，选择：

```
/Users/mac/Desktop/校园二手/uniapp
```

（选 `uniapp` 文件夹本身，不要选上级 `校园二手`。）

### 4. 启动后端（必须）

小程序只负责前端，接口在 Express：

```bash
cd /Users/mac/Desktop/校园二手
npm run dev
```

API：`http://127.0.0.1:3001/api`

### 5. 运行小程序

HBuilderX 菜单：

**运行 → 运行到小程序模拟器 → 微信开发者工具**

首次运行会自动编译到 `unpackage/dist/dev/mp-weixin/` 并打开微信开发者工具。

### 6. 开发者工具设置

微信开发者工具 → **详情 → 本地设置** → 勾选 **不校验合法域名**。

API 地址在 `config/index.js`（真机调试改为局域网 IP）。

---

## 工程目录（HBuilderX 标准）

```
uniapp/
├── pages/           # 页面
├── components/      # 组件
├── api/ utils/      # 接口与工具
├── static/          # 静态资源
├── App.vue
├── main.js
├── manifest.json    # 应用配置
├── pages.json       # 页面路由
├── uni.scss
└── unpackage/       # HBuilderX 编译输出（自动生成）
```

---

## CLI 开发（Cursor / VS Code 改代码时用）

小程序**不会**像 Web 那样保存即热更新，必须走「编译 → 同步 → 微信工具刷新」。

### 推荐流程

**终端 1** — 后端（若未启动）：

```bash
cd /Users/mac/Desktop/校园二手 && npm run dev
```

**终端 2** — 小程序监听 + 自动同步：

```bash
cd uniapp && npm run dev:mp-weixin
```

**微信开发者工具** — 项目目录固定为：

```
uniapp/unpackage/dist/dev/mp-weixin
```

保存 `.vue` / `.js` 后，终端会出现 `[mp-dev] 同步完成`，微信工具会自动重新编译。

> 若你之前打开的是 `dist/dev/mp-weixin` 或源码目录，改代码后页面会一直空白/不更新，请改成上面的 `unpackage` 路径。

### 一次性打包（发版前）

```bash
cd uniapp && npm run build:mp-weixin
cd uniapp && npm run check:mp   # 自检 API + 产物
```

**HBuilderX 用户**：请在 HBuilderX 里点「运行到微信开发者工具」，不要只用 Cursor 改代码却不重新运行。

---

## 测试账号

- 手机号：`13800000003` / `student123`（已认证学生）
- 或登录页 **微信一键登录**（未配 AppSecret 时为沙箱模式）
- 注册验证码：`123456`

---

## 常见问题

**Q：HBuilderX 报 uni_helpers / 已停止运行？**  
A：安装 uni-app（vue3）编译插件并重启 HBuilderX；确保打开的是 `uniapp` 根目录（含 `manifest.json`、`pages.json`），不是 `src/` 或 `dist/`。

**Q：网络请求失败？**  
A：先确认后端 `npm run dev` 已启动；开发者工具勾选不校验合法域名。

**Q：模拟器启动失败 / `simulator not found` / `getPreCompileOptions`？**  
A：多为灰度基础库 `3.15.x` 与开发者工具不兼容，与业务代码无关。请在 **详情 → 本地设置 → 调试基础库** 切换为 **3.8.12**（稳定版），再清缓存并重新编译。`manifest.json` 已建议 `libVersion: 3.8.12`。

**Q：首页空白 / `[loader] unexpected current frame status timeout`？**  
A：通常是微信开发者工具缓存或编译产物被改坏，按下面**完整重置**（顺序不能乱）：

```bash
# 1. 先完全退出微信开发者工具（Cmd+Q）
# 2. 终端执行：
cd uniapp && npm run clean:mp && npm run build:mp-weixin && npm run check:mp
# 3. 重新打开微信开发者工具，导入：
#    uniapp/unpackage/dist/dev/mp-weixin
# 4. 详情 → 本地设置：
#    - 不校验合法域名
#    - 调试基础库 3.8.12（勿用 3.15.x 灰度版）
#    - 模拟器与编辑器不要「分离窗口」（分离易触发 loader timeout）
# 5. 清缓存 → 全部清除 → 编译
```

**Q：改代码后页面不更新？**  
A：终端保持 `npm run dev:mp-weixin` 运行；或直接打开 `dist/dev/mp-weixin`（无需 sync）。  
不要在 sync 过程中频繁点微信里的「编译」，容易把 `app.js` 改坏。

**Q：真机预览连不上 API？**  
A：修改 `config/index.js` 中 `API_BASE` 为电脑局域网 IP，如 `http://192.168.x.x:3001/api`。
