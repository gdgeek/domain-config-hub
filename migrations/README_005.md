# 迁移 005: 配置数据迁移到 translations 表

## 概述

此迁移脚本将现有 `configs` 表中的可翻译字段（title, author, description, keywords）迁移到新的 `translations` 表中，为每个配置创建默认语言（zh-cn）的翻译记录。

## 前置条件

在执行此迁移之前，必须先执行：
- ✅ 迁移 004: 创建 translations 表 (`004_create_translations_table.sql`)

## 迁移内容

### 数据迁移

从 `configs` 表迁移以下字段到 `translations` 表：
- `title` → `translations.title`
- `author` → `translations.author`
- `description` → `translations.description`
- `keywords` → `translations.keywords`

### 默认值处理

对于 NULL 值，使用以下默认值：
- `title`: `'Untitled'`
- `author`: `'Unknown'`
- `description`: `''` (空字符串)
- `keywords`: `'[]'` (空 JSON 数组)

### 语言设置

- 默认语言代码: `zh-cn` (中文简体)
- 所有迁移的记录都将使用此语言代码

## 执行步骤

### 方法 1: 使用 migrate.sh 脚本（推荐）

```bash
# 1. 确保数据库正在运行
make up

# 2. 执行迁移
./scripts/migrate.sh migrations/005_migrate_config_data_to_translations.sql

# 3. 验证迁移结果（查看输出中的验证查询结果）
```

### 方法 2: 使用 MySQL 客户端

```bash
# 1. 连接到数据库
mysql -h localhost -P 3306 -u root -p domain_config

# 2. 执行迁移脚本
source migrations/005_migrate_config_data_to_translations.sql;

# 3. 退出
exit;
```

### 方法 3: 使用 Docker

```bash
# 1. 复制迁移文件到容器
docker cp migrations/005_migrate_config_data_to_translations.sql domain-config-mysql:/tmp/

# 2. 在容器中执行
docker exec -i domain-config-mysql mysql -u root -p${DB_PASSWORD} domain_config < /tmp/005_migrate_config_data_to_translations.sql
```

## 验证

迁移脚本包含多个验证步骤，会自动输出以下信息：

### 1. 迁移前验证
- configs 表中的记录总数
- 各字段的非 NULL 记录数
- 现有的翻译记录数（避免重复迁移）

### 2. 迁移后验证
- 新创建的翻译记录数
- 每个配置是否都有 zh-cn 翻译
- 是否有配置缺少翻译

### 3. 数据完整性验证
- 检查所有必填字段是否完整
- 统计迁移摘要

### 手动验证查询

```sql
-- 检查迁移的记录数
SELECT COUNT(*) AS zh_cn_translations 
FROM translations 
WHERE language_code = 'zh-cn';

-- 检查是否所有配置都有翻译
SELECT 
    c.id,
    c.title AS original_title,
    t.title AS translated_title,
    t.language_code
FROM configs c
LEFT JOIN translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
ORDER BY c.id;

-- 检查缺少翻译的配置
SELECT c.id, c.title
FROM configs c
LEFT JOIN translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE t.id IS NULL;
```

## 回滚

如果需要回滚此迁移：

```bash
# 使用 migrate.sh 脚本
./scripts/migrate.sh --rollback migrations/rollback_005.sql

# 或使用 MySQL 客户端
mysql -h localhost -P 3306 -u root -p domain_config < migrations/rollback_005.sql
```

**警告**: 回滚将删除所有 zh-cn 语言的翻译记录，包括手动添加的记录。

## 注意事项

### 重要提示

1. **数据安全**: 
   - 迁移前请备份数据库
   - 建议先在测试环境执行
   - 迁移脚本使用 `NOT IN` 子查询避免重复迁移

2. **原始数据保留**:
   - 迁移后，`configs` 表中的原始字段（title, author, description, keywords）仍然保留
   - 这些字段将在后续迁移中删除
   - 在删除前，系统可以使用这些字段作为备份

3. **幂等性**:
   - 此迁移脚本是幂等的，可以安全地多次执行
   - 已存在的 zh-cn 翻译不会被重复创建

4. **性能考虑**:
   - 对于大量数据，迁移可能需要一些时间
   - 建议在低峰期执行

### 后续步骤

迁移完成后，需要：

1. ✅ 验证所有配置都有 zh-cn 翻译
2. ✅ 测试应用程序是否能正确读取翻译数据
3. ⏳ 在后续迁移中删除 `configs` 表中的可翻译字段
4. ⏳ 更新应用代码以使用 `translations` 表

## 相关需求

此迁移实现以下需求：
- **Requirement 7.4**: 向后兼容性 - 迁移现有配置数据

## 故障排除

### 问题 1: 外键约束错误

**错误**: `Cannot add or update a child row: a foreign key constraint fails`

**原因**: 尝试为不存在的 config_id 创建翻译

**解决**: 确保 configs 表中存在对应的记录

### 问题 2: 唯一约束冲突

**错误**: `Duplicate entry for key 'unique_config_language'`

**原因**: 已存在相同 config_id 和 language_code 的翻译

**解决**: 这是正常的，迁移脚本会跳过已存在的记录

### 问题 3: 字段长度超限

**错误**: `Data too long for column 'title'`

**原因**: 原始数据中的字段值超过 translations 表的限制

**解决**: 
```sql
-- 检查超长字段
SELECT id, title, LENGTH(title) AS title_length
FROM configs
WHERE LENGTH(title) > 200;

-- 手动截断或修正数据
UPDATE configs
SET title = SUBSTRING(title, 1, 200)
WHERE LENGTH(title) > 200;
```

## 测试

### 单元测试

迁移完成后，运行以下测试验证：

```bash
# 运行所有测试
npm test

# 运行数据库相关测试
npm test -- --testPathPattern=database
```

### 集成测试

```bash
# 测试配置查询 API
curl http://localhost:3000/api/configs/1

# 测试翻译查询 API
curl http://localhost:3000/api/configs/1/translations
```

## 版本信息

- **版本**: 005
- **日期**: 2026-01-24
- **作者**: System
- **依赖**: 004_create_translations_table.sql
- **状态**: Ready for execution

## 相关文件

- 迁移脚本: `migrations/005_migrate_config_data_to_translations.sql`
- 回滚脚本: `migrations/rollback_005.sql`
- 前置迁移: `migrations/004_create_translations_table.sql`
- 文档: `migrations/README_005.md` (本文件)
