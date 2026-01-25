# 双表设计文档

## 概述

将原有的单表设计重构为双表设计，实现多个域名共享同一份配置信息的功能。

## 数据库架构

### 表关系图

```
┌─────────────────┐         ┌─────────────────┐
│    domains      │         │     configs     │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ domain (UNIQUE) │         │ title           │
│ config_id (FK)  │────────>│ author          │
│ created_at      │         │ description     │
│ updated_at      │         │ keywords        │
└─────────────────┘         │ links           │
                            │ permissions     │
                            │ created_at      │
                            │ updated_at      │
                            └─────────────────┘
```

### 关系说明

- **多对一关系**: 多个域名可以关联到同一个配置
- **外键约束**: `domains.config_id` → `configs.id`
- **删除保护**: `ON DELETE RESTRICT` 防止删除被引用的配置

## API 设计

### 配置管理 API

#### 1. 获取配置列表
```http
GET /api/v1/configs?page=1&pageSize=20
```

响应:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Example Site",
      "author": "John Doe",
      "description": "A test site",
      "keywords": "test, example",
      "links": { "home": "https://example.com" },
      "permissions": { "read": true },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
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

#### 2. 获取单个配置
```http
GET /api/v1/configs/:id
```

响应:
```json
{
  "data": {
    "id": 1,
    "title": "Example Site",
    "author": "John Doe",
    "description": "A test site",
    "keywords": "test, example",
    "links": { "home": "https://example.com" },
    "permissions": { "read": true },
    "domains": [
      { "id": 1, "domain": "example.com" },
      { "id": 2, "domain": "example.org" }
    ]
  }
}
```

#### 3. 创建配置
```http
POST /api/v1/configs
Content-Type: application/json

{
  "title": "New Site",
  "author": "Jane Doe",
  "description": "A new site",
  "keywords": "new, site",
  "links": { "home": "https://newsite.com" },
  "permissions": { "read": true, "write": false }
}
```

#### 4. 更新配置
```http
PUT /api/v1/configs/:id
Content-Type: application/json

{
  "title": "Updated Site",
  "description": "Updated description"
}
```

#### 5. 删除配置
```http
DELETE /api/v1/configs/:id
```

注意: 如果有域名引用此配置，删除会失败（返回 409）

### 域名管理 API

#### 1. 获取域名列表（包含配置）
```http
GET /api/v1/domains?page=1&pageSize=20
```

响应:
```json
{
  "data": [
    {
      "id": 1,
      "domain": "example.com",
      "configId": 1,
      "config": {
        "id": 1,
        "title": "Example Site",
        "author": "John Doe",
        "description": "A test site",
        "keywords": "test, example",
        "links": { "home": "https://example.com" },
        "permissions": { "read": true }
      }
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

#### 2. 通过域名获取配置
```http
GET /api/v1/domains/:domain
```

响应:
```json
{
  "data": {
    "id": 1,
    "domain": "example.com",
    "configId": 1,
    "config": {
      "id": 1,
      "title": "Example Site",
      "author": "John Doe",
      "description": "A test site",
      "keywords": "test, example",
      "links": { "home": "https://example.com" },
      "permissions": { "read": true }
    }
  }
}
```

#### 3. 创建域名
```http
POST /api/v1/domains
Content-Type: application/json

{
  "domain": "newdomain.com",
  "configId": 1
}
```

#### 4. 更新域名（更改关联的配置）
```http
PUT /api/v1/domains/:id
Content-Type: application/json

{
  "configId": 2
}
```

#### 5. 删除域名
```http
DELETE /api/v1/domains/:id
```

## 使用场景

### 场景 1: 多个域名共享同一配置

```bash
# 1. 创建一个配置
POST /api/v1/configs
{
  "title": "My Website",
  "author": "John Doe",
  "description": "My awesome website"
}
# 返回: { "data": { "id": 1, ... } }

# 2. 创建多个域名，都指向这个配置
POST /api/v1/domains
{ "domain": "example.com", "configId": 1 }

POST /api/v1/domains
{ "domain": "example.org", "configId": 1 }

POST /api/v1/domains
{ "domain": "example.net", "configId": 1 }

# 3. 更新配置，所有域名自动生效
PUT /api/v1/configs/1
{ "title": "Updated Website Title" }

# 4. 访问任意域名都会返回更新后的配置
GET /api/v1/domains/example.com
GET /api/v1/domains/example.org
GET /api/v1/domains/example.net
```

### 场景 2: 域名切换配置

```bash
# 1. 创建两个不同的配置
POST /api/v1/configs
{ "title": "Config A", "author": "Author A" }
# 返回: { "data": { "id": 1, ... } }

POST /api/v1/configs
{ "title": "Config B", "author": "Author B" }
# 返回: { "data": { "id": 2, ... } }

# 2. 创建域名，初始使用配置 A
POST /api/v1/domains
{ "domain": "example.com", "configId": 1 }

# 3. 切换到配置 B
PUT /api/v1/domains/1
{ "configId": 2 }

# 4. 现在访问域名会返回配置 B
GET /api/v1/domains/example.com
```

### 场景 3: 查看配置被哪些域名使用

```bash
# 获取配置详情，包含关联的域名列表
GET /api/v1/configs/1

# 返回:
{
  "data": {
    "id": 1,
    "title": "My Website",
    "domains": [
      { "id": 1, "domain": "example.com" },
      { "id": 2, "domain": "example.org" },
      { "id": 3, "domain": "example.net" }
    ]
  }
}
```

## 数据迁移

### 迁移步骤

1. **备份现有数据**
```bash
mysqldump -u root -p database_name domain > domain_backup.sql
```

2. **执行迁移脚本**
```bash
mysql -u root -p database_name < migrations/002_split_to_two_tables.sql
```

3. **验证数据**
```sql
-- 检查数据迁移是否完整
SELECT 
  (SELECT COUNT(*) FROM domain_backup) as old_count,
  (SELECT COUNT(*) FROM domains) as new_count,
  (SELECT COUNT(*) FROM configs) as config_count;
```

4. **更新应用代码**
   - 使用新的模型 (Config, Domain)
   - 使用新的 Repository 和 Service
   - 更新路由

5. **删除备份表**（确认无误后）
```sql
DROP TABLE domain_backup;
```

### 回滚

如果需要回滚到原始设计:
```bash
mysql -u root -p database_name < migrations/rollback_002.sql
```

## 优势

1. **减少数据冗余**: 配置信息只存储一次
2. **批量更新**: 更新配置自动影响所有关联域名
3. **灵活管理**: 可以轻松切换域名的配置
4. **数据一致性**: 避免同一配置在多处不一致
5. **扩展性**: 未来可以添加更多配置类型

## 注意事项

1. **外键约束**: 删除配置前必须先删除或重新分配关联的域名
2. **缓存失效**: 更新配置时需要清除所有关联域名的缓存
3. **性能**: 查询域名时需要 JOIN 配置表，建议添加适当索引
4. **向后兼容**: 旧的 API 端点可以保留，内部转换为新的数据结构

## Node.js 版本要求

- **推荐版本**: Node.js 24.x LTS (Krypton) - Active LTS
- **最低版本**: Node.js 24.0.0
- **NPM 版本**: >= 10.0.0
- **备选版本**: Node.js 22.x LTS (Jod) 或 Node.js 20.x LTS (Iron)

更新 package.json:
```json
{
  "engines": {
    "node": ">=24.0.0",
    "npm": ">=10.0.0"
  }
}
```
