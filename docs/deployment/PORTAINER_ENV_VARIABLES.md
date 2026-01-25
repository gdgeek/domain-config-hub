# Portainer 环境变量配置清单

## 必需参数（使用腾讯云数据库）

### 数据库配置（必填）
```
DB_HOST=你的腾讯云MySQL地址
DB_PORT=3306
DB_NAME=domain_config
DB_USER=root
DB_PASSWORD=你的MySQL密码
```

### Redis 配置（必填）
```
REDIS_ENABLED=true
REDIS_HOST=你的腾讯云Redis地址
REDIS_PORT=6379
REDIS_PASSWORD=你的Redis密码
```

### 管理员密码（必填）
```
ADMIN_PASSWORD=你的管理员密码
```

---

## 可选参数（有默认值）

### 服务配置
```
NODE_ENV=production          # 运行环境
PORT=3000                    # 容器内端口（不要改）
```

### 数据库连接池
```
DB_POOL_MIN=2               # 最小连接数
DB_POOL_MAX=10              # 最大连接数
```

### Redis 缓存
```
REDIS_TTL=3600              # 缓存过期时间（秒）
```

### 日志配置
```
LOG_LEVEL=info              # 日志级别: error/warn/info/debug
LOG_FILE=logs/app.log       # 日志文件路径
```

### API 配置
```
API_PREFIX=/api/v1          # API 路径前缀
MAX_PAGE_SIZE=100           # 最大分页大小
DEFAULT_PAGE_SIZE=20        # 默认分页大小
```

### 限流配置
```
RATE_LIMIT_WINDOW_MS=60000  # 限流时间窗口（毫秒）
RATE_LIMIT_MAX=100          # 时间窗口内最大请求数
```

---

## Portainer 完整配置示例

### 1. 环境变量（Environment variables）

在 Portainer Stack 编辑器中，添加以下环境变量：

```yaml
# === 必需配置 ===
# 数据库
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_NAME=domain_config
DB_USER=root
DB_PASSWORD=你的MySQL密码

# Redis
REDIS_ENABLED=true
REDIS_HOST=r-xxxxx.redis.rds.aliyuncs.com
REDIS_PORT=6379
REDIS_PASSWORD=你的Redis密码

# 管理员
ADMIN_PASSWORD=你的管理员密码

# === 可选配置（推荐） ===
NODE_ENV=production
LOG_LEVEL=info
REDIS_TTL=3600
DB_POOL_MIN=2
DB_POOL_MAX=10
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### 2. Docker Compose 配置

```yaml
version: '3.8'

services:
  app:
    image: hkccr.ccs.tencentyun.com/gdgeek/domain:latest
    container_name: domain-config-service
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # 服务配置
      NODE_ENV: production
      PORT: 3000
      
      # 数据库配置（使用腾讯云 MySQL）
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_POOL_MIN: ${DB_POOL_MIN:-2}
      DB_POOL_MAX: ${DB_POOL_MAX:-10}
      
      # Redis 配置（使用腾讯云 Redis）
      REDIS_ENABLED: ${REDIS_ENABLED}
      REDIS_HOST: ${REDIS_HOST}
      REDIS_PORT: ${REDIS_PORT}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      REDIS_TTL: ${REDIS_TTL:-3600}
      
      # 日志配置
      LOG_LEVEL: ${LOG_LEVEL:-info}
      LOG_FILE: logs/app.log
      
      # API 配置
      API_PREFIX: /api/v1
      MAX_PAGE_SIZE: 100
      DEFAULT_PAGE_SIZE: 20
      
      # 限流配置
      RATE_LIMIT_WINDOW_MS: ${RATE_LIMIT_WINDOW_MS:-60000}
      RATE_LIMIT_MAX: ${RATE_LIMIT_MAX:-100}
      
      # 管理界面配置
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    
    volumes:
      - app-logs:/app/logs
    
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      start_period: 10s
      retries: 3
    
    networks:
      - proxy
    
    security_opt:
      - seccomp=unconfined
    
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=proxy"
      - "traefik.http.routers.domain_voxel_cn-secure.entrypoints=websecure"
      - "traefik.http.routers.domain_voxel_cn-secure.rule=Host(`domain.voxel.cn`)"
      - "traefik.http.routers.domain_voxel_cn-secure.middlewares=test-compress@file"

volumes:
  app-logs:
    driver: local

networks:
  proxy:
    external: true
```

---

## 快速配置步骤

### 步骤 1: 准备环境变量

创建一个文本文件，填入你的实际值：

```bash
# 数据库（腾讯云 MySQL）
DB_HOST=你的MySQL地址
DB_PASSWORD=你的MySQL密码

# Redis（腾讯云 Redis）
REDIS_HOST=你的Redis地址
REDIS_PASSWORD=你的Redis密码

# 管理员密码
ADMIN_PASSWORD=你的管理员密码
```

### 步骤 2: 在 Portainer 中配置

1. **进入 Portainer** → Stacks → Add stack
2. **Name**: `domain-config`
3. **Web editor**: 粘贴上面的 Docker Compose 配置
4. **Environment variables**: 添加步骤 1 中的环境变量
5. **Deploy the stack**

### 步骤 3: 配置 Traefik（如果使用）

确保 Traefik labels 中的域名正确：
```yaml
- "traefik.http.routers.domain_voxel_cn-secure.rule=Host(`domain.voxel.cn`)"
```

### 步骤 4: 验证部署

1. 检查容器状态：应该显示 `healthy`
2. 访问健康检查：`https://domain.voxel.cn/health`
3. 访问管理界面：`https://domain.voxel.cn/admin.html`
4. 访问 API 文档：`https://domain.voxel.cn/api-docs`

---

## 安全建议

### 1. 强密码
- MySQL 密码：至少 20 位，包含大小写字母、数字、特殊字符
- Redis 密码：至少 20 位
- 管理员密码：至少 16 位

### 2. 网络安全
- 确保腾讯云数据库的安全组只允许你的服务器 IP 访问
- 使用 VPC 内网连接数据库（更安全、更快）

### 3. 日志级别
- 生产环境使用 `LOG_LEVEL=info` 或 `LOG_LEVEL=warn`
- 调试时临时改为 `LOG_LEVEL=debug`

### 4. 限流配置
- 根据实际流量调整 `RATE_LIMIT_MAX`
- 防止 API 被滥用

---

## 常见问题

### Q1: 容器一直重启？
检查：
1. 数据库连接是否正确（地址、端口、密码）
2. Redis 连接是否正确
3. 查看容器日志：`docker logs domain-config-service`

### Q2: 健康检查失败？
检查：
1. 应用是否正常启动（查看日志）
2. `/health` 端点是否可访问
3. 是否有权限问题（logs 目录）

### Q3: 无法访问管理界面？
检查：
1. Traefik 配置是否正确
2. 域名 DNS 是否指向服务器
3. 防火墙是否开放端口

### Q4: 如何更新配置？
1. 在 Portainer 中编辑 Stack
2. 修改环境变量
3. 点击 "Update the stack"
4. 容器会自动重启并应用新配置

---

## 相关文档

- [Portainer 部署指南](./PORTAINER_DEPLOYMENT_GUIDE.md)
- [数据库初始化指南](./DATABASE_INITIALIZATION_GUIDE.md)
- [Docker Compose 部署](./DOCKER_COMPOSE_DEPLOYMENT.md)
- [快速部署参考](./DEPLOYMENT_QUICK_REFERENCE.md)

---

**最后更新**: 2026-01-25
