-- 迁移脚本: 将单表拆分为双表设计
-- 版本: 002
-- 描述: 创建 configs 表和新的 domains 表，实现多对一关系

-- ============================================================
-- 步骤 1: 创建新的 configs 表
-- ============================================================
CREATE TABLE IF NOT EXISTS `configs` (
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

-- ============================================================
-- 步骤 2: 迁移现有数据到 configs 表
-- ============================================================
-- 从旧的 domain 表中提取唯一的配置组合
INSERT INTO `configs` (`title`, `author`, `description`, `keywords`, `links`, `permissions`)
SELECT DISTINCT 
  `title`, 
  `author`, 
  `description`, 
  `keywords`, 
  `links`,
  `permissions`
FROM `domain`
WHERE `title` IS NOT NULL 
   OR `author` IS NOT NULL 
   OR `description` IS NOT NULL 
   OR `keywords` IS NOT NULL 
   OR `links` IS NOT NULL
   OR `permissions` IS NOT NULL;

-- ============================================================
-- 步骤 3: 重命名旧表并创建新的 domains 表
-- ============================================================
RENAME TABLE `domain` TO `domain_backup`;

CREATE TABLE `domains` (
  `id` int NOT NULL AUTO_INCREMENT,
  `domain` varchar(255) NOT NULL,
  `config_id` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`),
  KEY `config_id` (`config_id`),
  CONSTRAINT `fk_domains_config` FOREIGN KEY (`config_id`) REFERENCES `configs` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 步骤 4: 迁移域名数据到新的 domains 表
-- ============================================================
-- 为每个域名找到对应的 config_id
INSERT INTO `domains` (`domain`, `config_id`)
SELECT 
  d.`domain`,
  c.`id` as config_id
FROM `domain_backup` d
LEFT JOIN `configs` c ON (
  (d.`title` = c.`title` OR (d.`title` IS NULL AND c.`title` IS NULL))
  AND (d.`author` = c.`author` OR (d.`author` IS NULL AND c.`author` IS NULL))
  AND (d.`description` = c.`description` OR (d.`description` IS NULL AND c.`description` IS NULL))
  AND (d.`keywords` = c.`keywords` OR (d.`keywords` IS NULL AND c.`keywords` IS NULL))
  AND (JSON_EXTRACT(d.`links`, '$') = JSON_EXTRACT(c.`links`, '$') OR (d.`links` IS NULL AND c.`links` IS NULL))
  AND (JSON_EXTRACT(d.`permissions`, '$') = JSON_EXTRACT(c.`permissions`, '$') OR (d.`permissions` IS NULL AND c.`permissions` IS NULL))
);

-- ============================================================
-- 步骤 5: 验证数据迁移
-- ============================================================
-- 检查是否所有域名都已迁移
SELECT 
  (SELECT COUNT(*) FROM `domain_backup`) as old_count,
  (SELECT COUNT(*) FROM `domains`) as new_count,
  (SELECT COUNT(*) FROM `configs`) as config_count;

-- ============================================================
-- 注意事项
-- ============================================================
-- 1. 迁移完成后，请验证数据正确性
-- 2. 确认无误后，可以删除 domain_backup 表: DROP TABLE `domain_backup`;
-- 3. 如果需要回滚，请使用 rollback_002.sql
