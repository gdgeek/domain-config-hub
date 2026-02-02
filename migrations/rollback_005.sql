-- 回滚脚本: 撤销配置数据迁移到 translations 表
-- 版本: 005
-- 日期: 2026-01-24
-- 描述: 删除从 configs 表迁移到 translations 表的默认语言（zh-cn）翻译记录

-- ============================================================
-- 警告
-- ============================================================
-- 此脚本将删除所有 zh-cn 语言的翻译记录
-- 请确保在执行前备份数据库
-- 如果有手动添加的 zh-cn 翻译，它们也会被删除

-- ============================================================
-- 步骤 1: 回滚前的验证
-- ============================================================
-- 检查将要删除的翻译记录数量
SELECT 
    COUNT(*) AS translations_to_delete,
    COUNT(DISTINCT config_id) AS affected_configs
FROM 
    translations
WHERE 
    language_code = 'zh-cn';

-- 显示将要删除的翻译记录详情
SELECT 
    id,
    config_id,
    language_code,
    title,
    author,
    created_at
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
ORDER BY 
    config_id;

-- ============================================================
-- 步骤 2: 执行回滚
-- ============================================================
-- 删除所有 zh-cn 语言的翻译记录
DELETE FROM translations
WHERE language_code = 'zh-cn';

-- ============================================================
-- 步骤 3: 验证回滚结果
-- ============================================================
-- 检查 zh-cn 翻译是否已全部删除
SELECT 
    COUNT(*) AS remaining_zh_cn_translations
FROM 
    translations
WHERE 
    language_code = 'zh-cn';

-- 检查剩余的翻译记录
SELECT 
    language_code,
    COUNT(*) AS translation_count
FROM 
    translations
GROUP BY 
    language_code;

-- 显示回滚摘要
SELECT 
    'Rollback Summary' AS summary,
    (SELECT COUNT(*) FROM configs) AS total_configs,
    (SELECT COUNT(*) FROM translations) AS remaining_translations,
    (SELECT COUNT(DISTINCT language_code) FROM translations) AS remaining_languages;

-- ============================================================
-- 注意事项
-- ============================================================
-- 1. 此回滚脚本删除所有 zh-cn 语言的翻译记录
-- 2. configs 表中的原始数据不受影响
-- 3. 如果有其他语言的翻译记录，它们不会被删除
-- 4. 回滚后，系统将无法通过 translations 表获取中文翻译
-- 5. 如需重新迁移，请再次执行 005_migrate_config_data_to_translations.sql
-- 6. 建议在生产环境执行前先在测试环境验证
