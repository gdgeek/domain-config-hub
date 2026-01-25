# 数据库迁移指南

本目录包含域名配置服务的数据库迁移脚本。

## 目录结构

```
migrations/
├── README.md                          # 本文件
├── 001_add_permissions_field.sql      # 添加 permissions 字段
├── rollback_001.sql                   # 回滚 001 迁移
└── migrate.ts                         # 迁移执行工具（待实现）
```

## 迁移脚本命名规范

- 正向迁移: `{版本号}_{描述}.sql`
- 回滚脚本: `rollback_{版本号}.sql`

## 使用方法

### 方法一：手动执行 SQL（推荐用于生产环境）

#### 1. 连接到数据库

```bash
# 使用 MySQL 客户端连接
mysql -h <host> -u <username> -p <database_name>

# 或使用 Docker
docker exec -it <mysql_container> mysql -u <username> -p <database_name>
```

#### 2. 执行迁移脚本

```bash
# 在 MySQL 客户端中执行
source /path/to/migrations/001_add_permissions_field.sql;

# 或从命令行直接执行
mysql -h <host> -u <username> -p <database_name> < migrations/001_add_permissions_field.sql
```

#### 3. 验证迁移结果

```sql
-- 查看 domain 表结构
DESCRIBE domain;

-- 或查看详细信息
SHOW FULL COLUMNS FROM domain;
```

#### 4. 回滚（如需要）

```bash
mysql -h <host> -u <username> -p <database_name> < migrations/rollback_001.sql
```

### 方法二：使用 Docker Compose（开发环境）

如果你使用 Docker Compose 运行数据库：

```bash
# 执行迁移
docker exec -i <mysql_container> mysql -u<username> -p<password> <database_name> < migrations/001_add_permissions_field.sql

# 回滚
docker exec -i <mysql_container> mysql -u<username> -p<password> <database_name> < migrations/rollback_001.sql
```

### 方法三：使用环境变量（推荐）

```bash
# 设置环境变量
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=bujiaban

# 执行迁移
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/001_add_permissions_field.sql

# 回滚
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/rollback_001.sql
```

## 迁移历史

| 版本 | 日期 | 描述 | 状态 |
|------|------|------|------|
| 001 | 2026-01-24 | 添加 permissions 字段 | ✅ 可用 |

## Permissions 字段说明

### 字段信息

- **字段名**: `permissions`
- **类型**: `JSON`
- **可空**: `YES`
- **默认值**: `NULL`
- **说明**: 存储网站权限配置

### 数据格式示例

```json
{
  "read": true,
  "write": false,
  "admin": false,
  "features": {
    "comments": true,
    "upload": false,
    "api_access": true
  },
  "roles": ["viewer", "contributor"],
  "restrictions": {
    "max_requests_per_day": 1000,
    "allowed_ips": ["192.168.1.0/24"]
  }
}
```

### 使用示例

#### 创建带权限配置的域名

```typescript
const domain = await domainService.create({
  domain: 'example.com',
  title: 'Example Site',
  permissions: {
    read: true,
    write: true,
    admin: false,
    features: {
      comments: true,
      upload: true
    }
  }
});
```

#### 更新权限配置

```typescript
await domainService.update(domainId, {
  permissions: {
    read: true,
    write: false,
    admin: true
  }
});
```

#### 查询权限配置

```typescript
const domain = await domainService.getById(domainId);
console.log(domain.permissions);
// 输出: { read: true, write: false, admin: true }
```

#### SQL 查询示例

```sql
-- 查询所有有管理员权限的域名
SELECT * FROM domain 
WHERE JSON_EXTRACT(permissions, '$.admin') = true;

-- 查询允许写入的域名
SELECT * FROM domain 
WHERE JSON_EXTRACT(permissions, '$.write') = true;

-- 更新特定域名的权限
UPDATE domain 
SET permissions = JSON_SET(
  COALESCE(permissions, '{}'),
  '$.admin', true,
  '$.write', true
)
WHERE domain = 'example.com';
```

## 注意事项

1. **备份数据库**: 在执行任何迁移前，请先备份数据库
   ```bash
   mysqldump -h <host> -u <username> -p <database_name> > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **测试环境验证**: 先在测试环境执行迁移，确认无误后再在生产环境执行

3. **权限要求**: 执行迁移需要 `ALTER TABLE` 权限

4. **版本控制**: 记录已执行的迁移版本，避免重复执行

5. **JSON 字段性能**: 
   - JSON 字段查询性能较低，如需频繁查询特定字段，考虑添加虚拟列或索引
   - MySQL 5.7+ 支持 JSON 字段索引

## 故障排查

### 问题：字段已存在

```
ERROR 1060 (42S21): Duplicate column name 'permissions'
```

**解决方案**: 字段已存在，无需重复执行迁移

### 问题：权限不足

```
ERROR 1142 (42000): ALTER command denied
```

**解决方案**: 使用具有 ALTER 权限的数据库用户

### 问题：JSON 格式错误

```
ERROR 3140 (22032): Invalid JSON text
```

**解决方案**: 确保插入的 JSON 数据格式正确，可使用 `JSON_VALID()` 函数验证

## 最佳实践

1. **权限配置结构化**: 定义统一的权限配置结构，便于管理和验证
2. **默认权限**: 为新创建的域名设置合理的默认权限
3. **权限验证**: 在应用层实现权限验证逻辑
4. **审计日志**: 记录权限配置的变更历史
5. **文档维护**: 及时更新权限配置的文档说明

## 相关文件

- `src/models/Domain.ts` - Domain 模型定义
- `src/validation/schemas.ts` - 验证规则（需更新以支持 permissions）
- `migrations/domain.sql` - 完整的表结构定义

## 支持

如有问题，请查看项目文档或联系开发团队。
