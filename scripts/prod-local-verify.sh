#!/usr/bin/env bash
# 本地存储 + 生产模式快速自检（需已 build，服务运行在 3001）
set -euo pipefail
BASE="${SMOKE_BASE_URL:-http://127.0.0.1:3001}"
API="${BASE}/api"

echo "🔍 生产模式本地存储自检"
echo "   服务地址: ${BASE}"
echo ""

fail=0

check() {
  if "$@"; then
    echo "  ✓ $1"
  else
    echo "  ✗ $1"
    fail=1
  fi
}

[ -f frontend/dist/index.html ] && echo "  ✓ frontend/dist 已构建" || { echo "  ✗ 请先: cd frontend && npm run build"; exit 1; }

[ -d backend/uploads ] && echo "  ✓ backend/uploads 目录存在" || { echo "  ✗ mkdir -p backend/uploads"; exit 1; }

code=$(curl -s -o /tmp/health.json -w "%{http_code}" "${API}/health" || true)
if [ "$code" = "200" ] && grep -q '"code":0' /tmp/health.json 2>/dev/null; then
  echo "  ✓ GET /api/health"
else
  echo "  ✗ GET /api/health (HTTP ${code})，请先 NODE_ENV=production npm run start"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo ""
  echo "运行 API 冒烟: cd backend && npm run smoke"
  echo "浏览器抽查: ${BASE} → 发商品图、聊天图，路径应为 /uploads/..."
else
  exit 1
fi
