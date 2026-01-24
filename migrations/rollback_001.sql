-- 回滚脚本: 移除 permissions 字段
-- 版本: 001
-- 日期: 2026-01-24
-- 描述: 回滚添加 permissions 字段的迁移

-- 移除 permissions 字段
ALTER TABLE `domain` 
DROP COLUMN `permissions`;

-- 验证字段是否已移除
SELECT 
    COUNT(*) as field_exists
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'domain'
    AND COLUMN_NAME = 'permissions';
-- 结果应该为 0
