# 权限配置使用指南

本文档介绍如何使用域名配置服务中的 `permissions` 字段来管理网站权限。

## 目录

- [概述](#概述)
- [数据结构](#数据结构)
- [API 使用](#api-使用)
- [权限验证](#权限验证)
- [最佳实践](#最佳实践)
- [示例场景](#示例场景)

## 概述

`permissions` 字段是一个 JSON 类型的字段，用于存储每个域名的权限配置。它提供了灵活的方式来控制网站的各种功能和访问权限。

### 特性

- ✅ 灵活的 JSON 结构，支持任意权限配置
- ✅ 支持嵌套对象，可以组织复杂的权限层级
- ✅ 可以存储角色、功能开关、限制条件等
- ✅ 与现有的 CRUD API 完全集成

## 数据结构

### 推荐的权限配置结构

```typescript
interface PermissionsConfig {
  // 基础权限
  read?: boolean;           // 读取权限
  write?: boolean;          // 写入权限
  admin?: boolean;          // 管理员权限
  
  // 功能开关
  features?: {
    comments?: boolean;     // 评论功能
    upload?: boolean;       // 上传功能
    api_access?: boolean;   // API 访问
    analytics?: boolean;    // 分析功能
    [key: string]: any;     // 其他自定义功能
  };
  
  // 角色列表
  roles?: string[];         // 如: ["viewer", "editor", "admin"]
  
  // 限制条件
  restrictions?: {
    max_requests_per_day?: number;
    max_upload_size?: number;
    allowed_ips?: string[];
    blocked_ips?: string[];
    rate_limit?: number;
    [key: string]: any;
  };
  
  // 自定义配置
  [key: string]: any;
}
```

### 示例配置

#### 基础配置

```json
{
  "read": true,
  "write": false,
  "admin": false
}
```

#### 完整配置

```json
{
  "read": true,
  "write": true,
  "admin": false,
  "features": {
    "comments": true,
    "upload": true,
    "api_access": true,
    "analytics": false
  },
  "roles": ["viewer", "contributor"],
  "restrictions": {
    "max_requests_per_day": 1000,
    "max_upload_size": 10485760,
    "allowed_ips": ["192.168.1.0/24", "10.0.0.0/8"],
    "rate_limit": 100
  }
}
```

## API 使用

### 创建带权限配置的域名

```bash
curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "title": "Example Site",
    "permissions": {
      "read": true,
      "write": true,
      "admin": false,
      "features": {
        "comments": true,
        "upload": false
      }
    }
  }'
```

### 查询域名权限配置

```bash
curl http://localhost:3000/api/v1/domains/example.com
```

响应示例：

```json
{
  "data": {
    "id": 1,
    "domain": "example.com",
    "title": "Example Site",
    "author": null,
    "description": null,
    "keywords": null,
    "links": null,
    "permissions": {
      "read": true,
      "write": true,
      "admin": false,
      "features": {
        "comments": true,
        "upload": false
      }
    }
  }
}
```

### 更新权限配置

```bash
curl -X PUT http://localhost:3000/api/v1/domains/1 \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": {
      "read": true,
      "write": false,
      "admin": true,
      "features": {
        "comments": true,
        "upload": true,
        "api_access": true
      }
    }
  }'
```

### 部分更新权限

如果只想更新部分权限，需要先获取完整配置，然后合并更新：

```typescript
// 获取当前配置
const domain = await domainService.getById(domainId);
const currentPermissions = domain.permissions || {};

// 合并新权限
const updatedPermissions = {
  ...currentPermissions,
  admin: true,
  features: {
    ...currentPermissions.features,
    upload: true
  }
};

// 更新
await domainService.update(domainId, {
  permissions: updatedPermissions
});
```

## 权限验证

### 在应用中验证权限

```typescript
import { DomainService } from './services/DomainService';

class PermissionChecker {
  constructor(private domainService: DomainService) {}

  /**
   * 检查域名是否有指定权限
   */
  async hasPermission(
    domain: string, 
    permission: string
  ): Promise<boolean> {
    const domainConfig = await this.domainService.getByDomain(domain);
    
    if (!domainConfig || !domainConfig.permissions) {
      return false;
    }

    const permissions = domainConfig.permissions as any;
    return permissions[permission] === true;
  }

  /**
   * 检查域名是否有指定功能
   */
  async hasFeature(
    domain: string, 
    feature: string
  ): Promise<boolean> {
    const domainConfig = await this.domainService.getByDomain(domain);
    
    if (!domainConfig || !domainConfig.permissions) {
      return false;
    }

    const permissions = domainConfig.permissions as any;
    return permissions.features?.[feature] === true;
  }

  /**
   * 检查域名是否有指定角色
   */
  async hasRole(
    domain: string, 
    role: string
  ): Promise<boolean> {
    const domainConfig = await this.domainService.getByDomain(domain);
    
    if (!domainConfig || !domainConfig.permissions) {
      return false;
    }

    const permissions = domainConfig.permissions as any;
    return permissions.roles?.includes(role) || false;
  }

  /**
   * 获取域名的限制配置
   */
  async getRestrictions(domain: string): Promise<any> {
    const domainConfig = await this.domainService.getByDomain(domain);
    
    if (!domainConfig || !domainConfig.permissions) {
      return {};
    }

    const permissions = domainConfig.permissions as any;
    return permissions.restrictions || {};
  }
}

// 使用示例
const checker = new PermissionChecker(domainService);

// 检查写入权限
if (await checker.hasPermission('example.com', 'write')) {
  // 允许写入操作
}

// 检查上传功能
if (await checker.hasFeature('example.com', 'upload')) {
  // 允许上传文件
}

// 检查角色
if (await checker.hasRole('example.com', 'admin')) {
  // 允许管理员操作
}

// 获取限制
const restrictions = await checker.getRestrictions('example.com');
if (restrictions.max_requests_per_day) {
  // 应用请求限制
}
```

### 创建权限中间件

```typescript
import { Request, Response, NextFunction } from 'express';
import { DomainService } from './services/DomainService';

/**
 * 权限验证中间件工厂
 */
export function requirePermission(
  permission: string,
  domainService: DomainService
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 从请求中获取域名（可以从 header、query 或 body）
      const domain = req.get('X-Domain') || req.query.domain as string;
      
      if (!domain) {
        return res.status(400).json({
          error: {
            code: 'DOMAIN_REQUIRED',
            message: '请求必须包含域名信息'
          }
        });
      }

      // 获取域名配置
      const domainConfig = await domainService.getByDomain(domain);
      
      if (!domainConfig) {
        return res.status(404).json({
          error: {
            code: 'DOMAIN_NOT_FOUND',
            message: '域名不存在'
          }
        });
      }

      // 检查权限
      const permissions = domainConfig.permissions as any;
      if (!permissions || permissions[permission] !== true) {
        return res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: `缺少 ${permission} 权限`
          }
        });
      }

      // 权限验证通过，继续处理请求
      next();
    } catch (error) {
      next(error);
    }
  };
}

// 使用示例
app.post('/api/content', 
  requirePermission('write', domainService),
  async (req, res) => {
    // 处理写入操作
  }
);
```

## 最佳实践

### 1. 定义权限常量

```typescript
// src/constants/permissions.ts
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
} as const;

export const FEATURES = {
  COMMENTS: 'comments',
  UPLOAD: 'upload',
  API_ACCESS: 'api_access',
  ANALYTICS: 'analytics',
} as const;

export const ROLES = {
  VIEWER: 'viewer',
  CONTRIBUTOR: 'contributor',
  EDITOR: 'editor',
  ADMIN: 'admin',
} as const;
```

### 2. 使用 TypeScript 类型

```typescript
// src/types/permissions.ts
export interface PermissionsConfig {
  read?: boolean;
  write?: boolean;
  admin?: boolean;
  features?: {
    comments?: boolean;
    upload?: boolean;
    api_access?: boolean;
    analytics?: boolean;
  };
  roles?: string[];
  restrictions?: {
    max_requests_per_day?: number;
    max_upload_size?: number;
    allowed_ips?: string[];
    blocked_ips?: string[];
    rate_limit?: number;
  };
}

// 在 DomainService 中使用
export interface DomainOutput {
  id: number;
  domain: string;
  title: string | null;
  author: string | null;
  description: string | null;
  keywords: string | null;
  links: object | null;
  permissions: PermissionsConfig | null;
}
```

### 3. 设置默认权限

```typescript
// src/config/defaults.ts
export const DEFAULT_PERMISSIONS: PermissionsConfig = {
  read: true,
  write: false,
  admin: false,
  features: {
    comments: false,
    upload: false,
    api_access: false,
    analytics: false,
  },
  roles: ['viewer'],
  restrictions: {
    max_requests_per_day: 1000,
    rate_limit: 100,
  },
};

// 在创建域名时应用默认权限
async create(input: DomainInput): Promise<DomainOutput> {
  const permissions = input.permissions || DEFAULT_PERMISSIONS;
  // ...
}
```

### 4. 权限继承和组合

```typescript
// 定义权限模板
const PERMISSION_TEMPLATES = {
  public: {
    read: true,
    write: false,
    admin: false,
    features: { comments: true }
  },
  contributor: {
    read: true,
    write: true,
    admin: false,
    features: { comments: true, upload: true }
  },
  admin: {
    read: true,
    write: true,
    admin: true,
    features: { comments: true, upload: true, api_access: true }
  }
};

// 应用模板
function applyPermissionTemplate(
  template: keyof typeof PERMISSION_TEMPLATES,
  overrides?: Partial<PermissionsConfig>
): PermissionsConfig {
  return {
    ...PERMISSION_TEMPLATES[template],
    ...overrides
  };
}
```

### 5. 审计日志

```typescript
// 记录权限变更
async updatePermissions(
  domainId: number,
  newPermissions: PermissionsConfig,
  userId: string
): Promise<void> {
  const domain = await this.getById(domainId);
  const oldPermissions = domain.permissions;

  // 更新权限
  await this.update(domainId, { permissions: newPermissions });

  // 记录审计日志
  await auditLogger.log({
    action: 'PERMISSIONS_UPDATED',
    userId,
    domainId,
    domain: domain.domain,
    oldPermissions,
    newPermissions,
    timestamp: new Date(),
  });
}
```

## 示例场景

### 场景 1: 多租户 SaaS 平台

```json
{
  "read": true,
  "write": true,
  "admin": false,
  "features": {
    "custom_domain": true,
    "ssl": true,
    "analytics": true,
    "api_access": false
  },
  "plan": "pro",
  "restrictions": {
    "max_users": 50,
    "max_storage_gb": 100,
    "max_requests_per_day": 10000
  }
}
```

### 场景 2: 内容管理系统

```json
{
  "read": true,
  "write": true,
  "admin": false,
  "features": {
    "create_post": true,
    "edit_post": true,
    "delete_post": false,
    "publish": false,
    "moderate_comments": false
  },
  "roles": ["author", "contributor"],
  "restrictions": {
    "max_posts_per_day": 10
  }
}
```

### 场景 3: API 访问控制

```json
{
  "read": true,
  "write": false,
  "admin": false,
  "features": {
    "api_access": true,
    "webhook": false
  },
  "api": {
    "key": "generated-api-key",
    "rate_limit": 1000,
    "allowed_endpoints": ["/api/v1/domains", "/api/v1/health"]
  },
  "restrictions": {
    "max_requests_per_hour": 1000,
    "allowed_ips": ["203.0.113.0/24"]
  }
}
```

### 场景 4: 白名单/黑名单

```json
{
  "read": true,
  "write": true,
  "admin": false,
  "access_control": {
    "type": "whitelist",
    "allowed_ips": [
      "192.168.1.0/24",
      "10.0.0.0/8"
    ]
  },
  "restrictions": {
    "blocked_countries": ["XX", "YY"],
    "require_authentication": true
  }
}
```

## 数据库查询示例

### 查询有管理员权限的域名

```sql
SELECT * FROM domain 
WHERE JSON_EXTRACT(permissions, '$.admin') = true;
```

### 查询启用了特定功能的域名

```sql
SELECT * FROM domain 
WHERE JSON_EXTRACT(permissions, '$.features.upload') = true;
```

### 查询包含特定角色的域名

```sql
SELECT * FROM domain 
WHERE JSON_CONTAINS(
  JSON_EXTRACT(permissions, '$.roles'),
  '"admin"'
);
```

### 更新特定权限

```sql
UPDATE domain 
SET permissions = JSON_SET(
  COALESCE(permissions, '{}'),
  '$.admin', true,
  '$.features.api_access', true
)
WHERE domain = 'example.com';
```

## 故障排查

### 问题：权限配置未生效

**检查清单：**
1. 确认数据库中 permissions 字段已正确存储
2. 确认 JSON 格式正确
3. 确认权限验证逻辑正确实现
4. 检查缓存是否已更新

### 问题：JSON 格式错误

```typescript
// 验证 JSON 格式
function isValidPermissions(permissions: any): boolean {
  try {
    JSON.stringify(permissions);
    return true;
  } catch {
    return false;
  }
}
```

## 相关资源

- [数据库迁移指南](../migrations/README.md)
- [API 文档](./API.md)
- [验证规则](../src/validation/schemas.ts)

## 支持

如有问题或建议，请联系开发团队或提交 Issue。
