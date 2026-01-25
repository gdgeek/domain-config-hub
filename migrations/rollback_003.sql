-- 回滚 homepage 列
-- Rollback: 003_add_homepage_to_domains
-- Description: 移除 domains 表的 homepage 字段

ALTER TABLE domains 
DROP COLUMN homepage;
