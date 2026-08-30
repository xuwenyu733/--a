#!/usr/bin/env bash
# 备份 MongoDB + 本地 uploads（未使用 OSS 时）
# 用法：./scripts/backup-data.sh
# 环境变量：MONGODB_URI（默认 mongodb://127.0.0.1:27017/campus_secondhand）

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${ROOT}/backup/${STAMP}"
URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/campus_secondhand}"

mkdir -p "$DEST"

echo "📦 备份 uploads → ${DEST}/uploads.tar.gz"
if [ -d "${ROOT}/backend/uploads" ]; then
  tar -czf "${DEST}/uploads.tar.gz" -C "${ROOT}/backend" uploads
else
  echo "   ⚠️  backend/uploads 不存在，跳过"
fi

echo "📦 备份 MongoDB → ${DEST}/mongo"
if command -v mongodump >/dev/null 2>&1; then
  mongodump --uri="$URI" --out="${DEST}/mongo"
else
  echo "   ⚠️  未安装 mongodump，请手动备份数据库"
fi

echo "✅ 完成：${DEST}"
