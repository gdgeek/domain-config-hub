-- 迁移脚本: 添加 permissions 字段
-- 版本: 001
-- 日期: 2026-01-24
-- 描述: 为 domain 表添加 permissions 字段，用于存储网站权限配置

-- 添加 permissions 字段
ALTER TABLE `domain` 
ADD COLUMN `permissions` json DEFAULT NULL COMMENT '权限配置 (JSON)' 
AFTER `links`;

-- 验证字段是否添加成功
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'domain'
    AND COLUMN_NAME = 'permissions';
