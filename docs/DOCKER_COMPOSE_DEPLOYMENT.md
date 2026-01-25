# Docker Compose 部署指南

## 📋 部署步骤

### 前置条件

确保服务器上已安装：
- Docker (20.10+)
- Docker Compose (2.0+)

```bash
# 检查版本
docker --version
docker-compose --version
```

---

## 🚀 快速部署（5 分钟）

### 步骤 1: 准备部署目录

```bash
# 创建部署目录
mkdir -p ~/domain-config-service
cd ~/domain-config-service

# 下载必要文件
wget https://raw.githubusercontent.com/gdgeek/domain-config-hub/main/docker-compose.yml
wget https://raw.githubusercontent.com/gdgeek/domain-config-hub/main/docker-compose.redis.yml
```

### 步骤 2: 创建环境配置文件

```bash
# 创建 .env 文件
cat > .env << 'EOF'
# 应用配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=domain_config
DB_USER=root
DB_PASSWORD=your_secure_password_here
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis 配置
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# 日志配置
LOG_LEVEL=info

# 限流配置
RATE_LIMIT_MAX=100

# 管理员密码
ADMIN_PASSWORD=your_admin_password_here
EOF
```

**⚠️ 重要：修改以下密码**
```bash
# 使用编辑器修改密码
nano .env

# 或使用 sed 命令
sed -i 's/your_secure_password_here/YOUR_REAL_PASSWORD/g' .env
sed -i 's/your_admin_password_here/YOUR_ADMIN_PASSWORD/g' .env
```

### 步骤 3: 下载数据库初始化脚本

```bash
# 创建目录
mkdir -p src/models/migrations

# 下载初始化脚本
wget -O src/models/migrations/domain.sql \
  https://raw.githubusercontent.com/gdgeek/domain-config-hub/main/src/models/migrations/domain.sql
```

### 步骤 4: 启动服务

**选项 A: 不使用 Redis（简单部署）**
```bash
docker-compose up -d
```

**选项 B: 使用 Redis（推荐）**
```bash
docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d
```

### 步骤 5: 验证部署

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 检查健康状态
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

### 步骤 6: 访问服务

- **API 文档**: http://your-server:3000/api-docs
- **管理界面**: http://your-server:3000/admin/admin.html
- **健康检查**: http://your-server:3000/health

---

## 🔧 详细部署步骤

### 方案 1: 使用 CI 构建的镜像（推荐）

如果你已经通过 CI 构建并推送了镜像到腾讯云：

#### 1. 创建 docker-compose.prod.yml

```bash
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  app:
    image: hkccr.ccs.tencentyun.com/gdgeek/domain:latest
    container_name: domain-config-app
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=3000
      - DB_HOST=${DB_HOST:-mysql}
      - DB_PORT=${DB_PORT:-3306}
      - DB_NAME=${DB_NAME:-domain_config}
      - DB_USER=${DB_USER:-root}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_POOL_MIN=${DB_POOL_MIN:-2}
      - DB_POOL_MAX=${DB_POOL_MAX:-10}
      - REDIS_ENABLED=${REDIS_ENABLED:-true}
      - REDIS_HOST=${REDIS_HOST:-redis}
      - REDIS_PORT=${REDIS_PORT:-6379}
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - REDIS_TTL=${REDIS_TTL:-3600}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-100}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - domain-config-network
    volumes:
      - app-logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  mysql:
    image: mysql:8.0
    container_name: domain-config-mysql
    restart: unless-stopped
    ports:
      - "${DB_PORT:-3306}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME:-domain_config}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./src/models/migrations/domain.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - domain-config-network
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb3
      --collation-server=utf8mb3_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  redis:
    image: redis:7-alpine
    container_name: domain-config-redis
    restart: unless-stopped
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis-data:/data
    networks:
      - domain-config-network
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

networks:
  domain-config-network:
    driver: bridge

volumes:
  mysql-data:
  redis-data:
  app-logs:
EOF
```

#### 2. 登录腾讯云容器镜像服务

```bash
docker login hkccr.ccs.tencentyun.com
# 输入用户名和密码
```

#### 3. 启动服务

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### 方案 2: 本地构建镜像

如果你想在服务器上本地构建：

#### 1. 克隆代码仓库

```bash
git clone https://github.com/gdgeek/domain-config-hub.git
cd domain-config-hub
```

#### 2. 创建 .env 文件

```bash
cp .env.example .env
nano .env  # 修改配置
```

#### 3. 构建并启动

```bash
# 不使用 Redis
docker-compose up -d --build

# 使用 Redis
docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d --build
```

---

## 🔍 部署验证

### 1. 检查容器状态

```bash
docker-compose ps
```

**预期输出：**
```
NAME                    STATUS              PORTS
domain-config-app       Up (healthy)        0.0.0.0:3000->3000/tcp
domain-config-mysql     Up (healthy)        0.0.0.0:3306->3306/tcp
domain-config-redis     Up (healthy)        0.0.0.0:6379->6379/tcp
```

### 2. 检查日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看应用日志
docker-compose logs app

# 实时跟踪日志
docker-compose logs -f app
```

### 3. 测试 API

```bash
# 健康检查
curl http://localhost:3000/health

# 获取配置列表
curl http://localhost:3000/api/v1/configs

# 获取域名列表
curl http://localhost:3000/api/v1/domains
```

### 4. 访问管理界面

打开浏览器访问：
```
http://your-server:3000/admin/admin.html
```

使用 `.env` 中配置的 `ADMIN_PASSWORD` 登录。

---

## 🛠️ 常用管理命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose stop

# 重启服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 停止并删除容器和数据卷（⚠️ 会删除数据）
docker-compose down -v
```

### 查看状态

```bash
# 查看服务状态
docker-compose ps

# 查看资源使用
docker stats

# 查看网络
docker network ls
docker network inspect domain-config-hub_domain-config-network
```

### 日志管理

```bash
# 查看最近 100 行日志
docker-compose logs --tail=100

# 查看特定服务日志
docker-compose logs app
docker-compose logs mysql
docker-compose logs redis

# 实时跟踪日志
docker-compose logs -f app
```

### 进入容器

```bash
# 进入应用容器
docker-compose exec app sh

# 进入 MySQL 容器
docker-compose exec mysql bash

# 进入 Redis 容器
docker-compose exec redis sh
```

### 数据库操作

```bash
# 连接 MySQL
docker-compose exec mysql mysql -u root -p domain_config

# 备份数据库
docker-compose exec mysql mysqldump -u root -p domain_config > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p domain_config < backup.sql

# 查看数据库表
docker-compose exec mysql mysql -u root -p -e "USE domain_config; SHOW TABLES;"
```

### Redis 操作

```bash
# 连接 Redis
docker-compose exec redis redis-cli

# 查看 Redis 信息
docker-compose exec redis redis-cli INFO

# 清空 Redis 缓存
docker-compose exec redis redis-cli FLUSHALL
```

---

## 🔄 更新部署

### 方法 1: 使用 Portainer Webhook（自动）

如果配置了 Portainer Webhook，推送代码到 main 分支后会自动部署。

### 方法 2: 手动拉取最新镜像

```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d

# 清理旧镜像
docker image prune -f
```

### 方法 3: 重新构建

```bash
# 停止服务
docker-compose down

# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose up -d --build
```

---

## 💾 数据备份与恢复

### 备份

```bash
# 创建备份目录
mkdir -p ~/backups

# 备份 MySQL
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} domain_config \
  > ~/backups/mysql_backup_$(date +%Y%m%d_%H%M%S).sql

# 备份 Redis
docker-compose exec redis redis-cli SAVE
docker cp domain-config-redis:/data/dump.rdb ~/backups/redis_backup_$(date +%Y%m%d_%H%M%S).rdb

# 备份数据卷
docker run --rm \
  -v domain-config-hub_mysql-data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/mysql-data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### 恢复

```bash
# 恢复 MySQL
docker-compose exec -T mysql mysql -u root -p${DB_PASSWORD} domain_config \
  < ~/backups/mysql_backup_20260125_120000.sql

# 恢复 Redis
docker cp ~/backups/redis_backup_20260125_120000.rdb domain-config-redis:/data/dump.rdb
docker-compose restart redis
```

### 自动备份脚本

```bash
# 创建备份脚本
cat > ~/backup-domain-config.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份 MySQL
docker-compose exec -T mysql mysqldump -u root -p${DB_PASSWORD} domain_config \
  > $BACKUP_DIR/mysql_$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/mysql_$DATE.sql

# 删除 7 天前的备份
find $BACKUP_DIR -name "mysql_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/mysql_$DATE.sql.gz"
EOF

chmod +x ~/backup-domain-config.sh

# 添加到 crontab（每天凌晨 2 点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-domain-config.sh") | crontab -
```

---

## 🔒 安全加固

### 1. 修改默认密码

```bash
# 编辑 .env 文件
nano .env

# 修改以下配置
DB_PASSWORD=strong_random_password_here
ADMIN_PASSWORD=another_strong_password
REDIS_PASSWORD=redis_password_if_needed
```

### 2. 限制端口暴露

生产环境建议不暴露 MySQL 和 Redis 端口：

```yaml
# docker-compose.yml
services:
  mysql:
    # 注释掉 ports 配置
    # ports:
    #   - "3306:3306"
  
  redis:
    # 注释掉 ports 配置
    # ports:
    #   - "6379:6379"
```

### 3. 使用防火墙

```bash
# 只允许特定 IP 访问
sudo ufw allow from YOUR_IP to any port 3000
sudo ufw enable
```

### 4. 配置 HTTPS

使用 Nginx 反向代理并配置 SSL：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🐛 故障排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker-compose logs app

# 检查配置
docker-compose config

# 检查端口占用
sudo netstat -tlnp | grep 3000
```

### 问题 2: 数据库连接失败

```bash
# 检查 MySQL 状态
docker-compose ps mysql
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -u root -p${DB_PASSWORD} -e "SELECT 1"

# 等待 MySQL 完全启动（约 30 秒）
sleep 30
docker-compose restart app
```

### 问题 3: Redis 连接失败

```bash
# 检查 Redis 状态
docker-compose ps redis
docker-compose logs redis

# 测试 Redis 连接
docker-compose exec redis redis-cli ping

# 或禁用 Redis
echo "REDIS_ENABLED=false" >> .env
docker-compose restart app
```

### 问题 4: 健康检查失败

```bash
# 手动测试健康检查
curl -v http://localhost:3000/health

# 检查应用日志
docker-compose logs app

# 进入容器检查
docker-compose exec app sh
wget -O- http://localhost:3000/health
```

### 问题 5: 磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的数据卷
docker volume prune

# 查看磁盘使用
docker system df
```

---

## 📊 监控和维护

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 查看数据卷大小
docker volume ls
du -sh /var/lib/docker/volumes/domain-config-hub_mysql-data
```

### 日志轮转

在 docker-compose.yml 中添加日志配置：

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 性能优化

```bash
# 增加 MySQL 内存
# 在 docker-compose.yml 中添加
services:
  mysql:
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb3
      --collation-server=utf8mb3_unicode_ci
      --max_connections=200
      --innodb_buffer_pool_size=512M
```

---

## 📚 相关文档

- [Docker Compose 配置说明](../docker-compose.README.md)
- [Docker 快速开始](./DOCKER_QUICKSTART.md)
- [CI Docker 部署](./CI_DOCKER_SETUP.md)
- [GitHub Secrets 配置](./GITHUB_SECRETS_SETUP.md)

---

**更新时间**: 2026-01-25
