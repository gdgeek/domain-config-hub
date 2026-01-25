# 数据库初始化指南

## 📋 概述

本指南详细说明如何初始化腾讯云 MySQL 数据库，包括创建数据库、导入表结构和初始数据。

---

## 🎯 快速初始化（5 分钟）

### 方法 1: 使用腾讯云控制台（推荐）

#### 步骤 1: 创建数据库

1. 登录腾讯云控制台
2. 进入 **云数据库 MySQL**
3. 选择你的实例
4. 点击 **数据库管理** → **创建数据库**
5. 填写信息：
   ```
   数据库名: domain_config
   字符集: utf8mb4
   排序规则: utf8mb4_unicode_ci
   ```
6. 点击 **确定**

#### 步骤 2: 下载初始化脚本

```bash
# 下载完整的初始化脚本
wget https://raw.githubusercontent.com/gdgeek/domain-config-hub/main/migrations/002_split_to_two_tables.sql

# 或者使用 curl
curl -O https://raw.githubusercontent.com/gdgeek/domain-config-hub/main/migrations/002_split_to_two_tables.sql
```

#### 步骤 3: 导入数据库

**选项 A: 使用腾讯云控制台**

1. 在数据库管理页面
2. 点击 **SQL 窗口**
3. 粘贴脚本内容
4. 点击 **执行**

**选项 B: 使用命令行**

```bash
mysql -h rm-xxxxx.mysql.rds.tencentyun.com \
      -P 3306 \
      -u root \
      -p \
      domain_config < 002_split_to_two_tables.sql
```

#### 步骤 4: 验证初始化

```bash
# 连接数据库
mysql -h rm-xxxxx.mysql.rds.tencentyun.com -u root -p domain_config

# 查看表
SHOW TABLES;

# 应该看到:
# +-------------------------+
# | Tables_in_domain_config |
# +-------------------------+
# | configs                 |
# | domains                 |
# +-------------------------+

# 查看表结构
DESC configs;
DESC domains;

# 退出
EXIT;
```

---

## 📝 详细步骤

### 方法 2: 完整手动初始化

#### 步骤 1: 连接到 MySQL

```bash
mysql -h rm-xxxxx.mysql.rds.tencentyun.com \
      -P 3306 \
      -u root \
      -p
```

输入密码后进入 MySQL 命令行。

#### 步骤 2: 创建数据库

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS `domain_config` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE `domain_config`;

-- 验证
SELECT DATABASE();
```

#### 步骤 3: 创建 configs 表

```sql
-- 配置表（存储域名配置信息）
CREATE TABLE IF NOT EXISTS `configs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `title` varchar(255) DEFAULT NULL COMMENT '标题',
  `author` varchar(255) DEFAULT NULL COMMENT '作者',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `keywords` varchar(255) DEFAULT NULL COMMENT '关键词',
  `links` json DEFAULT NULL COMMENT '链接配置',
  `permissions` json DEFAULT NULL COMMENT '权限配置',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配置表';
```

#### 步骤 4: 创建 domains 表

```sql
-- 域名表（存储域名和配置的关联）
CREATE TABLE IF NOT EXISTS `domains` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '域名ID',
  `domain` varchar(255) NOT NULL COMMENT '域名',
  `config_id` int NOT NULL COMMENT '关联的配置ID',
  `homepage` varchar(500) DEFAULT NULL COMMENT '主页地址',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`),
  KEY `config_id` (`config_id`),
  CONSTRAINT `fk_domains_config` FOREIGN KEY (`config_id`) 
    REFERENCES `configs` (`id`) 
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='域名表';
```

#### 步骤 5: 验证表结构

```sql
-- 查看所有表
SHOW TABLES;

-- 查看 configs 表结构
DESC configs;

-- 查看 domains 表结构
DESC domains;

-- 查看外键约束
SHOW CREATE TABLE domains;
```

#### 步骤 6: 插入测试数据（可选）

```sql
-- 插入测试配置
INSERT INTO `configs` (`title`, `author`, `description`, `keywords`, `links`, `permissions`) 
VALUES 
  (
    'Example Site', 
    'John Doe', 
    'An example website configuration', 
    'example, test, demo',
    '{"api": "https://api.example.com", "docs": "https://docs.example.com"}',
    '["read", "write"]'
  );

-- 获取刚插入的配置ID
SET @config_id = LAST_INSERT_ID();

-- 插入测试域名
INSERT INTO `domains` (`domain`, `config_id`, `homepage`) 
VALUES 
  ('example.com', @config_id, 'https://example.com'),
  ('www.example.com', @config_id, 'https://www.example.com');

-- 验证数据
SELECT * FROM configs;
SELECT * FROM domains;

-- 联合查询验证
SELECT 
  d.domain,
  d.homepage,
  c.title,
  c.author,
  c.description
FROM domains d
JOIN configs c ON d.config_id = c.id;
```

---

## 🔄 迁移脚本说明

### 完整初始化脚本

项目提供了完整的迁移脚本：

**位置：** `migrations/002_split_to_two_tables.sql`

**包含内容：**
1. 创建 `configs` 表
2. 创建 `domains` 表
3. 创建索引和外键约束
4. 数据验证查询

**使用方法：**

```bash
# 方法 1: 直接导入
mysql -h your-mysql-host -u root -p domain_config < migrations/002_split_to_two_tables.sql

# 方法 2: 在 MySQL 命令行中执行
mysql -h your-mysql-host -u root -p domain_config
SOURCE migrations/002_split_to_two_tables.sql;
```

---

## 🐳 Docker 环境初始化

### 使用 Docker Compose

如果使用 Docker Compose 部署，数据库会自动初始化。

**docker-compose.yml 配置：**

```yaml
services:
  mysql:
    image: mysql:8.0
    volumes:
      # 自动执行初始化脚本
      - ./src/models/migrations/domain.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      - MYSQL_DATABASE=domain_config
```

**工作原理：**
- MySQL 容器启动时会自动执行 `/docker-entrypoint-initdb.d/` 目录下的 SQL 脚本
- 只在首次创建数据库时执行
- 适合开发和测试环境

---

## 🔍 验证初始化

### 检查表结构

```sql
-- 连接数据库
USE domain_config;

-- 查看所有表
SHOW TABLES;

-- 预期输出:
-- +-------------------------+
-- | Tables_in_domain_config |
-- +-------------------------+
-- | configs                 |
-- | domains                 |
-- +-------------------------+

-- 查看表数量
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'domain_config';

-- 预期: 2
```

### 检查表结构详情

```sql
-- configs 表结构
DESC configs;

-- 预期字段:
-- id, title, author, description, keywords, links, permissions, created_at, updated_at

-- domains 表结构
DESC domains;

-- 预期字段:
-- id, domain, config_id, homepage, created_at, updated_at
```

### 检查索引

```sql
-- 查看 configs 表索引
SHOW INDEX FROM configs;

-- 查看 domains 表索引
SHOW INDEX FROM domains;

-- 预期: domain 字段有 UNIQUE 索引
-- 预期: config_id 字段有普通索引
```

### 检查外键约束

```sql
-- 查看外键约束
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'domain_config'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 预期: domains.config_id → configs.id
```

### 测试插入数据

```sql
-- 测试插入配置
INSERT INTO configs (title, author) VALUES ('Test Config', 'Test Author');

-- 获取ID
SET @test_config_id = LAST_INSERT_ID();

-- 测试插入域名
INSERT INTO domains (domain, config_id) VALUES ('test.com', @test_config_id);

-- 验证
SELECT * FROM configs WHERE id = @test_config_id;
SELECT * FROM domains WHERE config_id = @test_config_id;

-- 清理测试数据
DELETE FROM domains WHERE config_id = @test_config_id;
DELETE FROM configs WHERE id = @test_config_id;
```

---

## 🚨 常见问题

### 问题 1: 连接被拒绝

**错误信息：**
```
ERROR 2003 (HY000): Can't connect to MySQL server on 'xxx' (111)
```

**解决方案：**
1. 检查 MySQL 实例是否运行
2. 检查安全组是否允许你的 IP 访问 3306 端口
3. 确认使用内网地址（如果在同一 VPC）

### 问题 2: 访问被拒绝

**错误信息：**
```
ERROR 1045 (28000): Access denied for user 'root'@'xxx'
```

**解决方案：**
1. 确认用户名和密码正确
2. 检查用户是否有权限访问该数据库
3. 在腾讯云控制台重置密码

### 问题 3: 数据库已存在

**错误信息：**
```
ERROR 1007 (HY000): Can't create database 'domain_config'; database exists
```

**解决方案：**
```sql
-- 查看现有数据库
SHOW DATABASES;

-- 如果需要重新创建（⚠️ 会删除所有数据）
DROP DATABASE domain_config;
CREATE DATABASE domain_config;

-- 或者直接使用现有数据库
USE domain_config;
```

### 问题 4: 表已存在

**错误信息：**
```
ERROR 1050 (42S01): Table 'configs' already exists
```

**解决方案：**
```sql
-- 查看现有表
SHOW TABLES;

-- 如果需要重新创建（⚠️ 会删除所有数据）
DROP TABLE IF EXISTS domains;  -- 先删除有外键的表
DROP TABLE IF EXISTS configs;

-- 然后重新执行创建脚本
```

### 问题 5: 字符集问题

**错误信息：**
```
ERROR 1115 (42000): Unknown character set: 'utf8mb4'
```

**解决方案：**
```sql
-- 检查 MySQL 版本
SELECT VERSION();

-- MySQL 5.5+ 支持 utf8mb4
-- 如果版本太低，使用 utf8
CREATE DATABASE domain_config 
  DEFAULT CHARACTER SET utf8 
  COLLATE utf8_unicode_ci;
```

---

## 🔧 高级配置

### 性能优化

```sql
-- 为常用查询添加索引
ALTER TABLE domains ADD INDEX idx_created_at (created_at);
ALTER TABLE configs ADD INDEX idx_created_at (created_at);

-- 查看索引使用情况
SHOW INDEX FROM domains;
SHOW INDEX FROM configs;
```

### 备份初始化脚本

```bash
# 导出数据库结构（不含数据）
mysqldump -h your-mysql-host -u root -p \
  --no-data \
  domain_config > schema_backup.sql

# 导出完整数据库（含数据）
mysqldump -h your-mysql-host -u root -p \
  domain_config > full_backup.sql

# 恢复数据库
mysql -h your-mysql-host -u root -p \
  domain_config < full_backup.sql
```

### 权限管理

```sql
-- 创建应用专用用户（推荐）
CREATE USER 'domain_app'@'%' IDENTIFIED BY 'strong_password';

-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON domain_config.* TO 'domain_app'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 验证权限
SHOW GRANTS FOR 'domain_app'@'%';
```

---

## 📚 相关文档

- [数据库迁移快速指南](./DATABASE_MIGRATION_QUICKSTART.md)
- [双表设计文档](./TWO_TABLES_DESIGN.md)
- [Portainer 部署指南](./PORTAINER_DEPLOYMENT_GUIDE.md)

---

## ✅ 初始化检查清单

### 部署前

- [ ] 创建腾讯云 MySQL 实例
- [ ] 配置安全组规则
- [ ] 记录连接信息（主机、端口、用户名、密码）
- [ ] 下载初始化脚本

### 初始化

- [ ] 创建数据库 `domain_config`
- [ ] 创建 `configs` 表
- [ ] 创建 `domains` 表
- [ ] 验证表结构
- [ ] 验证索引和外键
- [ ] 测试插入数据

### 部署后

- [ ] 应用能成功连接数据库
- [ ] 健康检查接口返回正常
- [ ] 可以通过 API 创建配置
- [ ] 可以通过 API 创建域名
- [ ] 数据正确存储和查询

---

**更新时间**: 2026-01-25
