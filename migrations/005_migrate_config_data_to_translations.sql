-- 迁移脚本: 将现有配置数据迁移到 translations 表
-- 版本: 005
-- 日期: 2026-01-24
-- 描述: 从 configs 表读取现有的 title, author, description, keywords 字段，
--       为每个配置创建默认语言（zh-cn）的翻译记录

-- ============================================================
-- 步骤 1: 数据迁移前的验证
-- ============================================================
-- 检查 configs 表中有多少条记录需要迁移
SELECT 
    COUNT(*) AS total_configs,
    COUNT(title) AS configs_with_title,
    COUNT(author) AS configs_with_author,
    COUNT(description) AS configs_with_description,
    COUNT(keywords) AS configs_with_keywords
FROM 
    configs;

-- 检查是否已有翻译记录（避免重复迁移）
SELECT 
    COUNT(*) AS existing_translations
FROM 
    translations;

-- ============================================================
-- 步骤 2: 执行数据迁移
-- ============================================================
-- 将 configs 表中的可翻译字段迁移到 translations 表
-- 使用默认语言 zh-cn
-- 对于 NULL 值，使用合理的默认值
INSERT INTO translations (
    config_id,
    language_code,
    title,
    author,
    description,
    keywords,
    created_at,
    updated_at
)
SELECT 
    id AS config_id,
    'zh-cn' AS language_code,
    COALESCE(title, 'Untitled') AS title,
    COALESCE(author, 'Unknown') AS author,
    COALESCE(description, '') AS description,
    COALESCE(keywords, '[]') AS keywords,
    created_at,
    updated_at
FROM 
    configs
WHERE 
    -- 只迁移尚未有 zh-cn 翻译的配置
    id NOT IN (
        SELECT config_id 
        FROM translations 
        WHERE language_code = 'zh-cn'
    );

-- ============================================================
-- 步骤 3: 验证迁移结果
-- ============================================================
-- 检查迁移后的翻译记录数量
SELECT 
    COUNT(*) AS total_translations,
    COUNT(DISTINCT config_id) AS configs_with_translations
FROM 
    translations
WHERE 
    language_code = 'zh-cn';

-- 验证每个配置都有 zh-cn 翻译
SELECT 
    c.id AS config_id,
    c.title AS original_title,
    t.title AS translated_title,
    t.language_code
FROM 
    configs c
LEFT JOIN 
    translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
ORDER BY 
    c.id;

-- 检查是否有配置缺少 zh-cn 翻译
SELECT 
    c.id AS config_id,
    c.title AS original_title
FROM 
    configs c
LEFT JOIN 
    translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE 
    t.id IS NULL;

-- ============================================================
-- 步骤 4: 数据完整性验证
-- ============================================================
-- 验证翻译记录的字段完整性
SELECT 
    config_id,
    language_code,
    CASE 
        WHEN title IS NULL OR title = '' THEN 'MISSING'
        ELSE 'OK'
    END AS title_status,
    CASE 
        WHEN author IS NULL OR author = '' THEN 'MISSING'
        ELSE 'OK'
    END AS author_status,
    CASE 
        WHEN description IS NULL THEN 'MISSING'
        ELSE 'OK'
    END AS description_status,
    CASE 
        WHEN keywords IS NULL OR keywords = '' THEN 'MISSING'
        ELSE 'OK'
    END AS keywords_status
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
    AND (
        title IS NULL OR title = '' OR
        author IS NULL OR author = '' OR
        description IS NULL OR
        keywords IS NULL OR keywords = ''
    );

-- 统计迁移结果
SELECT 
    'Migration Summary' AS summary,
    (SELECT COUNT(*) FROM configs) AS total_configs,
    (SELECT COUNT(*) FROM translations WHERE language_code = 'zh-cn') AS zh_cn_translations,
    (SELECT COUNT(*) FROM configs) - (SELECT COUNT(*) FROM translations WHERE language_code = 'zh-cn') AS missing_translations;

-- ============================================================
-- 注意事项
-- ============================================================
-- 1. 此迁移脚本将 configs 表中的可翻译字段迁移到 translations 表
-- 2. 默认语言设置为 zh-cn（中文简体）
-- 3. 对于 NULL 值的处理：
--    - title: 使用 'Untitled'
--    - author: 使用 'Unknown'
--    - description: 使用空字符串 ''
--    - keywords: 使用空 JSON 数组 '[]'
-- 4. 迁移脚本使用 NOT IN 子查询避免重复迁移
-- 5. 迁移后，configs 表中的 title, author, description, keywords 字段仍然保留
--    （需要在后续迁移中删除这些字段）
-- 6. 如需回滚，请使用 rollback_005.sql
-- 7. 建议在生产环境执行前先在测试环境验证

-- ============================================================
-- 可选：创建迁移日志表（用于审计）
-- ============================================================
-- CREATE TABLE IF NOT EXISTS migration_log (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     migration_version VARCHAR(50) NOT NULL,
--     migration_name VARCHAR(255) NOT NULL,
--     records_migrated INT NOT NULL,
--     executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     status ENUM('success', 'failed') NOT NULL,
--     notes TEXT
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 
-- INSERT INTO migration_log (migration_version, migration_name, records_migrated, status, notes)
-- SELECT 
--     '005' AS migration_version,
--     'migrate_config_data_to_translations' AS migration_name,
--     COUNT(*) AS records_migrated,
--     'success' AS status,
--     'Migrated config data to translations table with default language zh-cn' AS notes
-- FROM 
--     translations
-- WHERE 
--     language_code = 'zh-cn';
