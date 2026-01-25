# RESTful API 改进实施计划

## 🎯 改进目标

修复当前 API 设计中不符合 RESTful 规范的问题，同时保持向后兼容性。

---

## 📋 具体改进方案

### 改进 1: 修复路径冲突 🔴 高优先级

#### 问题
```
GET /api/v1/domains/{domain}     # 域名字符串
GET /api/v1/domains/{id}      # 数字 ID
```
当域名是 "id" 时会产生冲突。

#### 解决方案

**步骤 1**: 移除 `/domains/id/{id}` 路由

**步骤 2**: 修改 `/domains/{id}` 为标准 ID 路由

**步骤 3**: 将域名查询改为查询参数

```typescript
// src/routes/DomainRoutes.ts

/**
 * GET /api/v1/domains
 * 获取域名列表（支持过滤）
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { domain, url, page, pageSize } = req.query as any;
    
    // 如果提供了 domain 或 url 参数，进行过滤查询
    if (domain || url) {
      const searchDomain = domain || url;
      const result = await domainService.getByDomain(searchDomain);
      
      if (!result) {
        // 返回空列表而不是 404
        return res.json({
          data: [],
          pagination: {
            page: 1,
            pageSize: 1,
            total: 0,
            totalPages: 0
          }
        });
      }
      
      // 返回列表格式（即使只有一个结果）
      return res.json({
        data: [result],
        pagination: {
          page: 1,
          pageSize: 1,
          total: 1,
          totalPages: 1
        }
      });
    }
    
    // 否则返回分页列表
    const paginationParams = { 
      page: parseInt(page) || 1, 
      pageSize: parseInt(pageSize) || 20 
    };
    const result = await domainService.list(paginationParams);
    res.json(result);
  })
);

/**
 * GET /api/v1/domains/{id}
 * 通过 ID 获取单个域名
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const domain = await domainService.getById(id);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);

// 删除 /id/:id 路由
```

#### 向后兼容方案

如果需要保持向后兼容，可以添加一个废弃的路由：

```typescript
/**
 * @deprecated 使用 GET /api/v1/domains/{id} 代替
 * GET /api/v1/domains/{id}
 */
router.get(
  '/id/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // 添加废弃警告头
    res.setHeader('X-API-Warn', 'This endpoint is deprecated. Use GET /api/v1/domains/{id} instead.');
    
    const id = parseInt(req.params.id, 10);
    const domain = await domainService.getById(id);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);
```

---

### 改进 2: 统一查询接口响应格式 🟡 中优先级

#### 问题
```
GET /api/v1/domains?url=baidu.com    # 返回单个对象
GET /api/v1/domains                  # 返回列表
```
响应格式不一致。

#### 解决方案

**选项 A**: 统一返回列表格式（推荐）

```typescript
// 所有查询都返回列表格式
GET /api/v1/domains                    # 返回 { data: [...], pagination: {...} }
GET /api/v1/domains?domain=baidu.com   # 返回 { data: [result], pagination: {...} }
GET /api/v1/domains/{id}               # 返回 { data: {...} }
```

**选项 B**: 使用不同的端点

```typescript
GET /api/v1/domains                    # 列表
GET /api/v1/domains/search?q=baidu     # 搜索（返回列表）
GET /api/v1/domains/{id}               # 单个资源
```

---

### 改进 3: 优化删除操作响应 🟢 低优先级

#### 问题
```
DELETE /api/v1/domains/{id}
Response: 200 { "message": "域名删除成功" }
```

#### 解决方案

```typescript
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await domainService.delete(id);
    
    // 返回 204 No Content
    res.status(204).send();
  })
);
```

如果需要返回被删除的资源：

```typescript
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    
    // 先获取资源
    const domain = await domainService.getById(id);
    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }
    
    // 删除资源
    await domainService.delete(id);
    
    // 返回被删除的资源
    res.json({ data: domain });
  })
);
```

---

### 改进 4: 改进认证端点 🟢 低优先级

#### 问题
```
POST /api/v1/auth/login    # 使用动词
```

#### 解决方案

**选项 A**: 使用会话资源（推荐）

```typescript
// src/routes/SessionRoutes.ts

/**
 * POST /api/v1/sessions
 * 创建会话（登录）
 */
router.post('/', (req: Request, res: Response) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '请提供密码',
      },
    });
  }
  
  if (password === config.adminPassword) {
    const token = generateToken();
    
    logger.info('会话创建成功', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json({
      data: {
        token,
        expiresIn: 86400,
        tokenType: 'Bearer'
      }
    });
  } else {
    logger.warn('会话创建失败：密码错误', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '密码错误',
      },
    });
  }
});

/**
 * DELETE /api/v1/sessions
 * 删除会话（登出）
 */
router.delete('/', authMiddleware, (req: Request, res: Response) => {
  // 在实际应用中，这里应该将令牌加入黑名单
  logger.info('会话删除成功', {
    ip: req.ip,
  });
  
  res.status(204).send();
});

/**
 * GET /api/v1/sessions/current
 * 获取当前会话信息
 */
router.get('/current', authMiddleware, (req: Request, res: Response) => {
  res.json({
    data: {
      authenticated: true,
      expiresAt: req.tokenExpiry // 需要在中间件中设置
    }
  });
});
```

**选项 B**: 使用 OAuth 2.0 风格

```typescript
// POST /api/v1/token
router.post('/token', (req: Request, res: Response) => {
  const { grant_type, password } = req.body;
  
  if (grant_type !== 'password') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: '不支持的授权类型'
    });
  }
  
  if (password === config.adminPassword) {
    const token = generateToken();
    
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400
    });
  } else {
    res.status(401).json({
      error: 'invalid_grant',
      error_description: '密码错误'
    });
  }
});
```

---

### 改进 5: 添加 PATCH 支持 🟢 低优先级

#### 当前
只支持 PUT（完全替换）

#### 改进
添加 PATCH（部分更新）

```typescript
/**
 * PATCH /api/v1/domains/{id}
 * 部分更新域名
 */
router.patch(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    
    // PATCH 只更新提供的字段
    const updates: any = {};
    if (req.body.homepage !== undefined) updates.homepage = req.body.homepage;
    if (req.body.configId !== undefined) updates.configId = req.body.configId;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '至少需要提供一个要更新的字段'
        }
      });
    }
    
    const domain = await domainService.update(id, updates);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);

/**
 * PUT /api/v1/domains/{id}
 * 完全替换域名
 */
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateDomainSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    
    // PUT 需要提供所有字段
    const domain = await domainService.replace(id, req.body);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);
```

---

### 改进 6: 增强查询能力 🟢 低优先级

#### 添加更多查询参数

```typescript
/**
 * GET /api/v1/domains
 * 支持的查询参数：
 * - page: 页码
 * - pageSize: 每页大小
 * - domain: 按域名过滤
 * - search: 模糊搜索
 * - sort: 排序字段
 * - order: 排序方向（asc/desc）
 * - fields: 返回的字段列表
 * - include: 包含关联资源
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      pageSize = 20,
      domain,
      search,
      sort = 'createdAt',
      order = 'desc',
      fields,
      include
    } = req.query as any;
    
    const options = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      filters: {
        domain,
        search
      },
      sort: {
        field: sort,
        order
      },
      fields: fields ? fields.split(',') : undefined,
      include: include ? include.split(',') : undefined
    };
    
    const result = await domainService.list(options);
    res.json(result);
  })
);
```

---

## 🚀 实施步骤

### 第 1 步: 修复路径冲突（必须）

1. 修改 `src/routes/DomainRoutes.ts`
2. 更新相关测试
3. 更新 Swagger 文档
4. 更新管理界面（如果使用了 `/id/{id}` 路径）

### 第 2 步: 统一响应格式（推荐）

1. 修改查询接口始终返回列表格式
2. 更新测试
3. 更新文档

### 第 3 步: 优化删除响应（可选）

1. 修改删除操作返回 204
2. 更新测试
3. 更新管理界面（检查是否依赖响应消息）

### 第 4 步: 改进认证端点（可选）

1. 创建 `SessionRoutes.ts`
2. 保留 `AdminRoutes.ts` 作为向后兼容
3. 添加废弃警告
4. 更新文档

---

## 📝 测试清单

- [ ] 所有现有测试通过
- [ ] 添加新路由的测试
- [ ] 测试向后兼容性
- [ ] 测试错误场景
- [ ] 更新集成测试
- [ ] 更新 Swagger 文档
- [ ] 手动测试管理界面

---

## 📚 文档更新

需要更新的文档：
- [ ] API_USAGE_GUIDE.md
- [ ] SWAGGER_VERIFICATION.md
- [ ] README.md
- [ ] Swagger 注释

---

## ⚠️ 注意事项

1. **向后兼容性**: 如果有外部客户端使用当前 API，需要保持向后兼容
2. **渐进式改进**: 不要一次性修改所有内容，分阶段实施
3. **版本管理**: 考虑引入 API v2 来实现完全 RESTful 设计
4. **通知用户**: 如果废弃某些端点，需要提前通知用户
5. **监控**: 监控旧端点的使用情况，确定何时可以完全移除

---

## 🎯 预期收益

1. **更好的可维护性**: 统一的 API 设计更容易维护
2. **更好的可扩展性**: 符合标准的设计更容易扩展
3. **更好的开发体验**: 开发者更容易理解和使用 API
4. **更好的工具支持**: 标准的 RESTful API 可以更好地与工具集成
5. **更好的文档**: 统一的设计使文档更清晰
