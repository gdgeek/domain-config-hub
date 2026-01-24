-- 域名配置表迁移脚本
-- 创建 domain 表用于存储域名配置信息
--
-- 需求: 数据库结构
-- 对应设计文档中的 Domain 实体

-- 如果表已存在则删除（仅用于开发环境，生产环境请谨慎使用）
-- DROP TABLE IF EXISTS `domain`;

-- 创建 domain 表
CREATE TABLE IF NOT EXISTS `domain` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `domain` varchar(255) NOT NULL COMMENT '域名（唯一）',
  `title` varchar(255) DEFAULT NULL COMMENT '标题',
  `author` varchar(255) DEFAULT NULL COMMENT '作者',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `keywords` varchar(255) DEFAULT NULL COMMENT '关键词',
  `links` json DEFAULT NULL COMMENT '链接配置（JSON格式）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='域名配置表';

-- 创建索引以提高查询性能
-- 域名字段已通过 UNIQUE KEY 自动创建索引

-- 示例数据（可选，用于测试）
-- INSERT INTO `domain` (`domain`, `title`, `author`, `description`, `keywords`, `links`) 
-- VALUES 
--   ('example.com', 'Example Domain', 'John Doe', 'An example domain configuration', 'example, test', '{"homepage": "https://example.com", "api": "https://api.example.com"}'),
--   ('test.com', 'Test Domain', 'Jane Smith', 'A test domain configuration', 'test, demo', '{"homepage": "https://test.com"}');
