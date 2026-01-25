# 数据库迁移快速开始

本文档提供快速执行数据库迁移的步骤，添加 `permissions` 字段到现有的 `domain` 表。

## 🚀 快速开始（3 步完成）

### 步骤 1: 备份数据库

```bash
# 备份当前数据库
mysqldump -h localhost -u root -p bujiaban > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤 2: 执行迁移

**方法 A: 使用迁移脚本（推荐）**

```bash
# 使用迁移脚本
./scripts/migrate.sh migrations/001_add_permissions_field.sql
```

**方法 B: 手动执行 SQL**

```bash
# 直接执行 SQL 文件
mysql -h localhost -u root -p bujiaban < migrations/001_add_permissions_field.sql
```

**方法 C: 使用 Docker**

```bash
# 如果使用 Docker Compose
docker exec -i mysql_container mysql -uroot -ppassword bujiaban < migrations/001_add_permissions_field.sql
```

### 步骤 3: 验证迁移

```bash
# 连接数据库
mysql -h localhost -u root -p bujiaban

# 查看表结构
DESCRIBE domain;

# 应该看到 permissions 字段
# +-------------+--------------+------+-----+---------+----------------+
# | Field       | Type         | Null | Key | Default | Extra          |
# +-------------+--------------+------+-----+---------+----------------+
# | id          | int          | NO   | PRI | NULL    | auto_increment |
# | domain      | varchar(255) | NO   | UNI | NULL    |                |
# | title       | varchar(255) | YES  |     | NULL    |                |
# | author      | varchar(255) | YES  |     | NULL    |                |
# | description | varchar(255) | YES  |     | NULL    |                |
# | keywords    | varchar(255) | YES  |     | NULL    |                |
# | links       | json         | YES  |     | NULL    |                |
# | permissions | json         | YES  |     | NULL    |                |
# +-------------+--------------+------+-----+---------+----------------+
```

## ✅ 完成！

迁移完成后，你可以：

1. **在 API 中使用 permissions 字段**

```bash
# 创建带权限配置的域名
curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "title": "Example Site",
    "permissions": {
      "read": true,
      "write": true,
      "admin": false
    }
  }'
```

2. **查询权限配置**

```bash
curl http://localhost:3000/api/v1/domains/example.com
```

3. **更新权限配置**

```bash
curl -X PUT http://localhost:3000/api/v1/domains/1 \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": {
      "read": true,
      "write": false,
      "admin": true
    }
  }'
```

## 🔄 回滚（如需要）

如果需要撤销迁移：

```bash
# 使用迁移脚本
./scripts/migrate.sh --rollback migrations/rollback_001.sql

# 或手动执行
mysql -h localhost -u root -p bujiaban < migrations/rollback_001.sql
```

## 📚 更多信息

- [完整迁移指南](../migrations/README.md)
- [权限配置使用指南](./PERMISSIONS_GUIDE.md)
- [API 文档](./API.md)

## ⚠️ 注意事项

1. **生产环境**: 在生产环境执行前，请先在测试环境验证
2. **备份**: 始终在迁移前备份数据库
3. **权限**: 确保数据库用户有 `ALTER TABLE` 权限
4. **应用重启**: 迁移后可能需要重启应用以加载新的模型定义

## 🆘 故障排查

### 问题：字段已存在

```
ERROR 1060 (42S21): Duplicate column name 'permissions'
```

**解决**: 字段已存在，无需重复执行迁移。

### 问题：权限不足

```
ERROR 1142 (42000): ALTER command denied
```

**解决**: 使用具有 ALTER 权限的数据库用户。

### 问题：连接失败

```
ERROR 2002 (HY000): Can't connect to MySQL server
```

**解决**: 检查数据库连接信息（主机、端口、用户名、密码）。

## 💡 提示

- 使用 `.env` 文件存储数据库连接信息
- 迁移脚本支持环境变量配置
- 可以使用 `--dry-run` 参数预览执行命令

```bash
# 预览执行命令
./scripts/migrate.sh --dry-run migrations/001_add_permissions_field.sql
```
