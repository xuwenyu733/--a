#!/usr/bin/env bash
# 在服务器以 ubuntu 执行：bash scripts/enable-https-xymarket.sh
# 前提：DNS A 记录 xymarket.cn / www 已指向本机公网 IP
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "请用 ubuntu 执行，不要用 root"
  exit 1
fi

NGINX_SITE=/etc/nginx/sites-available/campus-secondhand
ENV_FILE=/opt/campus-secondhand/backend/.env

echo "==> 检查域名解析"
for h in xymarket.cn www.xymarket.cn; do
  echo -n "$h -> "
  getent hosts "$h" | awk '{print $1}' || echo "(未解析)"
done

echo "==> 更新 Nginx server_name"
if [[ -f "$NGINX_SITE" ]]; then
  sudo python3 - <<'PY'
from pathlib import Path
p = Path("/etc/nginx/sites-available/campus-secondhand")
t = p.read_text()
old = t
t = t.replace("server_name your-domain.com;", "server_name xymarket.cn www.xymarket.cn;")
# IP 或 _ 也改成域名（仅替换 listen 80 块里的第一处 server_name）
import re
t2, n = re.subn(
    r"(listen\s+80[^;]*;\s*(?:.|\n)*?server_name\s+)[^;]+;",
    r"\1xymarket.cn www.xymarket.cn;",
    t,
    count=1,
)
if n:
    t = t2
if t != old:
    p.write_text(t)
    print("nginx server_name updated")
else:
    print("nginx config already has domain or pattern unmatched; please check manually")
PY
  sudo nginx -t
  sudo systemctl reload nginx
else
  echo "未找到 $NGINX_SITE，跳过 nginx 文件改写"
fi

echo "==> 安装 certbot 并申请证书"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d xymarket.cn -d www.xymarket.cn --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo "certbot 失败：请确认 DNS 已生效且 80 端口对公网开放"
  exit 1
}

echo "==> 写入 PUBLIC_BASE_URL / CORS_ORIGINS"
if [[ -f "$ENV_FILE" ]]; then
  python3 - <<'PY'
from pathlib import Path
p = Path("/opt/campus-secondhand/backend/.env")
lines = p.read_text().splitlines()
kv = {
    "PUBLIC_BASE_URL": "https://xymarket.cn",
    "CORS_ORIGINS": "https://xymarket.cn,https://www.xymarket.cn",
}
out = []
seen = set()
for line in lines:
    key = line.split("=", 1)[0].strip() if "=" in line and not line.strip().startswith("#") else None
    if key in kv:
        out.append(f"{key}={kv[key]}")
        seen.add(key)
    else:
        out.append(line)
for k, v in kv.items():
    if k not in seen:
        out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n")
print("env updated")
PY
else
  echo "未找到 $ENV_FILE"
  exit 1
fi

cd /opt/campus-secondhand/backend
pm2 restart campus-secondhand
pm2 status campus-secondhand

echo "==> 完成。请访问 https://www.xymarket.cn 检查页脚备案号。"
