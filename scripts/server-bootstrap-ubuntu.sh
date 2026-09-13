#!/usr/bin/env bash
# 腾讯云轻量 Ubuntu 22.04 一键准备环境（Node 20 + MongoDB + Nginx + PM2）
# 用法：在服务器上以有 sudo 权限的用户执行
#   curl -fsSL ... | bash
# 或：bash scripts/server-bootstrap-ubuntu.sh

set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> 更新系统"
$SUDO apt-get update -y
$SUDO apt-get upgrade -y

echo "==> 安装基础工具"
$SUDO apt-get install -y curl git build-essential ca-certificates gnupg ufw

echo "==> 安装 Node.js 20"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi
node -v
npm -v

echo "==> 安装 MongoDB 7.0"
if ! command -v mongod >/dev/null 2>&1; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    $SUDO gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    $SUDO tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  $SUDO apt-get update -y
  $SUDO apt-get install -y mongodb-org
  $SUDO systemctl enable mongod
  $SUDO systemctl start mongod
fi
$SUDO systemctl status mongod --no-pager | head -15

echo "==> 安装 Nginx + PM2"
$SUDO apt-get install -y nginx
$SUDO npm install -g pm2

echo "==> 防火墙（若启用 ufw）"
if command -v ufw >/dev/null 2>&1; then
  $SUDO ufw allow OpenSSH || true
  $SUDO ufw allow 80/tcp || true
  $SUDO ufw allow 443/tcp || true
fi

echo "==> 创建部署目录"
$SUDO mkdir -p /opt/campus-secondhand
$SUDO chown "$(whoami):$(whoami)" /opt/campus-secondhand

echo ""
echo "✅ 环境准备完成"
echo "   Node: $(node -v)  npm: $(npm -v)"
echo "   下一步：把代码放到 /opt/campus-secondhand 后按 DEPLOY.md 构建启动"
