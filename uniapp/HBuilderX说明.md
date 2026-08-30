# HBuilderX 运行说明

本项目已调整为 **HBuilderX 标准 uni-app（Vue3）工程**（`manifest.json`、`pages.json` 位于项目根目录）。

## 一键运行步骤

1. **HBuilderX** → 文件 → 打开目录 → 选择 **`uniapp`**
2. 终端启动后端：`cd 校园二手 && npm run dev`
3. **HBuilderX** → 运行 → 运行到小程序模拟器 → **微信开发者工具**
4. 微信开发者工具 → 详情 → **不校验合法域名**

## 若仍报错

1. HBuilderX → **工具 → 插件安装** → 安装 **uni-app（vue3）编译**
2. **帮助 → 检查更新**，升级到最新正式版
3. 确认打开的是 **`uniapp`** 根目录（能看到 `App.vue`、`pages.json` 同级）
4. **不要**用「运行到浏览器」测小程序，务必选 **微信开发者工具**

## 编译产物位置

HBuilderX 运行后输出在：

```
uniapp/unpackage/dist/dev/mp-weixin/
```

也可在微信开发者工具中手动导入该目录。

## 与 CLI 的关系

`npm run dev:mp-weixin` 仍可用（输出在 `dist/dev/mp-weixin`），与 HBuilderX 的 `unpackage/` 互不冲突。日常建议只用 HBuilderX 运行即可。
