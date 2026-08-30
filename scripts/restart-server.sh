#!/usr/bin/env bash
# 重启生产模式后端（单端口 3001），避免旧进程导致新接口 404
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3001}"

echo "停止占用 :${PORT} 的进程..."
for _ in 1 2 3; do
  PIDS=$(lsof -ti :"${PORT}" 2>/dev/null || true)
  if [ -z "$PIDS" ]; then
    break
  fi
  echo "$PIDS" | xargs kill 2>/dev/null || true
  sleep 1
done

if lsof -ti :"${PORT}" >/dev/null 2>&1; then
  echo "仍有进程占用 ${PORT}，尝试强制结束..."
  lsof -ti :"${PORT}" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

cd "$ROOT/backend"
export NODE_ENV="${NODE_ENV:-production}"
export HOST="${HOST:-0.0.0.0}"

echo "启动服务 NODE_ENV=$NODE_ENV ..."
exec node src/app.js
