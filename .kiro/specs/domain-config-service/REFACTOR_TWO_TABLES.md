# 数据库重构方案：双表设计

## 需求
将当前的单表设计重构为双表设计，实现多个域名共享同一份配置信息的功能。

## 新的数据库设计

### 表 1: domains（域名表）
```sql
CREATE TABLE `domains` (
  `id` int NOT NULL AUTO_INCREMENT,
  `domain` varchar(255) NOT NULL UNIQUE,
  `config_id` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`),
  KEY `config_id` (`config_id`),
  FOREIGN KEY (`config_id`) REFERENCES `configs` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 表 2: configs（配置信息表）
```sql
CREATE TABLE `configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `author` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `keywords` varchar(255) DEFAULT NULL,
  `links` json DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 关系说明
- **多对一关系**: 多个域名 (domains) 可以关联到同一个配置 (configs)
- **外键约束**: `domains.config_id` 引用 `configs.id`
- **删除保护**: 使用 `ON DELETE RESTRICT` 防止删除被引用的配置

## API 变化

### 新增 API 端点

#### 配置管理
- `GET /api/v1/configs` - 获取所有配置列表
- `GET /api/v1/configs/:id` - 获取指定配置
- `POST /api/v1/configs` - 创建新配置
- `PUT /api/v1/configs/:id` - 更新配置
- `DELETE /api/v1/configs/:id` - 删除配置（如果没有域名引用）

#### 域名管理（修改）
- `GET /api/v1/domains` - 获取所有域名（包含关联的配置信息）
- `GET /api/v1/domains/:domain` - 通过域名获取（返回域名+配置）
- `POST /api/v1/domains` - 创建域名（需要指定 config_id）
- `PUT /api/v1/domains/:id` - 更新域名（可以更改关联的 config_id）
- `DELETE /api/v1/domains/:id` - 删除域名

## 实现步骤

1. 创建新的数据模型
   - Config 模型
   - Domain 模型（修改）
   
2. 创建新的 Repository
   - ConfigRepository
   - DomainRepository（修改）
   
3. 创建新的 Service
   - ConfigService
   - DomainService（修改）
   
4. 创建新的路由
   - ConfigRoutes
   - DomainRoutes（修改）
   
5. 数据库迁移
   - 创建迁移脚本将现有数据迁移到新表结构

## 优势
- ✅ 减少数据冗余
- ✅ 多个域名可以共享同一份配置
- ✅ 更新配置时自动影响所有关联域名
- ✅ 更灵活的配置管理

## Node.js 版本
- **推荐**: Node.js 24.x LTS (Krypton) - Active LTS
- **备选**: Node.js 22.x LTS (Jod) 或 Node.js 20.x LTS (Iron)
