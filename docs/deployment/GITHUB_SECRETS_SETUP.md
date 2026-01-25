# GitHub Secrets 配置指南

## 📋 概述

GitHub 支持在不同级别配置 Secrets，可以实现跨仓库共享。

---

## 🔐 Secrets 配置级别

### 1. 组织级别 Secrets（推荐用于公用配置）

**适用场景**：
- 多个仓库需要使用相同的凭据
- 团队共享的配置（如 Docker 仓库凭据）
- 统一管理和更新

**配置路径**：
```
GitHub 组织 → Settings → Secrets and variables → Actions → Organization secrets
```

**优点**：
- ✅ 一次配置，多个仓库使用
- ✅ 集中管理，便于更新
- ✅ 可以选择性地授权给特定仓库
- ✅ 减少重复配置

**配置步骤**：

1. **进入组织设置**
   ```
   https://github.com/organizations/YOUR_ORG/settings/secrets/actions
   ```

2. **点击 "New organization secret"**

3. **添加 Secret**
   - Name: `TENCENT_DOCKER_USERNAME`
   - Value: 你的腾讯云容器镜像服务用户名
   - Repository access: 
     - `All repositories` - 所有仓库可用
     - `Private repositories` - 仅私有仓库可用
     - `Selected repositories` - 选择特定仓库

4. **重复添加其他 Secrets**
   - `TENCENT_DOCKER_PASSWORD`
   - `PORTAINER_WEBHOOK_URL`（如果多个项目共用同一个 Portainer）

---

### 2. 仓库级别 Secrets

**适用场景**：
- 仓库特定的配置
- 不需要跨仓库共享的凭据
- 覆盖组织级别的配置

**配置路径**：
```
仓库 → Settings → Secrets and variables → Actions → Repository secrets
```

**优先级**：
- 仓库级别 Secrets 优先级高于组织级别
- 如果同名，仓库级别会覆盖组织级别

---

### 3. 环境级别 Secrets

**适用场景**：
- 不同环境使用不同的配置（如 dev、staging、production）
- 需要审批流程的部署

**配置路径**：
```
仓库 → Settings → Environments → 选择环境 → Environment secrets
```

---

## 🎯 推荐配置方案

### 方案 A：组织级别公用配置（推荐）

适合有多个项目的团队：

#### 组织级别 Secrets（公用）
```
TENCENT_DOCKER_USERNAME     - 腾讯云 Docker 用户名
TENCENT_DOCKER_PASSWORD     - 腾讯云 Docker 密码
```

#### 仓库级别 Secrets（项目特定）
```
PORTAINER_WEBHOOK_URL       - 每个项目的 Portainer Webhook URL
```

**优点**：
- Docker 凭据统一管理
- 每个项目有独立的部署 Webhook
- 便于维护和更新

---

### 方案 B：完全仓库级别配置

适合单个项目或独立团队：

#### 仓库级别 Secrets
```
TENCENT_DOCKER_USERNAME     - 腾讯云 Docker 用户名
TENCENT_DOCKER_PASSWORD     - 腾讯云 Docker 密码
PORTAINER_WEBHOOK_URL       - Portainer Webhook URL
```

**优点**：
- 配置简单直接
- 每个仓库完全独立
- 适合小型项目

---

### 方案 C：环境级别配置

适合需要多环境部署的项目：

#### 组织级别 Secrets（公用）
```
TENCENT_DOCKER_USERNAME     - 腾讯云 Docker 用户名
TENCENT_DOCKER_PASSWORD     - 腾讯云 Docker 密码
```

#### 环境级别 Secrets
```
Environment: production
  PORTAINER_WEBHOOK_URL     - 生产环境 Webhook

Environment: staging
  PORTAINER_WEBHOOK_URL     - 测试环境 Webhook
```

**优点**：
- 支持多环境部署
- 可以添加审批流程
- 更安全的生产部署

---

## 📝 配置示例

### 1. 配置组织级别 Secrets

```bash
# 1. 访问组织设置
https://github.com/organizations/gdgeek/settings/secrets/actions

# 2. 添加 TENCENT_DOCKER_USERNAME
Name: TENCENT_DOCKER_USERNAME
Value: 100012345678
Repository access: All repositories

# 3. 添加 TENCENT_DOCKER_PASSWORD
Name: TENCENT_DOCKER_PASSWORD
Value: your-password-or-token
Repository access: All repositories
```

### 2. 配置仓库级别 Secrets

```bash
# 1. 访问仓库设置
https://github.com/gdgeek/domain-config-hub/settings/secrets/actions

# 2. 添加 PORTAINER_WEBHOOK_URL
Name: PORTAINER_WEBHOOK_URL
Value: https://portainer.example.com/api/webhooks/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 🔍 验证配置

### 在 GitHub Actions 中使用

```yaml
# .github/workflows/ci.yml
jobs:
  docker:
    steps:
      # 使用组织级别 Secret
      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: hkccr.ccs.tencentyun.com
          username: ${{ secrets.TENCENT_DOCKER_USERNAME }}
          password: ${{ secrets.TENCENT_DOCKER_PASSWORD }}
      
      # 使用仓库级别 Secret
      - name: Trigger Webhook
        run: curl -X POST ${{ secrets.PORTAINER_WEBHOOK_URL }}
```

### 检查 Secret 是否可用

在 GitHub Actions 运行日志中，Secret 会被自动隐藏显示为 `***`。

---

## 🛡️ 安全最佳实践

### 1. Secret 命名规范
```
✅ 好的命名：
- TENCENT_DOCKER_USERNAME
- PORTAINER_WEBHOOK_URL
- AWS_ACCESS_KEY_ID

❌ 避免的命名：
- password
- token
- secret
```

### 2. 最小权限原则
- 只授权必要的仓库访问 Secret
- 使用只读令牌（如果可能）
- 定期轮换凭据

### 3. 审计和监控
- 定期检查 Secret 使用情况
- 启用组织审计日志
- 监控异常访问

### 4. 环境隔离
- 生产环境使用独立的 Secret
- 测试环境使用受限权限的凭据
- 开发环境避免使用生产凭据

---

## 🔄 Secret 管理

### 更新 Secret

1. **组织级别**
   ```
   组织 Settings → Secrets → 选择 Secret → Update secret
   ```
   - 更新后立即对所有授权仓库生效

2. **仓库级别**
   ```
   仓库 Settings → Secrets → 选择 Secret → Update secret
   ```
   - 仅影响当前仓库

### 删除 Secret

⚠️ **注意**：删除 Secret 会导致使用它的工作流失败

1. 先确认没有工作流在使用
2. 删除 Secret
3. 更新相关工作流配置

### 轮换 Secret

建议定期轮换敏感凭据：

```bash
# 1. 生成新的凭据
# 2. 更新 GitHub Secret
# 3. 验证工作流正常运行
# 4. 撤销旧凭据
```

---

## 📚 相关文档

- [GitHub Secrets 官方文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [组织级别 Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-an-organization)
- [环境 Secrets](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

---

## 💡 常见问题

### Q: 组织级别和仓库级别 Secret 同名怎么办？
A: 仓库级别优先级更高，会覆盖组织级别的同名 Secret。

### Q: 如何在多个组织间共享 Secret？
A: 无法直接共享，需要在每个组织分别配置。

### Q: Secret 有大小限制吗？
A: 是的，每个 Secret 最大 64 KB。

### Q: 可以在 Pull Request 中使用 Secret 吗？
A: 来自 fork 的 PR 默认无法访问 Secret（安全考虑）。

### Q: 如何调试 Secret 相关问题？
A: 
1. 检查 Secret 名称是否正确
2. 确认仓库有权限访问组织 Secret
3. 查看 Actions 日志（Secret 值会被隐藏）
4. 使用 `echo "Secret exists: ${{ secrets.SECRET_NAME != '' }}"` 检查

---

## 🎯 本项目推荐配置

### 如果你有 GitHub 组织（推荐）

**组织级别配置**：
```
TENCENT_DOCKER_USERNAME
TENCENT_DOCKER_PASSWORD
```

**仓库级别配置**：
```
PORTAINER_WEBHOOK_URL
```

### 如果没有组织（个人仓库）

**仓库级别配置**：
```
TENCENT_DOCKER_USERNAME
TENCENT_DOCKER_PASSWORD
PORTAINER_WEBHOOK_URL
```

---

**更新时间**: 2026-01-25
