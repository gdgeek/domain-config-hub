# API 路径修复总结

## 问题描述

admin.html 编辑域名功能报错：`Cannot read properties of undefined (reading 'id')`

## 根本原因

1. **DomainService 缺少 homepage 字段**
   - `DomainOutput` 接口缺少 `homepage` 字段定义
   - `toOutput` 方法没有映射 `homepage` 字段

2. **旧的 API 路径未完全迁移**
   - 系统中仍有多处使用旧路径 `/api/v1/domains/id/{id}`
   - 应该使用 RESTful 标准路径 `/api/v1/domains/{id}`

## 修复内容

### 1. 修复 DomainService (src/services/DomainService.ts)

**DomainOutput 接口**:
```typescript
export interface DomainOutput {
  id: number;
  domain: string;
  homepage?: string | null;  // ✅ 新增
  configId: number;
  config?: {...};
  createdAt?: Date;
  updatedAt?: Date;
}
```

**toOutput 方法**:
```typescript
private toOutput(domain: DomainAttributes): DomainOutput {
  const output: DomainOutput = {
    id: domain.id,
    domain: domain.domain,
    homepage: domain.homepage,  // ✅ 新增
    configId: domain.configId,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  };
  // ...
}
```

### 2. 批量修复旧 API 路径

使用脚本批量替换所有文件中的旧路径：
- `/api/v1/domains/id/{id}` → `/api/v1/domains/{id}`
- `/api/v2/domains/id/{id}` → `/api/v2/domains/{id}`

**修复的文件**:
- ✅ src/middleware/LoggingMiddleware.test.ts
- ✅ public/admin.html (Docker 容器)
- ✅ 文档文件（保留说明性文字）

### 3. 更新 Docker 容器

```bash
# 复制更新后的文件到容器
docker cp dist/services/DomainService.js domain-config-service:/app/dist/services/DomainService.js
docker cp public/admin.html domain-config-service:/app/public/admin.html

# 重启容器
docker restart domain-config-service
```

## 验证结果

### API 测试
```bash
# 测试域名列表 API
curl http://localhost:3000/api/v1/domains \
  -H "Accept: application/json" \
  -H "Authorization: Bearer admin123"

# 返回包含 homepage 字段 ✅
{
  "data": [
    {
      "id": 12,
      "domain": "test-api-1769327616.com",
      "homepage": "https://test-api.com",  // ✅
      "configId": 1,
      ...
    }
  ]
}

# 测试单个域名 API
curl http://localhost:3000/api/v1/domains/12 \
  -H "Accept: application/json" \
  -H "Authorization: Bearer admin123"

# 返回正确 ✅
{
  "data": {
    "id": 12,
    "domain": "test-api-1769327616.com",
    "homepage": "https://test-api.com",  // ✅
    "configId": 1,
    ...
  }
}
```

### admin.html 测试
- ✅ 域名列表正常显示
- ✅ 编辑功能正常工作
- ✅ homepage 字段正确显示和编辑

## 注意事项

1. **浏览器缓存**: 如果修复后仍有问题，请清除浏览器缓存或强制刷新（Ctrl+Shift+R / Cmd+Shift+R）

2. **Docker 部署**: 在生产环境部署时，确保重新构建 Docker 镜像：
   ```bash
   docker-compose up --build
   ```

3. **API 路径标准**: 所有新代码应使用 RESTful 标准路径：
   - ✅ `/api/v1/domains/{id}` - 通过 ID 获取
   - ✅ `/api/v1/domains?domain=xxx` - 通过域名查询
   - ❌ `/api/v1/domains/id/{id}` - 已废弃

## 相关文档

- [RESTful API 迁移完成](./RESTFUL_MIGRATION_COMPLETE.md)
- [RESTful API 快速参考](./RESTFUL_QUICK_REFERENCE.md)
- [管理界面使用指南](./docs/ADMIN_UI_GUIDE.md)
