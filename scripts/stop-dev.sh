#!/usr/bin/env bash
# 停止开发环境进程
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"

for port in 3001 5175 5176 5177; do
  PIDS=$(lsof -ti :"$port" 2>/dev/null || true)
  [ -n "$PIDS" ] && echo "$PIDS" | xargs kill -9 2>/dev/null || true
done

for f in "$LOG_DIR/backend.pid" "$LOG_DIR/frontend.pid" "$LOG_DIR/server.pid" "$LOG_DIR/client.pid"; do
  if [ -f "$f" ]; then
    PID=$(cat "$f")
    kill -9 "$PID" 2>/dev/null || true
    rm -f "$f"
  fi
done

echo "已停止开发服务（3001 / 5175）"
