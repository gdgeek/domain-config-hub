# 🔐 登录信息

## 管理界面登录

### 访问地址
```
http://localhost:3000/admin/admin.html
```

### 登录密码
```
admin123
```

## 问题已修复

之前密码验证失败的原因是 **AdminRoutes 没有注册到应用中**。

### 修复内容
在 `src/app.ts` 中添加了：

1. 导入 AdminRoutes
```typescript
import adminRoutes from './routes/AdminRoutes';
```

2. 注册路由
```typescript
app.use(`${config.apiPrefix}/auth`, adminRoutes);
```

### 验证
```bash
# 测试登录 API
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin123"}'

# 返回
{
  "success": true,
  "token": "admin123",
  "message": "登录成功"
}
```

## 现在可以正常登录了！

1. 打开浏览器访问: http://localhost:3000/admin/admin.html
2. 输入密码: `admin123`
3. 点击登录

## 修改密码

如需修改密码，编辑 `.env` 文件：

```bash
# 修改这一行
ADMIN_PASSWORD=你的新密码
```

然后重启应用容器：

```bash
docker-compose --profile with-redis restart app
```

## 安全建议

⚠️ **生产环境部署时，请务必修改默认密码！**

建议使用强密码：
- 至少 12 个字符
- 包含大小写字母、数字和特殊字符
- 不要使用常见密码

## API 端点

### 登录
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "password": "admin123"
}
```

### 验证
```
POST /api/v1/auth/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "password": "admin123"
}
```

## 其他访问地址

- **API 文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health
- **监控指标**: http://localhost:3000/metrics
