# Docker 部署指南

本指南介绍如何使用 Docker 和 Docker Compose 部署域名配置服务。

## 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 使用默认配置启动所有服务

```bash
# 启动应用、MySQL 和 Redis
docker-compose --profile with-redis up -d

# 或者只启动应用和 MySQL（不使用 Redis）
docker-compose up -d
```

### 2. 查看服务状态

```bash
docker-compose ps
```

### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看应用日志
docker-compose logs -f app

# 查看 MySQL 日志
docker-compose logs -f mysql

# 查看 Redis 日志
docker-compose logs -f redis
```

### 4. 停止服务

```bash
docker-compose down
```

### 5. 停止服务并删除数据卷

```bash
docker-compose down -v
```

## 配置说明

### 环境变量配置

创建 `.env` 文件来自定义配置（可选）：

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置
nano .env
```

主要配置项：

```env
# 服务配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_NAME=domain_config
DB_USER=root
DB_PASSWORD=your_secure_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis 配置
REDIS_ENABLED=true
REDIS_PASSWORD=your_redis_password
REDIS_TTL=3600

# 日志配置
LOG_LEVEL=info

# API 配置
MAX_PAGE_SIZE=100
DEFAULT_PAGE_SIZE=20

# 限流配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# 管理界面配置
ADMIN_PASSWORD=your_admin_password
```

### Redis 服务配置

Redis 服务使用 Docker Compose profiles 功能，可以选择性启用：

**启用 Redis（推荐）：**
```bash
docker-compose --profile with-redis up -d
```

**不使用 Redis：**
```bash
# 设置环境变量
export REDIS_ENABLED=false

# 启动服务
docker-compose up -d
```

## 服务架构

```
┌─────────────────────────────────────────────────┐
│                   Docker Host                    │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  domain-config-service (App)               │ │
│  │  Port: 3000                                │ │
│  │  - API 服务                                │ │
│  │  - 健康检查: /health                       │ │
│  │  - 监控指标: /metrics                      │ │
│  │  - API 文档: /api-docs                     │ │
│  └────────────────────────────────────────────┘ │
│           │                    │                 │
│           ▼                    ▼                 │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  MySQL 8.0       │  │  Redis 7         │    │
│  │  Port: 3306      │  │  Port: 6379      │    │
│  │  - 持久化存储    │  │  - 缓存层        │    │
│  └──────────────────┘  └──────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 数据持久化

Docker Compose 配置了以下数据卷：

- `mysql-data`: MySQL 数据库文件
- `redis-data`: Redis 持久化数据
- `app-logs`: 应用日志文件

### 备份数据

**备份 MySQL 数据库：**
```bash
docker-compose exec mysql mysqldump -u root -p domain_config > backup.sql
```

**恢复 MySQL 数据库：**
```bash
docker-compose exec -T mysql mysql -u root -p domain_config < backup.sql
```

**备份 Redis 数据：**
```bash
docker-compose exec redis redis-cli SAVE
docker cp domain-config-redis:/data/dump.rdb ./redis-backup.rdb
```

## 健康检查

所有服务都配置了健康检查：

- **应用服务**: 每 30 秒检查 `/health` 端点
- **MySQL**: 每 10 秒使用 `mysqladmin ping` 检查
- **Redis**: 每 10 秒使用 `redis-cli ping` 检查

查看健康状态：
```bash
docker-compose ps
```

## 网络配置

服务使用自定义桥接网络 `domain-config-network`，确保服务间可以通过服务名相互访问。

## 故障排查

### 应用无法连接到 MySQL

1. 检查 MySQL 是否健康：
   ```bash
   docker-compose ps mysql
   docker-compose logs mysql
   ```

2. 检查数据库凭据是否正确

3. 等待 MySQL 完全启动（约 30 秒）

### 应用无法连接到 Redis

1. 检查 Redis 是否启动：
   ```bash
   docker-compose --profile with-redis ps redis
   ```

2. 如果不需要 Redis，设置 `REDIS_ENABLED=false`

### 查看应用详细日志

```bash
# 进入容器
docker-compose exec app sh

# 查看日志文件
cat logs/app.log
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart app
docker-compose restart mysql
docker-compose restart redis
```

## 生产环境建议

### 1. 安全配置

- 修改所有默认密码
- 使用强密码
- 限制端口暴露（仅暴露必要端口）
- 配置防火墙规则

### 2. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 3. 日志管理

配置日志轮转：

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 监控

- 使用 `/health` 端点进行健康检查
- 使用 `/metrics` 端点集成 Prometheus
- 配置告警规则

### 5. 备份策略

- 定期备份 MySQL 数据库
- 定期备份 Redis 数据（如果启用持久化）
- 测试恢复流程

## 开发环境

### 使用开发模式

```bash
# 设置开发环境变量
export NODE_ENV=development
export LOG_LEVEL=debug

# 启动服务
docker-compose up -d
```

### 挂载源代码（热重载）

修改 `docker-compose.yml` 添加卷挂载：

```yaml
services:
  app:
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    command: npm run dev
```

## 性能优化

### 1. MySQL 优化

```yaml
services:
  mysql:
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb3
      --collation-server=utf8mb3_unicode_ci
      --max_connections=200
      --innodb_buffer_pool_size=256M
```

### 2. Redis 优化

```yaml
services:
  redis:
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 60 1000
```

## 扩展部署

### 使用 Docker Swarm

```bash
# 初始化 Swarm
docker swarm init

# 部署服务栈
docker stack deploy -c docker-compose.yml domain-config
```

### 使用 Kubernetes

参考 `k8s/` 目录中的 Kubernetes 配置文件（如果有）。

## 常用命令参考

```bash
# 构建镜像
docker-compose build

# 强制重新构建
docker-compose build --no-cache

# 启动服务（后台）
docker-compose up -d

# 启动服务（前台，查看日志）
docker-compose up

# 停止服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器和数据卷
docker-compose down -v

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]

# 进入容器
docker-compose exec app sh
docker-compose exec mysql bash
docker-compose exec redis sh

# 执行命令
docker-compose exec app npm run migrate
docker-compose exec mysql mysql -u root -p

# 查看资源使用
docker stats
```

## 更多信息

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [项目 README](../README.md)
