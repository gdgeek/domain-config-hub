# API 使用指南

## 域名查询 API

### 方式 1: 查询参数方式（推荐）

通过 `url` 查询参数查询域名配置。

**端点**: `GET /api/v1/domains?url={domain}`

**优点**:
- 支持完整 URL（自动提取域名）
- 不需要 URL 编码特殊字符
- 更符合 RESTful 风格

**示例**:

```bash
# 1. 简单域名查询
curl "http://localhost:3000/api/v1/domains?url=baidu.com"

# 2. 带路径的 URL
curl "http://localhost:3000/api/v1/domains?url=baidu.com/v"

# 3. 完整 URL（自动提取域名）
curl "http://localhost:3000/api/v1/domains?url=https://www.baidu.com/a/b/c"

# 4. 子域名（自动匹配根域名）
curl "http://localhost:3000/api/v1/domains?url=www.baidu.com"
curl "http://localhost:3000/api/v1/domains?url=abc.baidu.com"
```

**响应示例**:

```json
{
  "domain": "baidu.com",
  "title": "测试",
  "author": "dirui",
  "description": "描述",
  "keywords": "关键词",
  "links": null,
  "permissions": null
}
```

**注意**: 
- `domain` 字段是匹配到的域名（可能与查询的域名不同，如查询 `www.baidu.com` 匹配到 `baidu.com`）
- 响应中不包含 `id`、`createdAt` 和 `updatedAt` 字段

**错误响应**:

```json
{
  "error": {
    "code": "DOMAIN_NOT_FOUND",
    "message": "域名不存在"
  }
}
```

### 方式 2: 路径参数方式（兼容）

通过路径参数查询域名配置。

**端点**: `GET /api/v1/domains/{domain}`

**示例**:

```bash
# 1. 简单域名查询
curl "http://localhost:3000/api/v1/domains/baidu.com"

# 2. 子域名查询
curl "http://localhost:3000/api/v1/domains/www.baidu.com"
```

**注意**: 路径参数方式不支持带路径的 URL（如 `baidu.com/v`），因为 `/` 会被解析为路径分隔符。

### 方式 3: 获取域名列表

不提供 `url` 参数时，返回域名列表（分页）。

**端点**: `GET /api/v1/domains`

**参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页大小（默认 20，最大 100）

**示例**:

```bash
# 1. 获取第一页（默认）
curl "http://localhost:3000/api/v1/domains"

# 2. 获取第二页，每页 10 条
curl "http://localhost:3000/api/v1/domains?page=2&pageSize=10"
```

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "domain": "baidu.com",
      "configId": 2,
      "config": {
        "id": 2,
        "title": "测试",
        "author": "dirui",
        "description": "描述",
        "keywords": "关键词",
        "links": null,
        "permissions": null
      },
      "createdAt": "2026-01-25T05:32:11.000Z",
      "updatedAt": "2026-01-25T05:32:11.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

## 智能域名匹配

API 支持智能域名匹配，自动处理以下情况：

### 1. URL 解析

自动从完整 URL 中提取域名：

```bash
# 输入: https://www.baidu.com/a/b/c?query=1#hash
# 提取: www.baidu.com
curl "http://localhost:3000/api/v1/domains?url=https://www.baidu.com/a/b/c?query=1#hash"
```

### 2. 子域名匹配

如果数据库中有 `baidu.com`，以下查询都会匹配到它：

```bash
# 精确匹配
curl "http://localhost:3000/api/v1/domains?url=baidu.com"

# 子域名匹配
curl "http://localhost:3000/api/v1/domains?url=www.baidu.com"
curl "http://localhost:3000/api/v1/domains?url=abc.baidu.com"
curl "http://localhost:3000/api/v1/domains?url=www.abc.baidu.com"
```

### 3. 大小写不敏感

```bash
# 以下查询等价
curl "http://localhost:3000/api/v1/domains?url=baidu.com"
curl "http://localhost:3000/api/v1/domains?url=BAIDU.COM"
curl "http://localhost:3000/api/v1/domains?url=BaiDu.CoM"
```

### 4. 端口号处理

自动移除端口号：

```bash
# 输入: www.baidu.com:8080
# 提取: www.baidu.com
curl "http://localhost:3000/api/v1/domains?url=www.baidu.com:8080"
```

## JavaScript 调用示例

### 使用 fetch

```javascript
// 1. 查询参数方式
async function getDomainConfig(url) {
  const response = await fetch(
    `http://localhost:3000/api/v1/domains?url=${encodeURIComponent(url)}`
  );
  
  if (!response.ok) {
    throw new Error('域名不存在');
  }
  
  return await response.json();
}

// 使用示例
const config = await getDomainConfig('https://www.baidu.com/a/b/c');
console.log(config.title); // "测试"

// 2. 路径参数方式
async function getDomainConfigByPath(domain) {
  const response = await fetch(
    `http://localhost:3000/api/v1/domains/${domain}`
  );
  
  if (!response.ok) {
    throw new Error('域名不存在');
  }
  
  return await response.json();
}

// 使用示例
const config2 = await getDomainConfigByPath('baidu.com');
console.log(config2.title); // "测试"

// 3. 获取域名列表
async function getDomainList(page = 1, pageSize = 20) {
  const response = await fetch(
    `http://localhost:3000/api/v1/domains?page=${page}&pageSize=${pageSize}`
  );
  
  return await response.json();
}

// 使用示例
const list = await getDomainList();
console.log(list.pagination.total); // 总数
console.log(list.data); // 域名列表
```

### 使用 axios

```javascript
import axios from 'axios';

// 1. 查询参数方式
async function getDomainConfig(url) {
  try {
    const response = await axios.get('http://localhost:3000/api/v1/domains', {
      params: { url }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('域名不存在');
    }
    throw error;
  }
}

// 使用示例
const config = await getDomainConfig('https://www.baidu.com/a/b/c');
console.log(config.title); // "测试"

// 2. 路径参数方式
async function getDomainConfigByPath(domain) {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/domains/${domain}`
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('域名不存在');
    }
    throw error;
  }
}

// 使用示例
const config2 = await getDomainConfigByPath('baidu.com');
console.log(config2.title); // "测试"
```

## 响应格式

### 成功响应（查询单个域名）

**状态码**: 200

**响应体**:
```json
{
  "id": 2,
  "title": "测试",
  "author": "dirui",
  "description": "描述",
  "keywords": "关键词",
  "links": null,
  "permissions": null,
  "createdAt": "2026-01-25T05:28:54.000Z",
  "updatedAt": "2026-01-25T05:28:54.000Z"
}
```

**字段说明**:
- `domain`: 匹配到的域名（可能与查询的域名不同）
- `title`: 标题
- `author`: 作者
- `description`: 描述
- `keywords`: 关键词
- `links`: 链接（JSON 对象）
- `permissions`: 权限（JSON 对象）

**注意**: 
- 包含匹配到的域名信息
- 不包含 `id`、`createdAt`、`updatedAt` 等元数据字段

### 成功响应（域名列表）

**状态码**: 200

**响应体**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 错误响应

**状态码**: 404

**响应体**:
```json
{
  "error": {
    "code": "DOMAIN_NOT_FOUND",
    "message": "域名不存在"
  }
}
```

## 性能优化

### 1. 缓存

API 支持 Redis 缓存，可以显著提高查询性能。

### 2. 限流

默认限流：100 请求/分钟

响应头：
```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 60
```

### 3. ETag

API 支持 ETag，可以利用浏览器缓存：

```bash
curl -I "http://localhost:3000/api/v1/domains?url=baidu.com"
# ETag: W/"103-2WEsPHUbTd5gcQ6N3HeQ18RetUU"
```

## 安全性

### CORS

API 支持跨域访问：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 认证

- **GET 请求**: 公开访问，无需认证
- **POST/PUT/DELETE 请求**: 需要 JWT 认证

## 最佳实践

### 1. 使用查询参数方式

推荐使用 `?url=` 查询参数方式，因为：
- 支持完整 URL
- 不需要处理特殊字符
- 更灵活

### 2. URL 编码

如果 URL 包含特殊字符，记得进行 URL 编码：

```javascript
const url = 'https://www.baidu.com/a/b/c?query=1';
const encodedUrl = encodeURIComponent(url);
fetch(`http://localhost:3000/api/v1/domains?url=${encodedUrl}`);
```

### 3. 错误处理

始终处理 404 错误：

```javascript
try {
  const config = await getDomainConfig(url);
  // 使用 config
} catch (error) {
  if (error.response?.status === 404) {
    console.log('域名不存在');
  } else {
    console.error('查询失败', error);
  }
}
```

### 4. 利用智能匹配

不需要手动提取域名，直接传入完整 URL：

```javascript
// ✅ 推荐：直接传入完整 URL
const config = await getDomainConfig('https://www.baidu.com/a/b/c');

// ❌ 不推荐：手动提取域名
const domain = extractDomain('https://www.baidu.com/a/b/c');
const config = await getDomainConfig(domain);
```

## 总结

API 现在支持三种查询方式：

1. **查询参数方式**（推荐）: `GET /api/v1/domains?url={domain}`
   - 支持完整 URL
   - 自动提取域名
   - 智能匹配子域名

2. **路径参数方式**（兼容）: `GET /api/v1/domains/{domain}`
   - 简单域名查询
   - 不支持带路径的 URL

3. **列表查询**: `GET /api/v1/domains`
   - 返回域名列表
   - 支持分页

所有方式都支持智能域名匹配，自动处理 URL 解析、子域名匹配、大小写等。
