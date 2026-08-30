#!/bin/bash
# 在本机终端运行：走系统代理登录 GitHub 并推送
set -e
cd "$(dirname "$0")/.."

# Clash / 本地代理（系统已开，终端默认不走）
export http_proxy=http://127.0.0.1:7897
export https_proxy=http://127.0.0.1:7897
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$https_proxy"
export ALL_PROXY=socks5://127.0.0.1:7897
export all_proxy="$ALL_PROXY"

echo "==> 仓库目录: $(pwd)"
echo "==> 远程: $(git remote get-url origin 2>/dev/null || echo '未设置')"
echo "==> 使用代理: $https_proxy"

if ! curl -sI --max-time 10 https://github.com >/dev/null; then
  echo "❌ 无法通过代理访问 github.com，请先确认代理软件已开启（端口 7897）"
  exit 1
fi
echo "==> 网络 OK"

if ! gh auth status >/dev/null 2>&1; then
  echo "==> 需要登录 GitHub（浏览器授权）"
  gh auth login -h github.com -p https -w
fi

gh auth setup-git
git branch -M main
git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 push -u origin main

echo ""
echo "✅ 推送完成: https://github.com/xuwenyu733/--a"
