-- 全新数据库初始化脚本
-- 用于首次部署，创建 configs 和 domains 表

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
-- 验证表创建
-- ============================================================
SHOW TABLES;

-- 查看表结构
DESC configs;
DESC domains;

-- ============================================================
-- 插入示例数据（可选）
-- ============================================================
-- 取消下面的注释来插入测试数据

-- INSERT INTO `configs` (`title`, `author`, `description`, `keywords`, `links`, `permissions`) 
-- VALUES 
--   (
--     'Example Site', 
--     'Admin', 
--     'An example website configuration', 
--     'example, test, demo',
--     '{"api": "https://api.example.com", "docs": "https://docs.example.com"}',
--     '["read", "write"]'
--   );

-- SET @config_id = LAST_INSERT_ID();

-- INSERT INTO `domains` (`domain`, `config_id`, `homepage`) 
-- VALUES 
--   ('example.com', @config_id, 'https://example.com'),
--   ('www.example.com', @config_id, 'https://www.example.com');

-- SELECT * FROM configs;
-- SELECT * FROM domains;

-- ============================================================
-- 初始化完成
-- ============================================================
SELECT 'Database initialization completed successfully!' as status;
