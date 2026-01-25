# Docker Compose 配置说明

本文档详细说明 Docker Compose 配置文件的结构和使用方法。

## 文件说明

### docker-compose.yml

主配置文件，包含应用服务和 MySQL 服务。

**服务列表：**
- `app`: 域名配置服务应用
- `mysql`: MySQL 8.0 数据库
- `redis`: Redis 7 缓存服务（使用 profile，默认不启动）

### docker-compose.redis.yml

Redis 服务覆盖配置，用于启用 Redis 支持。

## 使用方法

### 方式 1: 使用 Make 命令（推荐）

```bash
# 查看所有命令
make help

# 启动服务（不含 Redis）
make up

# 启动服务（含 Redis）
make up-redis

# 查看日志
make logs

# 停止服务
make down
```

### 方式 2: 使用 Docker Compose

```bash
# 启动服务（不含 Redis）
docker-compose up -d

# 启动服务（含 Redis）
docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式 3: 使用快速启动脚本

```bash
# 交互式启动
./scripts/docker-quickstart.sh
```

## 服务配置详解

### 应用服务 (app)

**镜像构建：**
- 使用多阶段构建
- 基于 Node.js 18 Alpine
- 非 root 用户运行

**端口映射：**
- 3000:3000（可通过环境变量 PORT 修改）

**依赖服务：**
- MySQL（必需）
- Redis（可选，使用 docker-compose.redis.yml 时）

**健康检查：**
- 检查 `/health` 端点
- 间隔：30 秒
- 超时：3 秒
- 启动等待：40 秒

**数据卷：**
- `app-logs`: 应用日志目录

### MySQL 服务 (mysql)

**镜像：**
- mysql:8.0

**端口映射：**
- 3306:3306（可通过环境变量 DB_PORT 修改）

**环境变量：**
- `MYSQL_ROOT_PASSWORD`: root 用户密码
- `MYSQL_DATABASE`: 数据库名称
- `MYSQL_USER`: 应用用户名
- `MYSQL_PASSWORD`: 应用用户密码

**数据卷：**
- `mysql-data`: 数据库文件
- `./src/models/migrations/domain.sql`: 初始化脚本

**健康检查：**
- 使用 `mysqladmin ping`
- 间隔：10 秒
- 启动等待：30 秒

**字符集配置：**
- 字符集：utf8mb3
- 排序规则：utf8mb3_unicode_ci

### Redis 服务 (redis)

**镜像：**
- redis:7-alpine

**端口映射：**
- 6379:6379（可通过环境变量 REDIS_PORT 修改）

**数据卷：**
- `redis-data`: Redis 持久化数据

**健康检查：**
- 使用 `redis-cli ping`
- 间隔：10 秒

**启用方式：**
- 使用 profile 机制
- 需要使用 `docker-compose.redis.yml` 覆盖配置

## 环境变量配置

### 应用配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | production | 运行环境 |
| PORT | 3000 | 服务端口 |

### 数据库配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DB_HOST | mysql | 数据库主机（容器内使用服务名） |
| DB_PORT | 3306 | 数据库端口 |
| DB_NAME | domain_config | 数据库名称 |
| DB_USER | root | 数据库用户 |
| DB_PASSWORD | password | 数据库密码 |
| DB_POOL_MIN | 2 | 连接池最小连接数 |
| DB_POOL_MAX | 10 | 连接池最大连接数 |

### Redis 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| REDIS_ENABLED | true | 是否启用 Redis |
| REDIS_HOST | redis | Redis 主机（容器内使用服务名） |
| REDIS_PORT | 6379 | Redis 端口 |
| REDIS_PASSWORD | (空) | Redis 密码 |
| REDIS_TTL | 3600 | 缓存过期时间（秒） |

### 其他配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| LOG_LEVEL | info | 日志级别 |
| RATE_LIMIT_MAX | 100 | 限流最大请求数 |
| ADMIN_PASSWORD | admin123 | 管理界面密码 |

## 网络配置

所有服务使用自定义桥接网络 `domain-config-network`：

- 服务间可通过服务名相互访问
- 例如：应用访问 MySQL 使用 `mysql:3306`
- 例如：应用访问 Redis 使用 `redis:6379`

## 数据持久化

### 数据卷列表

| 卷名 | 用途 | 备份建议 |
|------|------|----------|
| mysql-data | MySQL 数据库文件 | 每日备份 |
| redis-data | Redis 持久化数据 | 可选备份 |
| app-logs | 应用日志文件 | 定期清理 |

### 备份数据

**备份 MySQL：**
```bash
# 使用 Make 命令
make backup-mysql

# 或手动备份
docker-compose exec mysql mysqldump -u root -p domain_config > backup.sql
```

**备份 Redis：**
```bash
docker-compose exec redis redis-cli SAVE
docker cp domain-config-redis:/data/dump.rdb ./redis-backup.rdb
```

### 恢复数据

**恢复 MySQL：**
```bash
docker-compose exec -T mysql mysql -u root -p domain_config < backup.sql
```

**恢复 Redis：**
```bash
docker cp ./redis-backup.rdb domain-config-redis:/data/dump.rdb
docker-compose restart redis
```

## 健康检查

### 应用健康检查

```bash
curl http://localhost:3000/health
```

**响应示例：**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 查看容器健康状态

```bash
docker-compose ps
```

## 日志管理

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f app
docker-compose logs -f mysql
docker-compose logs -f redis

# 最近 100 行
docker-compose logs --tail=100 app
```

### 日志轮转

建议在生产环境配置日志轮转：

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 故障排查

### 应用无法启动

1. 检查 MySQL 是否就绪：
   ```bash
   docker-compose logs mysql
   docker-compose ps mysql
   ```

2. 检查环境变量配置：
   ```bash
   docker-compose config
   ```

3. 查看应用日志：
   ```bash
   docker-compose logs app
   ```

### 数据库连接失败

1. 确认 MySQL 容器运行正常
2. 检查数据库凭据
3. 等待 MySQL 完全启动（约 30 秒）

### Redis 连接失败

1. 确认使用了 `docker-compose.redis.yml`
2. 检查 Redis 容器状态
3. 或设置 `REDIS_ENABLED=false` 禁用 Redis

## 性能优化

### MySQL 优化

```yaml
services:
  mysql:
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb3
      --collation-server=utf8mb3_unicode_ci
      --max_connections=200
      --innodb_buffer_pool_size=256M
      --innodb_log_file_size=64M
```

### Redis 优化

```yaml
services:
  redis:
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 60 1000
```

### 应用资源限制

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

## 安全建议

1. **修改默认密码**
   - 修改 `DB_PASSWORD`
   - 修改 `ADMIN_PASSWORD`
   - 设置 `REDIS_PASSWORD`

2. **限制端口暴露**
   - 生产环境不暴露 MySQL 和 Redis 端口
   - 仅暴露应用端口 3000

3. **使用 secrets**
   - 使用 Docker secrets 管理敏感信息
   - 不要在配置文件中硬编码密码

4. **网络隔离**
   - 使用自定义网络
   - 限制服务间访问

## 扩展部署

### 使用 Docker Swarm

```bash
docker swarm init
docker stack deploy -c docker-compose.yml domain-config
```

### 水平扩展

```bash
docker-compose up -d --scale app=3
```

注意：需要配置负载均衡器（如 Nginx）。

## 更多资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [完整部署指南](docs/DOCKER_DEPLOYMENT.md)
- [项目 README](README.md)
