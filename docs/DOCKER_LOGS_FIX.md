# Docker Logs 目录权限问题修复

## 问题描述

应用在 Docker 容器中启动失败，错误信息：

```
Error: EACCES: permission denied, mkdir 'logs'
    at Object.mkdirSync (node:fs:1363:26)
    at ensureLogDirectory (/app/dist/config/logger.js:31:22)
```

## 根本原因

1. **权限问题**：应用以 `nodejs` 用户（非 root）运行
2. **目录缺失**：Dockerfile 中没有预先创建 `logs` 目录
3. **运行时创建失败**：nodejs 用户没有权限在 `/app` 下创建目录

## 解决方案

在 Dockerfile 中，**在切换到 nodejs 用户之前**创建 logs 目录并设置正确的所有权：

```dockerfile
# Copy public files for admin interface
COPY --chown=nodejs:nodejs public ./public

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs
```

## 关键点

1. **顺序很重要**：必须在 `USER nodejs` 之前创建目录
2. **设置所有权**：使用 `chown -R nodejs:nodejs logs` 确保 nodejs 用户有写权限
3. **递归创建**：使用 `mkdir -p` 确保父目录也会被创建

## 对比参考项目

参考 `ai-model-proxy` 项目，发现其 Dockerfile 也有类似的目录权限处理：

- 在切换用户前创建必要的目录
- 设置正确的所有权
- 确保应用运行时有足够的权限

## 验证步骤

1. **重新构建镜像**：
   ```bash
   docker build -t domain-config:test .
   ```

2. **运行容器**：
   ```bash
   docker run -p 3000:3000 domain-config:test
   ```

3. **检查日志**：
   - 应用应该正常启动
   - 不应该出现 EACCES 错误
   - logs 目录应该被成功创建

4. **检查健康状态**：
   ```bash
   docker ps
   ```
   - 状态应该显示为 `healthy` 而不是 `running`

## 相关文件

- `Dockerfile` - 修复了 logs 目录权限
- `src/config/logger.ts` - 日志配置，会尝试创建 logs 目录
- `docs/PORTAINER_DEPLOYMENT_GUIDE.md` - Portainer 部署指南

## 下一步

1. 等待 CI 构建新镜像
2. 在 Portainer 中更新服务
3. 验证健康检查显示 `healthy`
4. 确认应用正常运行

## 相关问题

- 健康检查配置：`start-period=10s`（已优化）
- 健康检查端点：`/health`
- 应用端口：3000

---

**修复时间**: 2026-01-25  
**影响范围**: Docker 部署  
**优先级**: 高（阻塞部署）
