/**
 * Translation Model - Database Schema Validation Tests
 * 
 * 验证 translations 表的数据库架构：
 * - 表结构正确性
 * - 索引和约束存在性
 * - 级联删除行为
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { setupTestDatabase, closeTestDatabase } from '../test-utils/setupTestDatabase';

describe('Translation Table Schema Validation', () => {
  beforeAll(async () => {
    // 使用统一的测试数据库初始化
    await setupTestDatabase();
  });

  afterAll(async () => {
    // 关闭数据库连接
    await closeTestDatabase();
  });

  describe('Table Structure Validation', () => {
    it('should have translations table created', async () => {
      // Requirement 10.1: 验证 translations 表存在
      const tables = await sequelize.query(
        `SELECT TABLE_NAME 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'translations'`,
        { type: QueryTypes.SELECT }
      );

      expect(tables).toHaveLength(1);
      expect((tables[0] as any).TABLE_NAME).toBe('translations');
    });

    it('should have correct columns with proper data types', async () => {
      // Requirement 10.1: 验证列定义正确
      const columns = await sequelize.query(
        `SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE,
          COLUMN_KEY,
          EXTRA
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'translations'
         ORDER BY ORDINAL_POSITION`,
        { type: QueryTypes.SELECT }
      ) as any[];

      // 验证列数量
      expect(columns.length).toBeGreaterThanOrEqual(9);

      // 验证 id 列
      const idColumn = columns.find(col => col.COLUMN_NAME === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn.DATA_TYPE).toBe('int');
      expect(idColumn.COLUMN_KEY).toBe('PRI');
      expect(idColumn.EXTRA).toContain('auto_increment');
      expect(idColumn.IS_NULLABLE).toBe('NO');

      // 验证 config_id 列
      const configIdColumn = columns.find(col => col.COLUMN_NAME === 'config_id');
      expect(configIdColumn).toBeDefined();
      expect(configIdColumn.DATA_TYPE).toBe('int');
      expect(configIdColumn.IS_NULLABLE).toBe('NO');

      // 验证 language_code 列
      const languageCodeColumn = columns.find(col => col.COLUMN_NAME === 'language_code');
      expect(languageCodeColumn).toBeDefined();
      expect(languageCodeColumn.DATA_TYPE).toBe('varchar');
      expect(languageCodeColumn.CHARACTER_MAXIMUM_LENGTH).toBe(10);
      expect(languageCodeColumn.IS_NULLABLE).toBe('NO');

      // 验证 title 列
      const titleColumn = columns.find(col => col.COLUMN_NAME === 'title');
      expect(titleColumn).toBeDefined();
      expect(titleColumn.DATA_TYPE).toBe('varchar');
      expect(titleColumn.CHARACTER_MAXIMUM_LENGTH).toBe(200);
      expect(titleColumn.IS_NULLABLE).toBe('NO');

      // 验证 author 列
      const authorColumn = columns.find(col => col.COLUMN_NAME === 'author');
      expect(authorColumn).toBeDefined();
      expect(authorColumn.DATA_TYPE).toBe('varchar');
      expect(authorColumn.CHARACTER_MAXIMUM_LENGTH).toBe(100);
      expect(authorColumn.IS_NULLABLE).toBe('NO');

      // 验证 description 列
      const descriptionColumn = columns.find(col => col.COLUMN_NAME === 'description');
      expect(descriptionColumn).toBeDefined();
      expect(descriptionColumn.DATA_TYPE).toBe('varchar');
      expect(descriptionColumn.CHARACTER_MAXIMUM_LENGTH).toBe(1000);
      expect(descriptionColumn.IS_NULLABLE).toBe('NO');

      // 验证 keywords 列
      const keywordsColumn = columns.find(col => col.COLUMN_NAME === 'keywords');
      expect(keywordsColumn).toBeDefined();
      expect(keywordsColumn.DATA_TYPE).toBe('text');
      expect(keywordsColumn.IS_NULLABLE).toBe('NO');

      // 验证 created_at 列
      const createdAtColumn = columns.find(col => col.COLUMN_NAME === 'created_at');
      expect(createdAtColumn).toBeDefined();
      // MySQL 8.0 may return 'datetime' or 'timestamp' depending on Sequelize version
      expect(['timestamp', 'datetime']).toContain(createdAtColumn.DATA_TYPE);

      // 验证 updated_at 列
      const updatedAtColumn = columns.find(col => col.COLUMN_NAME === 'updated_at');
      expect(updatedAtColumn).toBeDefined();
      // MySQL 8.0 may return 'datetime' or 'timestamp' depending on Sequelize version
      expect(['timestamp', 'datetime']).toContain(updatedAtColumn.DATA_TYPE);
    });
  });

  describe('Index Validation', () => {
    it('should have unique composite index on (config_id, language_code)', async () => {
      // Requirement 10.2: 验证唯一复合索引
      const indexes = await sequelize.query(
        `SELECT 
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE,
          SEQ_IN_INDEX
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'translations'
         AND INDEX_NAME = 'unique_config_language'
         ORDER BY SEQ_IN_INDEX`,
        { type: QueryTypes.SELECT }
      ) as any[];

      // 验证索引存在
      expect(indexes.length).toBeGreaterThan(0);

      // 验证是唯一索引
      expect(indexes[0].NON_UNIQUE).toBe(0);

      // 验证索引包含 config_id
      const configIdIndex = indexes.find(idx => idx.COLUMN_NAME === 'config_id');
      expect(configIdIndex).toBeDefined();
      expect(configIdIndex.SEQ_IN_INDEX).toBe(1);

      // 验证索引包含 language_code
      const languageCodeIndex = indexes.find(idx => idx.COLUMN_NAME === 'language_code');
      expect(languageCodeIndex).toBeDefined();
      expect(languageCodeIndex.SEQ_IN_INDEX).toBe(2);
    });

    it('should have index on language_code', async () => {
      // Requirement 10.4: 验证 language_code 索引
      const indexes = await sequelize.query(
        `SELECT 
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'translations'
         AND INDEX_NAME = 'idx_language_code'`,
        { type: QueryTypes.SELECT }
      ) as any[];

      // 验证索引存在
      expect(indexes.length).toBeGreaterThan(0);
      expect(indexes[0].COLUMN_NAME).toBe('language_code');
      
      // 这是一个非唯一索引
      expect(indexes[0].NON_UNIQUE).toBe(1);
    });
  });

  describe('Foreign Key Constraint Validation', () => {
    it('should have foreign key constraint from translations.config_id to configs.id', async () => {
      // Requirement 10.3: 验证外键约束
      const dbName = sequelize.config.database;
      const foreignKeys = await sequelize.query(
        `SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = :dbName
         AND TABLE_NAME = 'translations'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
        { 
          type: QueryTypes.SELECT,
          replacements: { dbName }
        }
      ) as any[];

      // 验证外键约束存在
      expect(foreignKeys.length).toBeGreaterThan(0);

      // 查找 config_id 的外键约束
      const configFk = foreignKeys.find(fk => fk.COLUMN_NAME === 'config_id');
      expect(configFk).toBeDefined();
      expect(configFk.REFERENCED_TABLE_NAME).toBe('configs');
      expect(configFk.REFERENCED_COLUMN_NAME).toBe('id');
      expect(configFk.CONSTRAINT_NAME).toBe('fk_translation_config');
    });

    it('should have CASCADE delete rule on foreign key', async () => {
      // Requirement 10.3: 验证级联删除规则
      const dbName = sequelize.config.database;
      const foreignKeys = await sequelize.query(
        `SELECT 
          CONSTRAINT_NAME,
          DELETE_RULE,
          UPDATE_RULE
         FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = :dbName
         AND TABLE_NAME = 'translations'
         AND CONSTRAINT_NAME = 'fk_translation_config'`,
        { 
          type: QueryTypes.SELECT,
          replacements: { dbName }
        }
      ) as any[];

      expect(foreignKeys.length).toBeGreaterThan(0);
      expect(foreignKeys[0].DELETE_RULE).toBe('CASCADE');
    });
  });

  describe('Cascade Delete Behavior', () => {
    let testConfigIds: number[] = [];

    beforeEach(async () => {
      testConfigIds = [];
    });

    afterEach(async () => {
      // 清理测试数据 - 删除测试创建的 configs (会级联删除 translations)
      if (testConfigIds.length > 0) {
        await sequelize.query(
          `DELETE FROM configs WHERE id IN (${testConfigIds.join(',')})`,
          { type: QueryTypes.DELETE }
        );
      }
    });

    it('should cascade delete translations when config is deleted', async () => {
      // Requirement 10.3: 测试级联删除行为
      
      // 1. 创建测试配置
      const [configResult] = await sequelize.query(
        `INSERT INTO configs (links, permissions, created_at, updated_at)
         VALUES ('{}', '{}', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );
      const configId = configResult;
      testConfigIds.push(configId as number);

      // 2. 创建多个翻译记录
      await sequelize.query(
        `INSERT INTO translations (config_id, language_code, title, author, description, keywords, created_at, updated_at)
         VALUES 
         (${configId}, 'zh-cn', '测试标题', '测试作者', '测试描述', '["测试"]', NOW(), NOW()),
         (${configId}, 'en-us', 'Test Title', 'Test Author', 'Test Description', '["test"]', NOW(), NOW()),
         (${configId}, 'ja-jp', 'テストタイトル', 'テスト著者', 'テスト説明', '["テスト"]', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );

      // 3. 验证翻译记录已创建
      const translationsBeforeDelete = await sequelize.query(
        `SELECT COUNT(*) as count FROM translations WHERE config_id = ${configId}`,
        { type: QueryTypes.SELECT }
      ) as any[];
      expect(translationsBeforeDelete[0].count).toBe(3);

      // 4. 删除配置
      await sequelize.query(
        `DELETE FROM configs WHERE id = ${configId}`,
        { type: QueryTypes.DELETE }
      );

      // 5. 验证所有关联的翻译记录已被级联删除
      const translationsAfterDelete = await sequelize.query(
        `SELECT COUNT(*) as count FROM translations WHERE config_id = ${configId}`,
        { type: QueryTypes.SELECT }
      ) as any[];
      expect(translationsAfterDelete[0].count).toBe(0);
    });

    it('should allow deleting individual translations without affecting config', async () => {
      // 测试删除单个翻译不影响配置
      
      // 1. 创建测试配置
      const [configResult] = await sequelize.query(
        `INSERT INTO configs (links, permissions, created_at, updated_at)
         VALUES ('{}', '{}', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );
      const configId = configResult;
      testConfigIds.push(configId as number);

      // 2. 创建多个翻译记录
      await sequelize.query(
        `INSERT INTO translations (config_id, language_code, title, author, description, keywords, created_at, updated_at)
         VALUES 
         (${configId}, 'zh-cn', '测试标题', '测试作者', '测试描述', '["测试"]', NOW(), NOW()),
         (${configId}, 'en-us', 'Test Title', 'Test Author', 'Test Description', '["test"]', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );

      // 3. 删除一个翻译
      await sequelize.query(
        `DELETE FROM translations WHERE config_id = ${configId} AND language_code = 'en-us'`,
        { type: QueryTypes.DELETE }
      );

      // 4. 验证配置仍然存在
      const configs = await sequelize.query(
        `SELECT COUNT(*) as count FROM configs WHERE id = ${configId}`,
        { type: QueryTypes.SELECT }
      ) as any[];
      expect(configs[0].count).toBe(1);

      // 5. 验证另一个翻译仍然存在
      const translations = await sequelize.query(
        `SELECT COUNT(*) as count FROM translations WHERE config_id = ${configId}`,
        { type: QueryTypes.SELECT }
      ) as any[];
      expect(translations[0].count).toBe(1);

      // 6. 验证剩余的是 zh-cn 翻译
      const remainingTranslation = await sequelize.query(
        `SELECT language_code FROM translations WHERE config_id = ${configId}`,
        { type: QueryTypes.SELECT }
      ) as any[];
      expect(remainingTranslation[0].language_code).toBe('zh-cn');
    });

    it('should prevent creating translation for non-existent config', async () => {
      // 测试外键约束防止为不存在的配置创建翻译
      const nonExistentConfigId = 999999;

      // 尝试为不存在的配置创建翻译应该失败
      await expect(
        sequelize.query(
          `INSERT INTO translations (config_id, language_code, title, author, description, keywords, created_at, updated_at)
           VALUES (${nonExistentConfigId}, 'zh-cn', '测试标题', '测试作者', '测试描述', '["测试"]', NOW(), NOW())`,
          { type: QueryTypes.INSERT }
        )
      ).rejects.toThrow();
    });
  });

  describe('Unique Constraint Validation', () => {
    let testConfigIds: number[] = [];

    beforeEach(async () => {
      testConfigIds = [];
    });

    afterEach(async () => {
      // 清理测试数据 - 删除测试创建的 configs (会级联删除 translations)
      if (testConfigIds.length > 0) {
        await sequelize.query(
          `DELETE FROM configs WHERE id IN (${testConfigIds.join(',')})`,
          { type: QueryTypes.DELETE }
        );
      }
    });

    it('should prevent duplicate translations for same config and language', async () => {
      // Requirement 10.2: 测试唯一约束
      
      // 1. 创建测试配置
      const [configResult] = await sequelize.query(
        `INSERT INTO configs (links, permissions, created_at, updated_at)
         VALUES ('{}', '{}', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );
      const configId = configResult;
      testConfigIds.push(configId as number);

      // 2. 创建第一个翻译
      await sequelize.query(
        `INSERT INTO translations (config_id, language_code, title, author, description, keywords, created_at, updated_at)
         VALUES (${configId}, 'zh-cn', '测试标题', '测试作者', '测试描述', '["测试"]', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );

      // 3. 尝试创建重复的翻译应该失败
      await expect(
        sequelize.query(
          `INSERT INTO translations (config_id, language_code, title, author, description, keywords, created_at, updated_at)
           VALUES (${configId}, 'zh-cn', '另一个标题', '另一个作者', '另一个描述', '["另一个"]', NOW(), NOW())`,
          { type: QueryTypes.INSERT }
        )
      ).rejects.toThrow();
    });

    it('should allow same language code for different configs', async () => {
      // 测试不同配置可以有相同的语言代码
      
      // 1. 创建两个测试配置
      const [config1Result] = await sequelize.query(
        `INSERT INTO configs (links, permissions, created_at, updated_at)
         VALUES ('{}', '{}', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );
      const config1Id = config1Result;
      testConfigIds.push(config1Id as number);

      const [config2Result] = await sequelize.query(
        `INSERT INTO configs (links, permissions, created_at, updated_at)
         VALUES ('{}', '{}', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );
      const config2Id = config2Result;
      testConfigIds.push(config2Id as number);

      // 2. 为两个配置创建相同语言的翻译
      await sequelize.query(
        `INSERT INTO translations (config_id, language_code, title, author, description, keywords, created_at, updated_at)
         VALUES 
         (${config1Id}, 'zh-cn', '配置1标题', '测试作者', '测试描述', '["测试"]', NOW(), NOW()),
         (${config2Id}, 'zh-cn', '配置2标题', '测试作者', '测试描述', '["测试"]', NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );

      // 3. 验证两个翻译都已创建
      const translations = await sequelize.query(
        `SELECT COUNT(*) as count FROM translations WHERE language_code = 'zh-cn' AND config_id IN (${config1Id}, ${config2Id})`,
        { type: QueryTypes.SELECT }
      ) as any[];
      expect(translations[0].count).toBe(2);
    });
  });
});
