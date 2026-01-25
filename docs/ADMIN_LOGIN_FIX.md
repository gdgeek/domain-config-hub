# Admin 登录认证修复

## 问题描述

编辑域名时出现 `403 Forbidden` 错误：
```
PUT http://localhost:3000/api/v1/domains/12 403 (Forbidden)
{"error":{"code":"INVALID_TOKEN","message":"无效或过期的认证令牌。请重新登录。"}}
```

## 根本原因

1. **系统使用 JWT 认证**：所有写操作（POST/PUT/DELETE）需要有效的 JWT token
2. **旧的 fallback 逻辑**：admin.html 登录失败时会使用密码本身作为 token（不安全）
3. **localStorage 中存储了无效 token**：用户浏览器中可能存储了旧的密码而不是 JWT token

## 修复内容

### 1. 移除不安全的 fallback 逻辑

**修改前**:
```javascript
try {
    // ... 登录请求
    if (response.ok) {
        authToken = data.token || password;  // ❌ 不安全的 fallback
    }
} catch (error) {
    authToken = password;  // ❌ 登录失败时使用密码
    showMainContainer();   // ❌ 直接显示主界面
}
```

**修改后**:
```javascript
try {
    // ... 登录请求
    if (response.ok) {
        authToken = data.token;  // ✅ 只使用 JWT token
    } else {
        showLoginError('密码错误');  // ✅ 显示错误
    }
} catch (error) {
    showLoginError('登录失败，请检查网络连接');  // ✅ 显示错误
}
```

### 2. 更新 Docker 容器

```bash
docker cp public/admin.html domain-config-service:/app/public/admin.html
```

## 用户操作步骤

### 方法 1: 清除 localStorage 并重新登录

1. 打开浏览器开发者工具（F12）
2. 进入 Console 标签
3. 执行以下命令清除旧 token：
   ```javascript
   localStorage.removeItem('adminToken');
   location.reload();
   ```
4. 重新登录（使用密码：`admin123`）

### 方法 2: 使用隐私模式

1. 打开浏览器的隐私/无痕模式
2. 访问 http://localhost:3000/admin/admin.html
3. 登录（使用密码：`admin123`）

### 方法 3: 清除浏览器数据

1. 浏览器设置 → 清除浏览数据
2. 选择"Cookie 和其他网站数据"
3. 清除数据
4. 重新访问并登录

## 验证

### 1. 测试登录接口
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin123"}' | jq '.'
```

**预期响应**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "登录成功"
}
```

### 2. 测试更新域名
```bash
# 先获取 token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin123"}' | jq -r '.token')

# 使用 token 更新域名
curl -X PUT http://localhost:3000/api/v1/domains/12 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"configId": 1, "homepage": "https://test.com"}' | jq '.'
```

**预期响应**: 200 OK，返回更新后的域名数据

## 安全说明

### JWT Token 认证流程

1. **登录**: POST `/api/v1/auth/login` 获取 JWT token
2. **存储**: token 存储在 localStorage 中
3. **使用**: 所有写操作请求头中包含 `Authorization: Bearer <token>`
4. **验证**: 服务器验证 token 的有效性和过期时间
5. **过期**: token 默认 24 小时后过期，需要重新登录

### 安全特性

- ✅ JWT token 有过期时间（24小时）
- ✅ 写操作必须认证
- ✅ 读操作公开访问
- ✅ token 使用 HMAC-SHA256 签名
- ✅ 密码不会直接用作认证凭证

## 相关配置

### 环境变量

```bash
# JWT 密钥（默认使用 ADMIN_PASSWORD）
JWT_SECRET=your-secret-key

# JWT 过期时间（默认 24 小时）
JWT_EXPIRES_IN=24h

# 管理员密码
ADMIN_PASSWORD=admin123
```

### 修改密码

修改 `.env` 文件中的 `ADMIN_PASSWORD`，然后重启服务：
```bash
docker-compose restart
```

## 故障排查

### 问题：登录后仍然 403

**原因**: localStorage 中的 token 可能已过期

**解决**:
```javascript
// 在浏览器控制台执行
localStorage.removeItem('adminToken');
location.reload();
```

### 问题：登录接口返回 404

**原因**: 路由未正确配置

**检查**: 确认 SessionRoutes 已在 app.ts 中注册

### 问题：token 验证失败

**原因**: JWT_SECRET 不匹配

**检查**: 确认环境变量 JWT_SECRET 或 ADMIN_PASSWORD 正确设置

## 相关文档

- [认证实现总结](./AUTH_IMPLEMENTATION_SUMMARY.md)
- [管理界面使用指南](./docs/ADMIN_UI_GUIDE.md)
- [API 使用指南](./API_USAGE_GUIDE.md)
