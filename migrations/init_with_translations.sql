-- 全新数据库初始化脚本（包含多语言支持）
-- 用于首次部署，创建 configs、domains 和 translations 表

-- ============================================================
-- 创建数据库（如果不存在）
-- ============================================================
CREATE DATABASE IF NOT EXISTS `domain_config` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

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
-- 创建 translations 表（多语言翻译表）
-- ============================================================
CREATE TABLE IF NOT EXISTS `translations` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '翻译记录ID',
  `config_id` int NOT NULL COMMENT '关联的配置ID',
  `language_code` varchar(10) NOT NULL COMMENT '语言代码 (BCP 47 标准，如 zh-cn, en-us, ja-jp)',
  `title` varchar(200) NOT NULL COMMENT '标题',
  `author` varchar(100) NOT NULL COMMENT '作者',
  `description` varchar(1000) NOT NULL COMMENT '描述',
  `keywords` text NOT NULL COMMENT '关键词 (JSON 数组格式)',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_config_language` (`config_id`, `language_code`),
  KEY `idx_language_code` (`language_code`),
  CONSTRAINT `fk_translation_config` FOREIGN KEY (`config_id`) 
    REFERENCES `configs` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='多语言翻译表';

-- ============================================================
-- 验证表创建
-- ============================================================
SHOW TABLES;

-- 查看表结构
DESC configs;
DESC domains;
DESC translations;

-- ============================================================
-- 初始化完成
-- ============================================================
SELECT 'Database initialization with translations completed successfully!' as status;
