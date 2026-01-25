-- 添加 homepage 列到 domains 表
-- Migration: 003_add_homepage_to_domains
-- Description: 为 domains 表添加 homepage 字段，用于存储域名的主页 URL

ALTER TABLE domains 
ADD COLUMN homepage VARCHAR(500) NULL COMMENT '域名主页 URL';

-- 为现有记录设置默认值（可选）
-- UPDATE domains SET homepage = CONCAT('https://', domain) WHERE homepage IS NULL;
