# 阿里云 OSS 配置指南（可选）

未配置 OSS 时，图片保存在服务器 `backend/uploads/`，由 Express 或 Nginx 提供访问。

生产环境用户量上升后，建议将图片迁至 **阿里云 OSS**，减轻磁盘压力并便于 CDN 加速。

---

## 1. 创建 Bucket

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 创建 Bucket（例如 `campus-secondhand`）
3. 读写权限：**私有** 或 **公共读**（公共读可直接通过 URL 访问；私有需签名 URL，本项目默认按 **公共读 + CDN 域名** 使用）
4. 记录 **地域**（如 `oss-cn-hangzhou`）

---

## 2. 获取 AccessKey

在 RAM 控制台创建子账号，授予 OSS 读写权限，获取：

- AccessKey ID  
- AccessKey Secret  

勿将密钥提交到 Git。

---

## 3. 配置 `backend/.env`

```env
# 启用 OSS 上传（四项缺一不可才会走 OSS）
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=campus-secondhand
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret

# 浏览器访问前缀：Bucket 外网域名或绑定的 CDN 域名，末尾不要 /
# 例：https://campus-secondhand.oss-cn-hangzhou.aliyuncs.com
# 或：https://cdn.yourdomain.com
OSS_BASE_URL=https://你的bucket.oss-cn-hangzhou.aliyuncs.com
```

兼容旧变量名：`OSS_ACCESS_KEY` 等同于 `OSS_ACCESS_KEY_ID`。

---

## 4. 前端（生产构建，可选）

若 API 与图片 CDN 不同源，构建时指定：

```env
# frontend/.env.production
VITE_OSS_BASE_URL=https://你的bucket.oss-cn-hangzhou.aliyuncs.com
```

未设置时，前端对 `/uploads/...` 走同源（Nginx → Node 静态或 OSS 反代）。

---

## 5. 安装依赖

```bash
cd backend
npm install
```

`ali-oss` 已列入依赖；未配置 OSS 环境变量时不会连接云端，仍使用本地存储。

---

## 6. 验证

1. 配置 `.env` 后重启：`npm run dev` 或 `pm2 restart campus-secondhand`  
2. 启动日志应出现：`对象存储: OSS 已启用 (bucket名)`  
3. 登录后发布商品或聊天发图  
4. 在 OSS 控制台查看 `uploads/` 目录是否有新对象  
5. 本地 `backend/uploads` 中对应文件应被删除（仅 OSS 模式）

---

## 7. Nginx 说明

启用 OSS 后，可不把 `/uploads` 反代到 Node，由 `OSS_BASE_URL` 直接访问云端。若仍保留本地回退，可继续保留：

```nginx
location /uploads/ {
    proxy_pass http://127.0.0.1:3001;
}
```

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `backend/src/services/storageService.js` | 上传后同步 OSS |
| `backend/src/utils/fileUrl.js` | 拼接 `OSS_BASE_URL` |
| `frontend/src/utils/fileUrl.js` | 前端展示 URL |
