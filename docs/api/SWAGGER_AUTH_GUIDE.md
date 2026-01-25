# Swagger UI 认证使用指南

## 问题说明

之前 Swagger UI 无法测试 POST/PUT/DELETE 接口，是因为：
1. 没有配置 JWT 认证的安全定义
2. 写操作接口没有标记需要认证
3. 用户不知道如何在 Swagger UI 中添加认证令牌

现在已经全部修复！

## 如何使用 Swagger UI 测试 API

### 1. 访问 Swagger UI
打开浏览器访问：http://localhost:3000/api-docs

### 2. 获取认证令牌

#### 方法 A：通过 Swagger UI 登录
1. 在 Swagger UI 中找到 **Admin** 标签
2. 展开 `POST /api/v1/auth/login` 接口
3. 点击 **Try it out**
4. 输入密码（默认：`admin123`）：
   ```json
   {
     "password": "admin123"
   }
   ```
5. 点击 **Execute**
6. 复制响应中的 `token` 值

#### 方法 B：通过命令行获取
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin123"}'
```

响应示例：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "登录成功"
}
```

### 3. 在 Swagger UI 中添加认证令牌

1. 在 Swagger UI 页面右上角找到 **Authorize** 按钮（🔓 图标）
2. 点击 **Authorize** 按钮
3. 在弹出的对话框中，找到 **bearerAuth (http, Bearer)** 部分
4. 在 **Value** 输入框中粘贴你的令牌（**只需要令牌本身，不要加 "Bearer " 前缀**）
5. 点击 **Authorize** 按钮
6. 点击 **Close** 关闭对话框

现在你会看到 🔓 图标变成了 🔒，表示已经认证成功！

### 4. 测试需要认证的接口

现在你可以测试所有需要认证的接口了：

#### 创建域名（POST /api/v1/domains）
1. 展开 `POST /api/v1/domains` 接口
2. 点击 **Try it out**
3. 输入请求数据：
   ```json
   {
     "domain": "test.com",
     "configId": 1
   }
   ```
4. 点击 **Execute**
5. 查看响应（应该返回 201 Created）

#### 更新域名（PUT /api/v1/domains/{id}）
1. 展开 `PUT /api/v1/domains/{id}` 接口
2. 点击 **Try it out**
3. 输入域名 ID（例如：1）
4. 输入更新数据：
   ```json
   {
     "configId": 2
   }
   ```
5. 点击 **Execute**
6. 查看响应（应该返回 200 OK）

#### 删除域名（DELETE /api/v1/domains/{id}）
1. 展开 `DELETE /api/v1/domains/{id}` 接口
2. 点击 **Try it out**
3. 输入域名 ID（例如：1）
4. 点击 **Execute**
5. 查看响应（应该返回 200 OK）

### 5. 测试公开接口（无需认证）

以下接口无需认证即可访问：

- `GET /api/v1/domains` - 获取域名列表
- `GET /api/v1/domains/{domain}` - 通过域名获取配置
- `GET /api/v1/domains/{id}` - 通过 ID 获取域名
- `GET /api/v1/configs` - 获取配置列表
- `GET /api/v1/configs/{id}` - 获取配置详情
- `GET /health` - 健康检查

这些接口可以直接点击 **Try it out** 和 **Execute** 测试，无需添加认证令牌。

## 接口认证要求总结

### 需要认证的接口（🔒）
- `POST /api/v1/domains` - 创建域名
- `PUT /api/v1/domains/{id}` - 更新域名
- `DELETE /api/v1/domains/{id}` - 删除域名
- `POST /api/v1/configs` - 创建配置
- `PUT /api/v1/configs/{id}` - 更新配置
- `DELETE /api/v1/configs/{id}` - 删除配置

### 无需认证的接口（🔓）
- 所有 GET 请求
- `POST /api/v1/auth/login` - 登录接口
- `GET /health` - 健康检查
- `GET /metrics` - 监控指标

## 常见问题

### Q1: 为什么我的请求返回 401 Unauthorized？
**A**: 可能的原因：
1. 没有添加认证令牌 - 点击右上角的 **Authorize** 按钮添加令牌
2. 令牌格式错误 - 只需要粘贴令牌本身，不要加 "Bearer " 前缀
3. 令牌已过期 - 重新登录获取新令牌（默认有效期 24 小时）

### Q2: 为什么我的请求返回 403 Forbidden？
**A**: 令牌无效或已过期，请重新登录获取新令牌。

### Q3: 如何退出登录？
**A**: 
1. 点击右上角的 **Authorize** 按钮（🔒 图标）
2. 点击 **Logout** 按钮
3. 点击 **Close** 关闭对话框

### Q4: 令牌有效期是多久？
**A**: 默认 24 小时。可以通过环境变量 `JWT_EXPIRES_IN` 配置。

### Q5: 如何修改管理员密码？
**A**: 在 `.env` 文件中修改 `ADMIN_PASSWORD` 的值，然后重启服务。

## 技术实现细节

### Swagger 配置更新
在 `src/config/swagger.ts` 中添加了：
```typescript
components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT 认证令牌...',
    },
  },
  // ...
}
```

### 路由注释更新
在需要认证的接口上添加了：
```typescript
/**
 * @swagger
 * /api/v1/domains:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     // ...
 */
```

### Swagger UI 配置
在 `swaggerUiOptions` 中启用了：
- `persistAuthorization: true` - 保持认证状态
- `tryItOutEnabled: true` - 启用 Try it out 功能

## 相关链接

- Swagger UI: http://localhost:3000/api-docs
- 管理界面: http://localhost:3000/admin
- 健康检查: http://localhost:3000/health
- API 文档: 本文档

## 安全提示

1. **生产环境必须修改默认密码**
2. **使用 HTTPS 传输令牌**
3. **定期轮换 JWT 密钥**
4. **监控异常认证尝试**
5. **不要在公开场合分享令牌**
