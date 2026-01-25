# RESTful API 快速参考对比

## 📊 当前 vs 改进后对比

### Domains API

| 操作 | 当前设计 | 问题 | 改进后 | 状态 |
|------|---------|------|--------|------|
| 获取列表 | `GET /domains` | ✅ 正确 | `GET /domains` | ✅ |
| 获取列表（分页） | `GET /domains?page=1&pageSize=20` | ✅ 正确 | `GET /domains?page=1&pageSize=20` | ✅ |
| 通过域名查询 | `GET /domains?url=baidu.com` | ⚠️ 返回单个对象 | `GET /domains?domain=baidu.com` | 🔄 返回列表 |
| 通过域名查询 | `GET /domains/{domain}` | ❌ 路径冲突 | `GET /domains?domain={domain}` | 🔄 改为查询参数 |
| 通过 ID 获取 | `GET /domains/id/{id}` | ❌ 路径不标准 | `GET /domains/{id}` | 🔄 标准化 |
| 通过 ID 获取 | `GET /domains/{id}` | ⚠️ 与域名冲突 | `GET /domains/{id}` | ✅ 保留 |
| 创建域名 | `POST /domains` | ✅ 正确 | `POST /domains` | ✅ |
| 更新域名 | `PUT /domains/{id}` | ✅ 正确 | `PUT /domains/{id}` | ✅ |
| 部分更新 | - | ❌ 不支持 | `PATCH /domains/{id}` | ➕ 新增 |
| 删除域名 | `DELETE /domains/{id}` | ⚠️ 返回 200 | `DELETE /domains/{id}` | 🔄 返回 204 |

### Configs API

| 操作 | 当前设计 | 问题 | 改进后 | 状态 |
|------|---------|------|--------|------|
| 获取列表 | `GET /configs` | ✅ 正确 | `GET /configs` | ✅ |
| 通过 ID 获取 | `GET /configs/{id}` | ✅ 正确 | `GET /configs/{id}` | ✅ |
| 创建配置 | `POST /configs` | ✅ 正确 | `POST /configs` | ✅ |
| 更新配置 | `PUT /configs/{id}` | ✅ 正确 | `PUT /configs/{id}` | ✅ |
| 部分更新 | - | ❌ 不支持 | `PATCH /configs/{id}` | ➕ 新增 |
| 删除配置 | `DELETE /configs/{id}` | ⚠️ 返回 200 | `DELETE /configs/{id}` | 🔄 返回 204 |

### Auth API

| 操作 | 当前设计 | 问题 | 改进后 | 状态 |
|------|---------|------|--------|------|
| 登录 | `POST /auth/login` | ⚠️ 使用动词 | `POST /sessions` | 🔄 资源化 |
| 登出 | - | ❌ 不支持 | `DELETE /sessions` | ➕ 新增 |
| 获取会话 | - | ❌ 不支持 | `GET /sessions/current` | ➕ 新增 |

---

## 🔧 具体修改示例

### 示例 1: 通过域名查询

#### 当前（不推荐）
```bash
# 返回单个对象
GET /api/v1/domains?url=baidu.com

Response:
{
  "domain": "baidu.com",
  "homepage": "https://www.baidu.com",
  "config": {...}
}
```

#### 改进后（推荐）
```bash
# 返回列表格式（统一）
GET /api/v1/domains?domain=baidu.com

Response:
{
  "data": [
    {
      "domain": "baidu.com",
      "homepage": "https://www.baidu.com",
      "config": {...}
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 1,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 示例 2: 通过 ID 获取

#### 当前（不标准）
```bash
GET /api/v1/domains/id/123
```

#### 改进后（标准）
```bash
GET /api/v1/domains/123
```

---

### 示例 3: 删除操作

#### 当前
```bash
DELETE /api/v1/domains/123

Response: 200 OK
{
  "message": "域名删除成功"
}
```

#### 改进后（选项 A - 推荐）
```bash
DELETE /api/v1/domains/123

Response: 204 No Content
(无响应体)
```

#### 改进后（选项 B）
```bash
DELETE /api/v1/domains/123

Response: 200 OK
{
  "data": {
    "id": 123,
    "domain": "example.com",
    ...
  }
}
```

---

### 示例 4: 认证

#### 当前
```bash
POST /api/v1/auth/login
{
  "password": "admin123"
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGc...",
  "message": "登录成功"
}
```

#### 改进后（选项 A - 会话资源）
```bash
POST /api/v1/sessions
{
  "password": "admin123"
}

Response: 201 Created
{
  "data": {
    "token": "eyJhbGc...",
    "tokenType": "Bearer",
    "expiresIn": 86400
  }
}
```

#### 改进后（选项 B - OAuth 2.0 风格）
```bash
POST /api/v1/token
{
  "grant_type": "password",
  "password": "admin123"
}

Response: 200 OK
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

---

## 📋 HTTP 状态码使用指南

### 成功响应 (2xx)

| 状态码 | 含义 | 使用场景 | 响应体 |
|--------|------|---------|--------|
| 200 OK | 成功 | GET, PUT, PATCH | 有 |
| 201 Created | 创建成功 | POST | 有 + Location 头 |
| 204 No Content | 成功无内容 | DELETE | 无 |

### 客户端错误 (4xx)

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 400 Bad Request | 请求格式错误 | JSON 格式错误、缺少必需参数 |
| 401 Unauthorized | 未认证 | 缺少或无效的认证令牌 |
| 403 Forbidden | 无权限 | 已认证但无权访问资源 |
| 404 Not Found | 资源不存在 | 请求的资源 ID 不存在 |
| 409 Conflict | 资源冲突 | 创建重复资源、并发冲突 |
| 422 Unprocessable Entity | 语义错误 | 业务规则验证失败 |
| 429 Too Many Requests | 请求过多 | 超过速率限制 |

### 服务器错误 (5xx)

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 500 Internal Server Error | 服务器错误 | 未预期的服务器错误 |
| 503 Service Unavailable | 服务不可用 | 服务维护、过载 |

---

## 🎯 RESTful 最佳实践清单

### ✅ 应该做的

- ✅ 使用名词表示资源（`/domains` 而不是 `/getDomains`）
- ✅ 使用复数形式（`/domains` 而不是 `/domain`）
- ✅ 使用 HTTP 方法表示操作（GET, POST, PUT, PATCH, DELETE）
- ✅ 使用正确的 HTTP 状态码
- ✅ 使用查询参数进行过滤、排序、分页
- ✅ 使用路径参数表示资源 ID
- ✅ 返回统一的 JSON 格式
- ✅ 提供清晰的错误消息
- ✅ 支持 CORS（如果需要跨域访问）
- ✅ 实现适当的认证和授权
- ✅ 版本化 API（`/api/v1/`）
- ✅ 提供完整的 API 文档

### ❌ 不应该做的

- ❌ 在 URL 中使用动词（`/login`, `/getUser`）
- ❌ 在 URL 中使用文件扩展名（`/users.json`）
- ❌ 混合使用单数和复数
- ❌ 使用不一致的命名约定
- ❌ 返回不一致的响应格式
- ❌ 忽略 HTTP 状态码的语义
- ❌ 在 GET 请求中修改数据
- ❌ 在 URL 中包含敏感信息
- ❌ 返回过多或过少的数据
- ❌ 忽略错误处理

---

## 🔍 常见问题

### Q1: 什么时候使用 PUT vs PATCH？

**PUT**: 完全替换资源
```bash
PUT /api/v1/domains/123
{
  "domain": "example.com",
  "homepage": "https://example.com",
  "configId": 1
}
# 必须提供所有字段
```

**PATCH**: 部分更新资源
```bash
PATCH /api/v1/domains/123
{
  "homepage": "https://new-homepage.com"
}
# 只更新提供的字段
```

### Q2: 删除操作应该返回什么？

**选项 1**: 204 No Content（推荐）
```bash
DELETE /api/v1/domains/123
Response: 204 No Content
```

**选项 2**: 200 OK + 被删除的资源
```bash
DELETE /api/v1/domains/123
Response: 200 OK
{
  "data": { "id": 123, "domain": "example.com", ... }
}
```

### Q3: 如何处理批量操作？

**选项 1**: 使用查询参数
```bash
DELETE /api/v1/domains?ids=1,2,3
```

**选项 2**: 使用请求体
```bash
POST /api/v1/domains/batch-delete
{
  "ids": [1, 2, 3]
}
```

**选项 3**: 使用子资源
```bash
DELETE /api/v1/domains/batch
{
  "ids": [1, 2, 3]
}
```

### Q4: 如何处理关联资源？

**选项 1**: 嵌套路由
```bash
GET /api/v1/domains/123/config
```

**选项 2**: 查询参数
```bash
GET /api/v1/domains/123?include=config
```

**选项 3**: 单独的端点
```bash
GET /api/v1/domains/123
GET /api/v1/configs/456
```

### Q5: 如何实现搜索？

**选项 1**: 查询参数（推荐）
```bash
GET /api/v1/domains?search=example&page=1
```

**选项 2**: 专门的搜索端点
```bash
GET /api/v1/domains/search?q=example
POST /api/v1/domains/search
{
  "query": "example",
  "filters": {...}
}
```

---

## 📚 参考资源

- [RESTful API 设计最佳实践](https://restfulapi.net/)
- [HTTP 状态码完整列表](https://httpstatuses.com/)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [Google API Design Guide](https://cloud.google.com/apis/design)
- [JSON API 规范](https://jsonapi.org/)
