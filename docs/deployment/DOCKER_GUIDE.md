# Docker 部署指南

本指南介绍如何使用 Docker 构建和运行域名配置服务。

## Dockerfile 特性

我们的 Dockerfile 采用了以下生产级最佳实践：

### 1. 多阶段构建 (Multi-stage Build)

Dockerfile 使用两个阶段：

- **Builder 阶段**: 安装所有依赖并编译 TypeScript 代码
- **Production 阶段**: 仅包含运行时所需的文件，大幅减小镜像体积

这种方式可以：
- 减少最终镜像大小（不包含 devDependencies 和源代码）
- 提高安全性（减少攻击面）
- 加快部署速度

### 2. 非 Root 用户运行

容器以非特权用户 `nodejs` (UID: 1001) 运行，而不是 root 用户。这是重要的安全最佳实践：

- 限制容器内的权限
- 防止潜在的权限提升攻击
- 符合安全合规要求

### 3. 健康检查 (Health Check)

内置健康检查机制，每 30 秒检查一次 `/health` 端点：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3
```

参数说明：
- `interval`: 检查间隔时间
- `timeout`: 单次检查超时时间
- `start-period`: 容器启动后的宽限期
- `retries`: 失败重试次数

### 4. 信号处理

使用 `dumb-init` 作为 PID 1 进程，确保：
- 正确处理 SIGTERM/SIGINT 信号
- 支持优雅关闭
- 清理僵尸进程

## 构建镜像

### 基础构建

```bash
docker build -t domain-config-service:latest .
```

### 指定版本标签

```bash
docker build -t domain-config-service:1.0.0 .
```

### 构建特定阶段（用于调试）

```bash
# 仅构建 builder 阶段
docker build --target builder -t domain-config-service:builder .
```

## 运行容器

### 基础运行

```bash
docker run -d \
  --name domain-config-service \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=mysql \
  -e DB_PORT=3306 \
  -e DB_NAME=domain_config \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  domain-config-service:latest
```

### 使用环境变量文件

```bash
docker run -d \
  --name domain-config-service \
  -p 3000:3000 \
  --env-file .env \
  domain-config-service:latest
```

### 启用 Redis 缓存

```bash
docker run -d \
  --name domain-config-service \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=mysql \
  -e DB_PORT=3306 \
  -e DB_NAME=domain_config \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  -e REDIS_ENABLED=true \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  domain-config-service:latest
```

## 健康检查

### 查看容器健康状态

```bash
docker ps
```

健康状态会显示在 STATUS 列：
- `starting`: 启动中（在 start-period 内）
- `healthy`: 健康
- `unhealthy`: 不健康

### 查看健康检查日志

```bash
docker inspect --format='{{json .State.Health}}' domain-config-service | jq
```

### 手动测试健康检查

```bash
docker exec domain-config-service curl http://localhost:3000/health
```

## 日志管理

### 查看容器日志

```bash
# 查看所有日志
docker logs domain-config-service

# 实时跟踪日志
docker logs -f domain-config-service

# 查看最近 100 行
docker logs --tail 100 domain-config-service
```

### 日志驱动配置

使用 JSON 日志驱动（推荐用于生产环境）：

```bash
docker run -d \
  --name domain-config-service \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  -p 3000:3000 \
  domain-config-service:latest
```

## 优雅关闭

容器支持优雅关闭，正确处理正在进行的请求：

```bash
# 发送 SIGTERM 信号，等待优雅关闭
docker stop domain-config-service

# 强制停止（不推荐）
docker kill domain-config-service
```

## 资源限制

### 限制 CPU 和内存

```bash
docker run -d \
  --name domain-config-service \
  --cpus="1.0" \
  --memory="512m" \
  --memory-swap="512m" \
  -p 3000:3000 \
  domain-config-service:latest
```

### 推荐的生产环境资源配置

- **CPU**: 1-2 核
- **内存**: 512MB - 1GB
- **磁盘**: 100MB（镜像大小约 150MB）

## 网络配置

### 创建自定义网络

```bash
# 创建网络
docker network create domain-config-network

# 在网络中运行容器
docker run -d \
  --name domain-config-service \
  --network domain-config-network \
  -p 3000:3000 \
  domain-config-service:latest
```

## 数据持久化

### 挂载日志目录

```bash
docker run -d \
  --name domain-config-service \
  -v $(pwd)/logs:/app/logs \
  -p 3000:3000 \
  domain-config-service:latest
```

## 故障排查

### 进入容器调试

```bash
# 使用 sh（alpine 镜像没有 bash）
docker exec -it domain-config-service sh
```

### 检查文件权限

```bash
docker exec domain-config-service ls -la /app
```

### 检查进程

```bash
docker exec domain-config-service ps aux
```

### 检查环境变量

```bash
docker exec domain-config-service env
```

## 镜像优化

当前 Dockerfile 已经包含以下优化：

1. ✅ 使用 Alpine Linux 基础镜像（体积小）
2. ✅ 多阶段构建（减少最终镜像大小）
3. ✅ 使用 `npm ci` 而不是 `npm install`（更快、更可靠）
4. ✅ 移除 devDependencies
5. ✅ 使用 .dockerignore 排除不必要的文件
6. ✅ 合理的层缓存顺序（先复制 package.json）

### 查看镜像大小

```bash
docker images domain-config-service
```

预期镜像大小：约 150-200MB

## 安全建议

1. ✅ **非 root 用户**: 已配置
2. ✅ **最小化基础镜像**: 使用 Alpine
3. ✅ **健康检查**: 已配置
4. ✅ **信号处理**: 使用 dumb-init
5. 🔒 **定期更新**: 定期更新基础镜像和依赖
6. 🔒 **扫描漏洞**: 使用 `docker scan` 或 Trivy

### 扫描镜像漏洞

```bash
# 使用 Docker 内置扫描
docker scan domain-config-service:latest

# 或使用 Trivy
trivy image domain-config-service:latest
```

## 生产环境部署清单

在生产环境部署前，请确认：

- [ ] 使用环境变量或密钥管理系统管理敏感信息
- [ ] 配置适当的资源限制
- [ ] 启用健康检查
- [ ] 配置日志收集和监控
- [ ] 设置自动重启策略（`--restart=unless-stopped`）
- [ ] 使用容器编排工具（Docker Compose、Kubernetes 等）
- [ ] 配置网络隔离
- [ ] 定期备份数据库
- [ ] 实施镜像扫描和更新策略

## 下一步

- 查看 [docker-compose.yml](../docker-compose.yml) 了解完整的多容器部署
- 查看 [README.md](../README.md) 了解应用配置
- 查看 [DATABASE_MIGRATION_QUICKSTART.md](./DATABASE_MIGRATION_QUICKSTART.md) 了解数据库迁移
