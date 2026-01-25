-- 仅创建表的初始化脚本
-- 适用于没有创建数据库权限的用户
-- 使用前请确保已在腾讯云控制台创建了 domain_config 数据库

-- ============================================================
-- 使用数据库
-- ============================================================
USE `domain_config`;

-- ============================================================
-- 创建 configs 表（配置表）
-- ============================================================
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

-- ============================================================
-- 创建 domains 表（域名表）
-- ============================================================
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

-- ============================================================
-- 验证表创建
-- ============================================================
SHOW TABLES;

SELECT 'Tables created successfully!' as status;
SELECT 'configs table' as table_name, COUNT(*) as column_count FROM information_schema.columns WHERE table_schema = 'domain_config' AND table_name = 'configs';
SELECT 'domains table' as table_name, COUNT(*) as column_count FROM information_schema.columns WHERE table_schema = 'domain_config' AND table_name = 'domains';
