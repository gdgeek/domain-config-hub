# 域名配置服务 - 前端 AI 调用指南

## 概述

本服务提供域名配置查询功能。前端只需传递当前网址，即可获取该域名对应的配置信息。

## API 端点

```
GET /api/v1/domains?url={当前网址}
```

## 基础信息

- **Base URL**: `https://your-domain.com` (替换为实际服务地址)
- **Content-Type**: `application/json`
- **无需认证**: 查询接口无需 Token

## 请求方式

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 当前页面的完整 URL 或域名 |

### 支持的输入格式

系统会自动解析以下格式，提取域名进行匹配：

```
https://www.example.com/path/to/page?query=1#hash
https://example.com
http://www.example.com
www.example.com
example.com
```

### 域名匹配规则

1. **精确匹配优先**: 首先尝试精确匹配输入的域名
2. **根域名回退**: 如果精确匹配失败，自动提取根域名再次查询

示例：
- 数据库中配置了 `baidu.com`
- 查询 `www.baidu.com` → 匹配到 `baidu.com`
- 查询 `abc.baidu.com` → 匹配到 `baidu.com`
- 查询 `https://www.baidu.com/search?q=test` → 匹配到 `baidu.com`

## 请求示例

### JavaScript/TypeScript

```typescript
async function getDomainConfig(currentUrl: string) {
  const response = await fetch(
    `https://your-domain.com/api/v1/domains?url=${encodeURIComponent(currentUrl)}`
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // 域名未配置
    }
    throw new Error('请求失败');
  }
  
  const result = await response.json();
  return result.data;
}

// 使用示例
const config = await getDomainConfig(window.location.href);
```

### cURL

```bash
curl "https://your-domain.com/api/v1/domains?url=https://www.example.com/page"
```

## 响应格式

### 成功响应 (200)

```json
{
  "data": {
    "domain": "example.com",
    "homepage": "https://www.example.com",
    "config": {
      "title": "示例网站",
      "author": "作者名称",
      "description": "网站描述信息",
      "keywords": "关键词1, 关键词2",
      "links": {
        "home": "https://example.com",
        "about": "https://example.com/about",
        "contact": "https://example.com/contact"
      },
      "permissions": {
        "read": true,
        "write": false,
        "admin": false,
        "features": {
          "comments": true,
          "upload": false,
          "api_access": true
        }
      }
    }
  }
}
```

### 域名未找到 (404)

```json
{
  "error": {
    "code": "DOMAIN_NOT_FOUND",
    "message": "域名不存在"
  }
}
```

## 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| domain | string | 匹配到的域名 |
| homepage | string \| null | 域名主页 URL |
| config.title | string \| null | 网站标题 |
| config.author | string \| null | 网站作者 |
| config.description | string \| null | 网站描述 |
| config.keywords | string \| null | 网站关键词 |
| config.links | object \| null | 链接配置 (JSON) |
| config.permissions | object \| null | 权限配置 (JSON) |

## 完整代码示例

### React Hook

```typescript
import { useState, useEffect } from 'react';

interface DomainConfig {
  domain: string;
  homepage: string | null;
  config: {
    title: string | null;
    author: string | null;
    description: string | null;
    keywords: string | null;
    links: Record<string, string> | null;
    permissions: Record<string, any> | null;
  };
}

const API_BASE = 'https://your-domain.com';

export function useDomainConfig() {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const currentUrl = window.location.href;
        const response = await fetch(
          `${API_BASE}/api/v1/domains?url=${encodeURIComponent(currentUrl)}`
        );

        if (response.status === 404) {
          setConfig(null);
          return;
        }

        if (!response.ok) {
          throw new Error('获取配置失败');
        }

        const result = await response.json();
        setConfig(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  return { config, loading, error };
}
```

### Vue 3 Composable

```typescript
import { ref, onMounted } from 'vue';

const API_BASE = 'https://your-domain.com';

export function useDomainConfig() {
  const config = ref(null);
  const loading = ref(true);
  const error = ref(null);

  onMounted(async () => {
    try {
      const currentUrl = window.location.href;
      const response = await fetch(
        `${API_BASE}/api/v1/domains?url=${encodeURIComponent(currentUrl)}`
      );

      if (response.status === 404) {
        config.value = null;
        return;
      }

      if (!response.ok) {
        throw new Error('获取配置失败');
      }

      const result = await response.json();
      config.value = result.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  });

  return { config, loading, error };
}
```

## 错误处理

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 404 | DOMAIN_NOT_FOUND | 域名未配置 |
| 429 | RATE_LIMIT_EXCEEDED | 请求频率超限 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

## 请求频率限制

- **限制**: 每个 IP 每分钟最多 100 次请求
- **超限响应**: HTTP 429 Too Many Requests
- **建议**: 前端应缓存配置结果，避免重复请求

## 注意事项

1. **URL 编码**: 传递 URL 参数时需要使用 `encodeURIComponent()` 进行编码
2. **缓存**: 建议在前端缓存配置结果，避免重复请求
3. **错误处理**: 404 表示域名未配置，应作为正常情况处理
4. **跨域**: 服务已配置 CORS，支持跨域请求

## 健康检查

```bash
curl https://your-domain.com/health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2026-01-25T10:00:00.000Z"
}
```
