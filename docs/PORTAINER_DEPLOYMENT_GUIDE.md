# Portainer + 腾讯云数据库部署指南

## 📋 部署架构

```
GitHub (代码推送)
    ↓
GitHub Actions CI (自动构建)
    ↓
腾讯云容器镜像服务 (hkccr.ccs.tencentyun.com/gdgeek/domain)
    ↓
Portainer Webhook (自动触发)
    ↓
Portainer (拉取镜像并重启)
    ↓
应用容器 ← 连接 → 腾讯云 MySQL
           ← 连接 → 腾讯云 Redis
```

---

## 🎯 部署前准备

### 1. 腾讯云服务准备

#### MySQL 数据库

1. **创建 MySQL 实例**
   - 登录腾讯云控制台
   - 进入 **云数据库 MySQL**
   - 点击 **新建**
   - 选择配置：
     - 版本：MySQL 8.0
     - 规格：根据需求选择（建议至少 1核2G）
     - 存储：20GB 起步
   
2. **记录连接信息**
   ```
   内网地址: rm-xxxxx.mysql.rds.tencentyun.com
   端口: 3306
   用户名: root
   密码: [你设置的密码]
   ```

3. **创建数据库**
   ```sql
   CREATE DATABASE domain_config CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **导入初始化脚本**
   ```bash
   # 下载初始化脚本
   wget https://raw.githubusercontent.com/gdgeek/domain-config-hub/main/src/models/migrations/domain.sql
   
   # 导入数据库
   mysql -h rm-xxxxx.mysql.rds.tencentyun.com -u root -p domain_config < domain.sql
   ```

5. **配置安全组**
   - 允许 Portainer 服务器 IP 访问 3306 端口
   - 或允许同 VPC 内网访问

#### Redis 缓存

1. **创建 Redis 实例**
   - 进入 **云数据库 Redis**
   - 点击 **新建**
   - 选择配置：
     - 版本：Redis 7.0
     - 规格：1GB 起步
   
2. **记录连接信息**
   ```
   内网地址: r-xxxxx.redis.rds.tencentyun.com
   端口: 6379
   密码: [你设置的密码]
   ```

3. **配置安全组**
   - 允许 Portainer 服务器 IP 访问 6379 端口

### 2. 腾讯云容器镜像服务

1. **获取访问凭证**
   - 进入 **容器镜像服务**
   - 访问凭证 → 生成临时登录指令
   - 记录用户名和密码

2. **在 Portainer 服务器上登录**
   ```bash
   docker login hkccr.ccs.tencentyun.com
   # 输入用户名和密码
   ```

---

## 🚀 Portainer 部署步骤

### 步骤 1: 登录 Portainer

访问你的 Portainer 地址：
```
https://your-portainer-domain.com
```

### 步骤 2: 选择环境

1. 点击左侧菜单 **Environments**
2. 选择你要部署的环境（通常是 local 或你的服务器名称）

### 步骤 3: 创建 Stack

1. 点击左侧菜单 **Stacks**
2. 点击右上角 **+ Add stack** 按钮
3. 填写 Stack 信息：
   - **Name**: `domain-config-service`
   - **Build method**: 选择 **Web editor**

### 步骤 4: 配置 Stack

在 **Web editor** 中粘贴以下配置：

```yaml
version: '3.8'

services:
  app:
    image: hkccr.ccs.tencentyun.com/gdgeek/domain:latest
    container_name: domain-config-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # 应用配置
      - NODE_ENV=production
      - PORT=3000
      
      # 腾讯云 MySQL 配置
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT:-3306}
      - DB_NAME=${DB_NAME:-domain_config}
      - DB_USER=${DB_USER:-root}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_POOL_MIN=2
      - DB_POOL_MAX=10
      
      # 腾讯云 Redis 配置
      - REDIS_ENABLED=true
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT:-6379}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - REDIS_TTL=3600
      
      # 其他配置
      - LOG_LEVEL=info
      - RATE_LIMIT_MAX=100
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    
    volumes:
      - app-logs:/app/logs
    
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
    
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  app-logs:
    driver: local
```

### 步骤 5: 配置环境变量

在 **Environment variables** 部分，点击 **+ add an environment variable**，添加以下变量：

| Name | Value | 说明 |
|------|-------|------|
| `DB_HOST` | `rm-xxxxx.mysql.rds.tencentyun.com` | MySQL 内网地址 |
| `DB_PASSWORD` | `your_mysql_password` | MySQL 密码 |
| `REDIS_HOST` | `r-xxxxx.redis.rds.tencentyun.com` | Redis 内网地址 |
| `REDIS_PASSWORD` | `your_redis_password` | Redis 密码 |
| `ADMIN_PASSWORD` | `your_admin_password` | 管理员密码 |

**可选变量：**

| Name | Value | 说明 |
|------|-------|------|
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_NAME` | `domain_config` | 数据库名 |
| `DB_USER` | `root` | 数据库用户 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `LOG_LEVEL` | `info` | 日志级别 |

### 步骤 6: 部署 Stack

1. 滚动到页面底部
2. 点击 **Deploy the stack** 按钮
3. 等待部署完成（约 30-60 秒）

### 步骤 7: 验证部署

1. **查看容器状态**
   - 在 Stack 详情页面，查看容器状态
   - 应该显示为 **running** 和 **healthy**

2. **查看日志**
   - 点击容器名称 `domain-config-app`
   - 点击 **Logs** 标签
   - 查看启动日志，确认没有错误

3. **测试健康检查**
   ```bash
   curl http://your-server:3000/health
   ```
   
   **预期响应：**
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-01-25T00:00:00.000Z",
     "services": {
       "database": "connected",
       "redis": "connected"
     }
   }
   ```

4. **访问服务**
   - API 文档: `http://your-server:3000/api-docs`
   - 管理界面: `http://your-server:3000/admin/admin.html`

---

## 🔄 配置自动部署

### 步骤 1: 创建 Webhook

1. 在 Stack 详情页面，点击顶部的 **Webhooks** 图标
2. 点击 **+ Add webhook**
3. 复制生成的 Webhook URL，格式类似：
   ```
   https://your-portainer-domain.com/api/webhooks/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### 步骤 2: 配置 GitHub Secrets

1. 进入 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加 Secret：
   - **Name**: `PORTAINER_WEBHOOK_URL`
   - **Value**: 粘贴刚才复制的 Webhook URL
5. 点击 **Add secret**

### 步骤 3: 测试自动部署

1. **推送代码到 main 分支**
   ```bash
   git add .
   git commit -m "test: 测试自动部署"
   git push origin main
   ```

2. **查看 CI 流程**
   - 进入 GitHub 仓库的 **Actions** 标签
   - 查看最新的 workflow 运行
   - 确认 Test → Build → Deploy 三个阶段都成功

3. **验证 Portainer 更新**
   - 回到 Portainer Stack 页面
   - 查看容器是否自动重启
   - 检查镜像是否更新到最新版本

### 自动部署流程

```
开发者推送代码
    ↓
GitHub Actions 触发
    ↓
运行测试 (Test Job)
    ↓
构建项目 (Build Job)
    ↓
构建 Docker 镜像 (Deploy Job)
    ↓
推送到腾讯云镜像仓库
    ↓
触发 Portainer Webhook
    ↓
Portainer 自动拉取最新镜像
    ↓
重启容器
    ↓
部署完成 ✅
```

---

## 🛠️ 日常管理

### 查看容器状态

1. 进入 **Stacks** → `domain-config-service`
2. 查看容器状态、资源使用情况

### 查看日志

1. 点击容器名称 `domain-config-app`
2. 点击 **Logs** 标签
3. 可以实时查看日志，或下载日志文件

### 重启服务

1. 在 Stack 详情页面
2. 点击 **Stop** 停止服务
3. 点击 **Start** 启动服务
4. 或直接点击 **Restart** 重启

### 更新镜像

**自动更新（推荐）：**
- 推送代码到 main 分支，自动触发部署

**手动更新：**
1. 在 Stack 详情页面
2. 点击 **Pull and redeploy**
3. 选择 `app` 服务
4. 点击 **Pull** 拉取最新镜像
5. 容器会自动重启

### 修改环境变量

1. 在 Stack 详情页面
2. 点击 **Editor** 标签
3. 修改环境变量
4. 点击 **Update the stack**
5. 容器会自动重启应用新配置

### 查看资源使用

1. 点击容器名称
2. 点击 **Stats** 标签
3. 查看 CPU、内存、网络使用情况

---

## 🔐 安全配置

### 1. 使用强密码

确保以下密码足够强：
- `DB_PASSWORD`: 至少 16 位，包含大小写字母、数字、特殊字符
- `REDIS_PASSWORD`: 至少 16 位
- `ADMIN_PASSWORD`: 至少 12 位

### 2. 限制端口访问

**腾讯云安全组配置：**

**MySQL 安全组：**
```
入站规则：
- 协议: TCP
- 端口: 3306
- 来源: Portainer 服务器 IP 或 VPC 内网段
```

**Redis 安全组：**
```
入站规则：
- 协议: TCP
- 端口: 6379
- 来源: Portainer 服务器 IP 或 VPC 内网段
```

**应用服务器安全组：**
```
入站规则：
- 协议: TCP
- 端口: 3000
- 来源: 0.0.0.0/0 (或通过负载均衡器)
```

### 3. 使用 HTTPS

**方案 A: 使用 Nginx 反向代理**

在 Portainer 中添加 Nginx 服务：

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
```

**nginx.conf 配置：**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**方案 B: 使用腾讯云 CLB（负载均衡器）**
1. 创建 CLB 实例
2. 配置 HTTPS 监听器
3. 上传 SSL 证书
4. 后端绑定应用服务器的 3000 端口

### 4. 定期更新

- 定期更新应用镜像
- 定期更新腾讯云数据库版本
- 关注安全公告

---

## 📊 监控和告警

### 1. Portainer 内置监控

在容器详情页面查看：
- CPU 使用率
- 内存使用率
- 网络流量
- 磁盘 I/O

### 2. 腾讯云监控

**MySQL 监控：**
- 登录腾讯云控制台
- 进入云数据库 MySQL
- 查看监控数据：
  - QPS（每秒查询数）
  - 连接数
  - 慢查询
  - 存储空间

**Redis 监控：**
- 进入云数据库 Redis
- 查看监控数据：
  - 内存使用率
  - 连接数
  - QPS
  - 命中率

### 3. 配置告警

**腾讯云告警策略：**
1. 进入 **云监控** → **告警策略**
2. 创建告警策略
3. 配置告警规则：
   - MySQL CPU 使用率 > 80%
   - MySQL 连接数 > 80%
   - Redis 内存使用率 > 80%
   - 应用容器停止运行
4. 配置通知方式（短信、邮件、微信）

### 4. 应用健康检查

设置定时任务检查应用健康：

```bash
# 创建检查脚本
cat > /usr/local/bin/check-domain-service.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3000/health"
WEBHOOK_URL="your-alert-webhook-url"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
    curl -X POST $WEBHOOK_URL -d "Domain service health check failed: HTTP $response"
fi
EOF

chmod +x /usr/local/bin/check-domain-service.sh

# 添加到 crontab（每 5 分钟检查一次）
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-domain-service.sh") | crontab -
```

---

## 💾 备份策略

### 1. 腾讯云 MySQL 自动备份

1. 进入云数据库 MySQL 控制台
2. 选择实例 → **备份恢复**
3. 配置自动备份：
   - 备份时间：凌晨 2:00-4:00（业务低峰期）
   - 数据备份保留：7 天
   - 日志备份保留：7 天
   - 备份方式：物理备份

### 2. 腾讯云 Redis 备份

1. 进入云数据库 Redis 控制台
2. 选择实例 → **备份与恢复**
3. 配置自动备份：
   - 备份时间：凌晨 3:00
   - 备份保留：7 天

### 3. 应用日志备份

在 Portainer Stack 中已配置日志轮转：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

定期下载重要日志：
```bash
# 从容器复制日志
docker cp domain-config-app:/app/logs ./logs-backup-$(date +%Y%m%d)
```

---

## 🐛 故障排查

### 问题 1: 容器无法启动

**症状：** 容器状态显示 Exited 或 Restarting

**排查步骤：**
1. 查看容器日志
   ```
   Portainer → Containers → domain-config-app → Logs
   ```

2. 常见错误：
   - **数据库连接失败**
     - 检查 `DB_HOST` 是否正确
     - 检查安全组是否允许访问
     - 测试网络连通性：`ping rm-xxxxx.mysql.rds.tencentyun.com`
   
   - **Redis 连接失败**
     - 检查 `REDIS_HOST` 是否正确
     - 检查 `REDIS_PASSWORD` 是否正确
     - 或设置 `REDIS_ENABLED=false` 禁用 Redis

3. 进入容器调试
   ```
   Portainer → Containers → domain-config-app → Console
   选择 /bin/sh
   ```

### 问题 2: 健康检查失败

**症状：** 容器状态显示 unhealthy

**排查步骤：**
1. 手动测试健康检查
   ```bash
   curl http://your-server:3000/health
   ```

2. 查看详细错误信息
   ```
   Portainer → Containers → domain-config-app → Logs
   ```

3. 检查数据库连接
   ```bash
   # 在容器内测试
   wget -O- http://localhost:3000/health
   ```

### 问题 3: 自动部署不工作

**症状：** 推送代码后 Portainer 没有更新

**排查步骤：**
1. 检查 GitHub Actions
   - 进入 GitHub → Actions
   - 查看最新 workflow 是否成功
   - 检查 Deploy job 是否执行

2. 检查 Webhook 配置
   - 确认 `PORTAINER_WEBHOOK_URL` 正确
   - 测试 Webhook：
     ```bash
     curl -X POST https://your-portainer-domain.com/api/webhooks/xxx
     ```

3. 检查 Portainer 日志
   - Portainer 容器日志中查看 webhook 请求

### 问题 4: 镜像拉取失败

**症状：** 提示 "pull access denied" 或 "unauthorized"

**解决方案：**
1. 在 Portainer 服务器上重新登录
   ```bash
   docker login hkccr.ccs.tencentyun.com
   ```

2. 或在 Portainer 中配置 Registry
   - Settings → Registries → Add registry
   - 添加腾讯云容器镜像服务凭证

### 问题 5: 性能问题

**症状：** 响应慢、超时

**排查步骤：**
1. 查看资源使用
   ```
   Portainer → Containers → domain-config-app → Stats
   ```

2. 检查数据库性能
   - 腾讯云控制台查看 MySQL 监控
   - 查看慢查询日志

3. 检查 Redis 性能
   - 查看 Redis 监控
   - 检查缓存命中率

4. 优化建议：
   - 增加数据库连接池大小：`DB_POOL_MAX=20`
   - 升级数据库规格
   - 启用 Redis 缓存
   - 增加应用容器资源限制

---

## 📈 性能优化

### 1. 数据库优化

**MySQL 配置优化：**
```sql
-- 查看当前配置
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- 在腾讯云控制台调整参数
-- 参数设置 → 修改参数
max_connections = 200
innodb_buffer_pool_size = 512M
```

**索引优化：**
```sql
-- 查看慢查询
SHOW FULL PROCESSLIST;

-- 分析查询
EXPLAIN SELECT * FROM domains WHERE domain = 'example.com';

-- 添加索引（如果需要）
CREATE INDEX idx_domain ON domains(domain);
```

### 2. Redis 优化

**配置优化：**
- 在腾讯云控制台调整参数
- `maxmemory-policy`: allkeys-lru
- `maxmemory`: 根据实际使用调整

**缓存策略：**
- 调整 TTL：`REDIS_TTL=7200`（2小时）
- 监控缓存命中率

### 3. 应用优化

**增加连接池：**
```yaml
environment:
  - DB_POOL_MIN=5
  - DB_POOL_MAX=20
```

**调整日志级别：**
```yaml
environment:
  - LOG_LEVEL=warn  # 生产环境使用 warn 或 error
```

**限流配置：**
```yaml
environment:
  - RATE_LIMIT_MAX=200  # 根据实际需求调整
```

---

## 📚 相关文档

- [完整部署指南](./DOCKER_COMPOSE_DEPLOYMENT.md)
- [部署快速参考](./DEPLOYMENT_QUICK_REFERENCE.md)
- [CI/CD 配置](./CI_DOCKER_SETUP.md)
- [GitHub Secrets 配置](./GITHUB_SECRETS_SETUP.md)

---

## ✅ 部署检查清单

### 部署前

- [ ] 创建腾讯云 MySQL 实例
- [ ] 创建腾讯云 Redis 实例
- [ ] 导入数据库初始化脚本
- [ ] 配置安全组规则
- [ ] 获取腾讯云容器镜像服务凭证
- [ ] 在 Portainer 服务器上登录镜像仓库

### 部署中

- [ ] 在 Portainer 中创建 Stack
- [ ] 配置所有必需的环境变量
- [ ] 部署 Stack
- [ ] 查看容器状态（running & healthy）
- [ ] 查看容器日志（无错误）

### 部署后

- [ ] 测试健康检查接口
- [ ] 访问 API 文档
- [ ] 访问管理界面
- [ ] 测试 API 功能
- [ ] 配置 Portainer Webhook
- [ ] 添加 GitHub Secret
- [ ] 测试自动部署
- [ ] 配置监控告警
- [ ] 验证备份策略

---

**更新时间**: 2026-01-25
**适用版本**: v1.0.0+
