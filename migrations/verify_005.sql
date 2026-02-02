-- 验证脚本: 验证配置数据迁移到 translations 表
-- 版本: 005
-- 日期: 2026-01-24
-- 描述: 验证迁移 005 的执行结果，确保数据完整性和正确性

-- ============================================================
-- 验证 1: 基本统计信息
-- ============================================================
SELECT '=== 基本统计信息 ===' AS verification_step;

SELECT 
    'Total Configs' AS metric,
    COUNT(*) AS count
FROM configs
UNION ALL
SELECT 
    'Total Translations' AS metric,
    COUNT(*) AS count
FROM translations
UNION ALL
SELECT 
    'zh-cn Translations' AS metric,
    COUNT(*) AS count
FROM translations
WHERE language_code = 'zh-cn';

-- ============================================================
-- 验证 2: 每个配置都有 zh-cn 翻译
-- ============================================================
SELECT '=== 检查缺少 zh-cn 翻译的配置 ===' AS verification_step;

SELECT 
    c.id AS config_id,
    c.title AS original_title,
    'MISSING zh-cn translation' AS status
FROM 
    configs c
LEFT JOIN 
    translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE 
    t.id IS NULL;

-- 如果上面的查询返回空结果，说明所有配置都有 zh-cn 翻译
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 所有配置都有 zh-cn 翻译'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 个配置缺少 zh-cn 翻译')
    END AS result
FROM 
    configs c
LEFT JOIN 
    translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE 
    t.id IS NULL;

-- ============================================================
-- 验证 3: 数据完整性检查
-- ============================================================
SELECT '=== 数据完整性检查 ===' AS verification_step;

-- 检查必填字段是否为空
SELECT 
    config_id,
    language_code,
    CASE WHEN title IS NULL OR title = '' THEN '✗ EMPTY' ELSE '✓ OK' END AS title_status,
    CASE WHEN author IS NULL OR author = '' THEN '✗ EMPTY' ELSE '✓ OK' END AS author_status,
    CASE WHEN description IS NULL THEN '✗ NULL' ELSE '✓ OK' END AS description_status,
    CASE WHEN keywords IS NULL OR keywords = '' THEN '✗ EMPTY' ELSE '✓ OK' END AS keywords_status
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

-- 如果上面的查询返回空结果，说明所有字段都完整
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 所有翻译记录的必填字段都完整'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 条翻译记录存在空字段')
    END AS result
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

-- ============================================================
-- 验证 4: 数据一致性检查
-- ============================================================
SELECT '=== 数据一致性检查 ===' AS verification_step;

-- 比较原始数据和迁移后的数据
SELECT 
    c.id AS config_id,
    c.title AS original_title,
    t.title AS translated_title,
    CASE 
        WHEN COALESCE(c.title, 'Untitled') = t.title THEN '✓ 一致'
        ELSE '✗ 不一致'
    END AS title_match,
    c.author AS original_author,
    t.author AS translated_author,
    CASE 
        WHEN COALESCE(c.author, 'Unknown') = t.author THEN '✓ 一致'
        ELSE '✗ 不一致'
    END AS author_match
FROM 
    configs c
INNER JOIN 
    translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE 
    COALESCE(c.title, 'Untitled') != t.title OR
    COALESCE(c.author, 'Unknown') != t.author
LIMIT 10;

-- 统计不一致的记录数
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 所有数据都一致'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 条记录存在不一致')
    END AS result
FROM 
    configs c
INNER JOIN 
    translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE 
    COALESCE(c.title, 'Untitled') != t.title OR
    COALESCE(c.author, 'Unknown') != t.author;

-- ============================================================
-- 验证 5: 外键约束检查
-- ============================================================
SELECT '=== 外键约束检查 ===' AS verification_step;

-- 检查是否有孤立的翻译记录（config_id 不存在于 configs 表）
SELECT 
    t.id AS translation_id,
    t.config_id,
    t.language_code,
    'ORPHANED - config not found' AS status
FROM 
    translations t
LEFT JOIN 
    configs c ON t.config_id = c.id
WHERE 
    c.id IS NULL;

-- 统计结果
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 没有孤立的翻译记录'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 条孤立的翻译记录')
    END AS result
FROM 
    translations t
LEFT JOIN 
    configs c ON t.config_id = c.id
WHERE 
    c.id IS NULL;

-- ============================================================
-- 验证 6: 唯一约束检查
-- ============================================================
SELECT '=== 唯一约束检查 ===' AS verification_step;

-- 检查是否有重复的 (config_id, language_code) 组合
SELECT 
    config_id,
    language_code,
    COUNT(*) AS duplicate_count
FROM 
    translations
GROUP BY 
    config_id, language_code
HAVING 
    COUNT(*) > 1;

-- 统计结果
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 没有重复的翻译记录'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 组重复的翻译记录')
    END AS result
FROM (
    SELECT 
        config_id,
        language_code,
        COUNT(*) AS cnt
    FROM 
        translations
    GROUP BY 
        config_id, language_code
    HAVING 
        COUNT(*) > 1
) AS duplicates;

-- ============================================================
-- 验证 7: 字段长度检查
-- ============================================================
SELECT '=== 字段长度检查 ===' AS verification_step;

-- 检查字段长度是否超过限制
SELECT 
    config_id,
    language_code,
    LENGTH(title) AS title_length,
    LENGTH(author) AS author_length,
    LENGTH(description) AS description_length,
    LENGTH(keywords) AS keywords_length
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
    AND (
        LENGTH(title) > 200 OR
        LENGTH(author) > 100 OR
        LENGTH(description) > 1000
    );

-- 统计结果
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 所有字段长度都在限制范围内'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 条记录的字段长度超过限制')
    END AS result
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
    AND (
        LENGTH(title) > 200 OR
        LENGTH(author) > 100 OR
        LENGTH(description) > 1000
    );

-- ============================================================
-- 验证 8: JSON 格式检查
-- ============================================================
SELECT '=== JSON 格式检查 ===' AS verification_step;

-- 检查 keywords 字段是否为有效的 JSON
SELECT 
    config_id,
    language_code,
    keywords,
    'INVALID JSON' AS status
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
    AND NOT (
        keywords REGEXP '^\\[.*\\]$' OR
        keywords = '[]'
    )
LIMIT 10;

-- 统计结果
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 所有 keywords 字段都是有效的 JSON 数组'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 条记录的 keywords 字段不是有效的 JSON')
    END AS result
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
    AND NOT (
        keywords REGEXP '^\\[.*\\]$' OR
        keywords = '[]'
    );

-- ============================================================
-- 验证 9: 时间戳检查
-- ============================================================
SELECT '=== 时间戳检查 ===' AS verification_step;

-- 检查时间戳是否合理
SELECT 
    config_id,
    language_code,
    created_at,
    updated_at,
    CASE 
        WHEN created_at > updated_at THEN '✗ created_at > updated_at'
        WHEN created_at > NOW() THEN '✗ created_at in future'
        WHEN updated_at > NOW() THEN '✗ updated_at in future'
        ELSE '✓ OK'
    END AS timestamp_status
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
    AND (
        created_at > updated_at OR
        created_at > NOW() OR
        updated_at > NOW()
    );

-- 统计结果
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 所有时间戳都合理'
        ELSE CONCAT('✗ 有 ', COUNT(*), ' 条记录的时间戳不合理')
    END AS result
FROM 
    translations
WHERE 
    language_code = 'zh-cn'
    AND (
        created_at > updated_at OR
        created_at > NOW() OR
        updated_at > NOW()
    );

-- ============================================================
-- 验证摘要
-- ============================================================
SELECT '=== 验证摘要 ===' AS verification_step;

SELECT 
    '总配置数' AS metric,
    COUNT(*) AS value
FROM configs
UNION ALL
SELECT 
    '总翻译数' AS metric,
    COUNT(*) AS value
FROM translations
UNION ALL
SELECT 
    'zh-cn 翻译数' AS metric,
    COUNT(*) AS value
FROM translations
WHERE language_code = 'zh-cn'
UNION ALL
SELECT 
    '缺少 zh-cn 翻译的配置数' AS metric,
    COUNT(*) AS value
FROM configs c
LEFT JOIN translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE t.id IS NULL
UNION ALL
SELECT 
    '存在空字段的翻译数' AS metric,
    COUNT(*) AS value
FROM translations
WHERE language_code = 'zh-cn'
AND (title IS NULL OR title = '' OR author IS NULL OR author = '' OR description IS NULL OR keywords IS NULL OR keywords = '')
UNION ALL
SELECT 
    '数据不一致的记录数' AS metric,
    COUNT(*) AS value
FROM configs c
INNER JOIN translations t ON c.id = t.config_id AND t.language_code = 'zh-cn'
WHERE COALESCE(c.title, 'Untitled') != t.title OR COALESCE(c.author, 'Unknown') != t.author
UNION ALL
SELECT 
    '孤立的翻译记录数' AS metric,
    COUNT(*) AS value
FROM translations t
LEFT JOIN configs c ON t.config_id = c.id
WHERE c.id IS NULL
UNION ALL
SELECT 
    '重复的翻译记录组数' AS metric,
    COUNT(*) AS value
FROM (
    SELECT config_id, language_code, COUNT(*) AS cnt
    FROM translations
    GROUP BY config_id, language_code
    HAVING COUNT(*) > 1
) AS duplicates
UNION ALL
SELECT 
    '字段长度超限的记录数' AS metric,
    COUNT(*) AS value
FROM translations
WHERE language_code = 'zh-cn'
AND (LENGTH(title) > 200 OR LENGTH(author) > 100 OR LENGTH(description) > 1000)
UNION ALL
SELECT 
    'JSON 格式无效的记录数' AS metric,
    COUNT(*) AS value
FROM translations
WHERE language_code = 'zh-cn'
AND NOT (keywords REGEXP '^\\[.*\\]$' OR keywords = '[]');

-- ============================================================
-- 最终结论
-- ============================================================
SELECT '=== 最终结论 ===' AS verification_step;

SELECT 
    CASE 
        WHEN (
            -- 所有配置都有 zh-cn 翻译
            (SELECT COUNT(*) FROM configs c LEFT JOIN translations t ON c.id = t.config_id AND t.language_code = 'zh-cn' WHERE t.id IS NULL) = 0
            AND
            -- 没有空字段
            (SELECT COUNT(*) FROM translations WHERE language_code = 'zh-cn' AND (title IS NULL OR title = '' OR author IS NULL OR author = '' OR description IS NULL OR keywords IS NULL OR keywords = '')) = 0
            AND
            -- 没有孤立记录
            (SELECT COUNT(*) FROM translations t LEFT JOIN configs c ON t.config_id = c.id WHERE c.id IS NULL) = 0
            AND
            -- 没有重复记录
            (SELECT COUNT(*) FROM (SELECT config_id, language_code, COUNT(*) AS cnt FROM translations GROUP BY config_id, language_code HAVING COUNT(*) > 1) AS duplicates) = 0
            AND
            -- 没有字段长度超限
            (SELECT COUNT(*) FROM translations WHERE language_code = 'zh-cn' AND (LENGTH(title) > 200 OR LENGTH(author) > 100 OR LENGTH(description) > 1000)) = 0
        ) THEN '✓✓✓ 迁移验证通过！所有检查都成功！'
        ELSE '✗✗✗ 迁移验证失败！请检查上面的详细信息。'
    END AS final_result;

-- ============================================================
-- 注意事项
-- ============================================================
-- 1. 此验证脚本应在迁移 005 执行后立即运行
-- 2. 所有验证步骤都应该返回 "✓" 标记，表示验证通过
-- 3. 如果有任何 "✗" 标记，请检查详细信息并修正问题
-- 4. 建议保存验证结果以供审计
