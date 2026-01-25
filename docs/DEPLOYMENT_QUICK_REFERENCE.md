# 部署快速参考

## 🎯 三种部署方式对比

| 方式 | 适用场景 | 复杂度 | 成本 | 推荐度 |
|------|---------|--------|------|--------|
| **Docker Compose + 本地数据库** | 开发/测试 | ⭐⭐ | 低 | ⭐⭐⭐ |
| **Docker Compose + 腾讯云数据库** | 生产环境 | ⭐ | 中 | ⭐⭐⭐⭐⭐ |
| **Portainer + 腾讯云数据库** | 生产环境（可视化） | ⭐ | 中 | ⭐⭐⭐⭐⭐ |

---

## 📦 方式 1: 本地完整部署

**适用场景**：开发、测试环境

### 一键启动

```bash
# 克隆代码
git clone https://github.com/gdgeek/domain-config-hub.git
cd domain-config-hub

# 启动（含 MySQL + Redis）
docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d

# 查看状态
docker-compose ps

# 访问
curl http://localhost:3000/health
```

### 配置文件

使用项目自带的 `docker-compose.yml`，包含：
- ✅ 应用容器
- ✅ MySQL 8.0
- ✅ Redis 7

---

## ☁️ 方式 2: 腾讯云托管服务

**适用场景**：生产环境（推荐）

### 快速部署

```bash
# 1. 创建配置文件
cat > docker-compose.cloud.yml << 'EOF'
version: '3.8'
services:
  app:
    image: hkccr.ccs.tencentyun.com/gdgeek/domain:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=rm-xxxxx.mysql.rds.tencentyun.com
      - DB_PORT=3306
      - DB_NAME=domain_config
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_ENABLED=true
      - REDIS_HOST=r-xxxxx.redis.rds.tencentyun.com
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    volumes:
      - app-logs:/app/logs
volumes:
  app-logs:
EOF

# 2. 创建环境变量
cat > .env << 'EOF'
DB_PASSWORD=your_mysql_password
REDIS_PASSWORD=your_redis_password
ADMIN_PASSWORD=your_admin_password
EOF

# 3. 登录镜像仓库
docker login hkccr.ccs.tencentyun.com

# 4. 启动
docker-compose -f docker-compose.cloud.yml up -d
```

### 优势

- ✅ 无需管理数据库容器
- ✅ 自动备份和高可用
- ✅ 更好的性能
- ✅ 简化运维

---

## 🐳 方式 3: Portainer 可视化部署

**适用场景**：生产环境，需要可视化管理

### 部署步骤

1. **登录 Portainer**
   ```
   https://your-portainer-domain.com
   ```

2. **创建 Stack**
   - Stacks → Add stack
   - Name: `domain-config-service`

3. **粘贴配置**
   ```yaml
   version: '3.8'
   services:
     app:
       image: hkccr.ccs.tencentyun.com/gdgeek/domain:latest
       restart: unless-stopped
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DB_HOST=${DB_HOST}
         - DB_PASSWORD=${DB_PASSWORD}
         - REDIS_HOST=${REDIS_HOST}
         - REDIS_PASSWORD=${REDIS_PASSWORD}
         - ADMIN_PASSWORD=${ADMIN_PASSWORD}
   ```

4. **添加环境变量**
   ```
   DB_HOST=rm-xxxxx.mysql.rds.tencentyun.com
   DB_PASSWORD=your_password
   REDIS_HOST=r-xxxxx.redis.rds.tencentyun.com
   REDIS_PASSWORD=your_password
   ADMIN_PASSWORD=your_password
   ```

5. **配置 Webhook 自动部署**
   - Stack 详情 → Webhooks → Add webhook
   - 复制 URL 到 GitHub Secrets: `PORTAINER_WEBHOOK_URL`

### 优势

- ✅ Web 界面管理
- ✅ 自动部署（配合 CI）
- ✅ 可视化监控
- ✅ 团队协作

---

## 🔍 验证部署

### 健康检查

```bash
curl http://localhost:3000/health
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

### 访问服务

- **API 文档**: http://your-server:3000/api-docs
- **管理界面**: http://your-server:3000/admin/admin.html
- **健康检查**: http://your-server:3000/health

---

## 🛠️ 常用命令

### Docker Compose

```bash
# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart app

# 更新镜像
docker-compose pull && docker-compose up -d

# 停止服务
docker-compose down
```

### Docker 命令

```bash
# 查看容器
docker ps

# 查看日志
docker logs -f domain-config-app

# 进入容器
docker exec -it domain-config-app sh

# 重启容器
docker restart domain-config-app

# 更新镜像
docker pull hkccr.ccs.tencentyun.com/gdgeek/domain:latest
docker stop domain-config-app
docker rm domain-config-app
docker-compose up -d
```

---

## 🔐 环境变量配置

### 必需配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `DB_HOST` | 数据库地址 | `mysql` 或 `rm-xxxxx.mysql.rds.tencentyun.com` |
| `DB_PASSWORD` | 数据库密码 | `your_secure_password` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin_password` |

### 可选配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_PORT` | `3306` | 数据库端口 |
| `DB_NAME` | `domain_config` | 数据库名 |
| `DB_USER` | `root` | 数据库用户 |
| `REDIS_ENABLED` | `true` | 是否启用 Redis |
| `REDIS_HOST` | `redis` | Redis 地址 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | - | Redis 密码 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `RATE_LIMIT_MAX` | `100` | 限流最大请求数 |

---

## 🚨 故障排查

### 问题 1: 容器无法启动

```bash
# 查看日志
docker logs domain-config-app

# 检查配置
docker inspect domain-config-app
```

### 问题 2: 数据库连接失败

```bash
# 测试数据库连接
docker exec -it domain-config-app sh
wget -O- http://localhost:3000/health

# 检查网络
ping rm-xxxxx.mysql.rds.tencentyun.com
```

### 问题 3: 健康检查失败

```bash
# 手动测试
curl -v http://localhost:3000/health

# 查看详细日志
docker logs -f domain-config-app
```

---

## 📚 详细文档

- [完整部署指南](./DOCKER_COMPOSE_DEPLOYMENT.md)
- [CI/CD 配置](./CI_DOCKER_SETUP.md)
- [GitHub Secrets 配置](./GITHUB_SECRETS_SETUP.md)
- [Docker Compose 说明](../docker-compose.README.md)

---

## 🎓 最佳实践

### 开发环境

```bash
# 使用本地数据库
docker-compose up -d
```

### 测试环境

```bash
# 使用腾讯云数据库 + Docker Compose
docker-compose -f docker-compose.cloud.yml up -d
```

### 生产环境

```bash
# 使用 Portainer + 腾讯云数据库 + CI/CD
# 1. 在 Portainer 中创建 Stack
# 2. 配置 Webhook
# 3. 推送代码自动部署
```

---

## 💡 提示

1. **安全性**
   - 修改所有默认密码
   - 使用环境变量管理敏感信息
   - 配置防火墙规则

2. **性能**
   - 生产环境使用腾讯云托管服务
   - 启用 Redis 缓存
   - 配置合适的连接池大小

3. **监控**
   - 定期检查健康状态
   - 配置日志轮转
   - 设置告警通知

4. **备份**
   - 使用腾讯云自动备份
   - 定期测试恢复流程
   - 保留多个备份版本

---

**更新时间**: 2026-01-25
