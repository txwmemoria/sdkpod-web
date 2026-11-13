# SDK Pods

个人应用工作室站点，域名 **sdkpods.com**。用 Rust（Axum + rustls）同时提供 **80 → 443** 跳转与 HTTPS 站点，内含作品宣发、下载、健康检查与基础可观测性。

## 快速开始（本机，免 root）

```bash
make dev
# https://127.0.0.1:8443/zh  ·  https://127.0.0.1:8443/en
# / 按 Accept-Language / Cookie 跳转
```

## 绑定域名并监听 80 / 443

```bash
# 1) 本机解析
make hosts

# 2) 特权端口启动（会 sudo）
make local
# https://sdkpods.com
```

浏览器会提示自签证书，本地开发属预期；生产请将 `SDKPODS_AUTO_TLS=0`，并放入正式证书：

- `certs/sdkpods.com.crt`
- `certs/sdkpods.com.key`

## 内容维护

编辑 `content/apps.toml` 增删作品；安装包放入 `downloads/`，文件名与 `download_path` 对齐。

## 运维能力

| 能力 | 说明 |
|------|------|
| TLS | rustls 原生 HTTPS；缺失证书时可自动签发自签 |
| 健康检查 | `GET /healthz`、`GET /readyz` |
| Metrics | `GET /metrics`（Prometheus 文本） |
| 日志 | `tracing`；`SDKPODS_LOG_JSON=1` 输出 JSON |
| Docker | `make docker-up`（`deploy/docker-compose.yml`） |
| systemd | `deploy/systemd/sdkpods.service` |
| 可选边缘 | `deploy/Caddyfile`（若希望 Caddy 终止 TLS） |

## API

- `GET /api/apps` — 作品目录
- `GET /api/apps/:id` — 单应用
- `GET /downloads/<file>` — 安装包

## 环境变量

见 `.env.example`。
