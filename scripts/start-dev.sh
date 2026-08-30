#!/usr/bin/env bash
# 一键启动开发环境：后端 3001 + 前端 5175
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

for port in 3001 5175 5176 5177; do
  PIDS=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "释放端口 $port ..."
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
  fi
done
sleep 1

echo "启动后端 (dev:lan) ..."
cd "$ROOT/backend"
nohup npm run dev:lan > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"

echo "启动前端 (dev:lan) ..."
cd "$ROOT/frontend"
nohup npm run dev:lan > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$LOG_DIR/frontend.pid"

echo "等待服务就绪..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://127.0.0.1:3001/api/health >/dev/null 2>&1 && curl -sf http://127.0.0.1:5175/ >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
echo "✅ 开发环境已启动"
echo "   前端: http://localhost:5175/"
echo "   API:  http://localhost:3001/api"
echo "   日志: $LOG_DIR/backend.log | $LOG_DIR/frontend.log"
echo "   停止: npm run stop  或  bash scripts/stop-dev.sh"
echo "   小程序(CLI):  cd uniapp && npm run dev:mp-weixin"
echo "                 微信工具打开 uniapp/unpackage/dist/dev/mp-weixin"
echo ""

NETWORK=$(grep -o 'Network:.*' "$LOG_DIR/frontend.log" 2>/dev/null | tail -1 || true)
LAN=$(grep -o 'http://[0-9.]*:3001' "$LOG_DIR/backend.log" 2>/dev/null | grep -v 127.0.0.1 | head -1 || true)
[ -n "$NETWORK" ] && echo "   局域网前端: ${NETWORK#*  }"
[ -n "$LAN" ] && echo "   局域网 API:  $LAN/api"
