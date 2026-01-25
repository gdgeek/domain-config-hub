# Docker 快速开始

## 快速构建和运行

### 1. 构建镜像

```bash
docker build -t domain-config-service:latest .
```

### 2. 运行容器（开发环境）

```bash
docker run -d \
  --name domain-config-service \
  -p 3000:3000 \
  -e NODE_ENV=development \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_NAME=domain_config \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  domain-config-service:latest
```

### 3. 查看日志

```bash
docker logs -f domain-config-service
```

### 4. 检查健康状态

```bash
docker ps
# 或
curl http://localhost:3000/health
```

### 5. 停止容器

```bash
docker stop domain-config-service
docker rm domain-config-service
```

## 使用 Docker Compose（推荐）

等待 task 10.2 完成后，可以使用：

```bash
docker-compose up -d
```

## Dockerfile 特性总结

✅ **多阶段构建**: 减小镜像体积，提高安全性  
✅ **非 root 用户**: 以 nodejs (UID: 1001) 用户运行  
✅ **健康检查**: 自动检测服务健康状态  
✅ **信号处理**: 使用 dumb-init 支持优雅关闭  
✅ **优化构建**: 使用 .dockerignore 排除不必要文件  

## 镜像信息

- **基础镜像**: node:18-alpine
- **预期大小**: ~150-200MB
- **暴露端口**: 3000
- **健康检查**: /health 端点

## 更多信息

详细文档请参考 [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)
