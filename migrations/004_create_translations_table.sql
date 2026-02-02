-- 迁移脚本: 创建 translations 表
-- 版本: 004
-- 日期: 2026-01-24
-- 描述: 创建 translations 表用于存储多语言内容，支持配置的多语言翻译

-- ============================================================
-- 步骤 1: 创建 translations 表
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
  
  -- 唯一复合索引：确保每个配置的每种语言只有一个翻译
  UNIQUE KEY `unique_config_language` (`config_id`, `language_code`),
  
  -- 语言代码索引：优化按语言查询的性能
  KEY `idx_language_code` (`language_code`),
  
  -- 外键约束：级联删除，当配置被删除时自动删除所有关联的翻译
  CONSTRAINT `fk_translation_config` 
    FOREIGN KEY (`config_id`) 
    REFERENCES `configs` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='多语言翻译表';

-- ============================================================
-- 步骤 2: 验证表结构
-- ============================================================
-- 检查表是否创建成功
SELECT 
    TABLE_NAME,
    TABLE_COMMENT,
    ENGINE,
    TABLE_COLLATION
FROM 
    INFORMATION_SCHEMA.TABLES
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'translations';

-- 检查列定义
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'translations'
ORDER BY 
    ORDINAL_POSITION;

-- 检查索引
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX
FROM 
    INFORMATION_SCHEMA.STATISTICS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'translations'
ORDER BY 
    INDEX_NAME, SEQ_IN_INDEX;

-- 检查外键约束
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME,
    DELETE_RULE,
    UPDATE_RULE
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'translations'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ============================================================
-- 注意事项
-- ============================================================
-- 1. 此迁移创建了 translations 表，用于存储多语言内容
-- 2. 每个配置 (config_id) 可以有多个翻译，但每种语言 (language_code) 只能有一个翻译
-- 3. 语言代码遵循 BCP 47 标准，存储为小写带连字符格式 (如 zh-cn, en-us, ja-jp)
-- 4. 外键约束确保了引用完整性，删除配置时会自动删除所有关联的翻译
-- 5. 如需回滚，请使用 rollback_004.sql
-- 6. 迁移现有数据请使用单独的数据迁移脚本

