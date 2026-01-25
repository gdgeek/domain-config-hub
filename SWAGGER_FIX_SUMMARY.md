# Swagger UI 修复总结

## 问题描述
用户反馈 Swagger UI (`http://localhost:3000/api-docs`) 中看不到任何接口，包括 Domains 和 Configs 标签下的接口。

## 根本原因
在 `src/config/swagger.ts` 中，`apis` 配置指向的是 `./src/routes/*.ts`，但在 Docker 生产环境中，代码已经被编译成 JavaScript 并放在 `dist` 目录中。Swagger JSDoc 无法找到源文件，因此没有扫描到任何接口注释。

## 解决方案

### 1. 修复 Swagger 配置路径
修改 `src/config/swagger.ts`，根据环境变量动态选择扫描路径：

```typescript
apis: process.env.NODE_ENV === 'production' 
  ? [
      './dist/routes/*.js',
      './dist/app.js',
    ]
  : [
      './src/routes/*.ts',
      './src/app.ts',
    ],
```

### 2. 添加 Configs 标签定义
在 Swagger 配置中添加缺失的 `Configs` 标签：

```typescript
tags: [
  {
    name: 'Domains',
    description: '域名配置管理接口',
  },
  {
    name: 'Configs',
    description: '配置内容管理接口',
  },
  // ...
]
```

### 3. 添加 Config Schema 定义
在 `components.schemas` 中添加 `Config` 和 `ConfigInput` 的完整定义，用于 Swagger UI 显示。

### 4. 添加 Swagger JSON 端点
在 `src/app.ts` 中添加独立的 JSON 端点，方便调试：

```typescript
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});
```

### 5. 移除错误的 Swagger 注释
删除 `src/routes/DomainRoutes.ts` 文件顶部的错误 `@swagger` 注释块。

## 验证结果

### API 路径扫描成功
```bash
$ curl -s http://localhost:3000/api-docs.json | jq '.paths | keys'
[
  "/api/v1/configs",
  "/api/v1/configs/{id}",
  "/api/v1/domains",
  "/api/v1/domains/{id}",
  "/api/v1/domains/{domain}",
  "/api/v1/domains/{id}"
]
```

### 标签定义正确
```bash
$ curl -s http://localhost:3000/api-docs.json | jq '.tags'
[
  {
    "name": "Domains",
    "description": "域名配置管理接口"
  },
  {
    "name": "Configs",
    "description": "配置内容管理接口"
  },
  {
    "name": "Health",
    "description": "健康检查和监控接口"
  },
  {
    "name": "Admin",
    "description": "管理界面接口"
  }
]
```

### 接口详情完整
```bash
$ curl -s http://localhost:3000/api-docs.json | jq '.paths["/api/v1/domains"].get.summary'
"获取域名列表或通过 URL 查询配置"
```

## 访问方式

1. **Swagger UI**: http://localhost:3000/api-docs
   - 可视化 API 文档
   - 支持在线测试接口
   - 支持 JWT 认证（点击右上角 "Authorize" 按钮）

2. **Swagger JSON**: http://localhost:3000/api-docs.json
   - 原始 OpenAPI 规范 JSON
   - 用于调试和集成

## 使用 Swagger UI 测试接口

### 1. 测试公开接口（GET 请求）
直接点击接口 → "Try it out" → 填写参数 → "Execute"

示例：
- GET `/api/v1/domains?url=baidu.com`
- GET `/api/v1/domains/{domain}`
- GET `/api/v1/configs`

### 2. 测试需要认证的接口（POST/PUT/DELETE）

步骤：
1. 点击右上角 "Authorize" 按钮
2. 在弹出框中输入 JWT 令牌（通过 `/api/v1/auth/login` 获取）
3. 点击 "Authorize" 确认
4. 现在可以测试需要认证的接口了

示例：
- POST `/api/v1/domains` - 创建域名
- PUT `/api/v1/domains/{id}` - 更新域名
- DELETE `/api/v1/domains/{id}` - 删除域名

## 注意事项

1. **环境变量**: 确保 Docker 容器中设置了 `NODE_ENV=production`
2. **重新构建**: 修改 Swagger 配置后需要重新构建 Docker 镜像
3. **认证令牌**: 测试写接口前需要先登录获取 JWT 令牌

## 相关文件

- `src/config/swagger.ts` - Swagger 配置
- `src/routes/DomainRoutes.ts` - 域名路由和 Swagger 注释
- `src/routes/ConfigRoutes.ts` - 配置路由和 Swagger 注释
- `src/app.ts` - 应用配置和 Swagger UI 挂载
