/**
 * Translation Model - Unit Tests
 * 
 * 测试 Translation 模型的基本功能：
 * - 模型创建和字段验证
 * - keywords JSON 序列化/反序列化
 * - 关联关系
 * 
 * Requirements: 1.1, 1.3
 */

import { Translation } from './Translation';
import { Config } from './Config';

describe('Translation Model Unit Tests', () => {
  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(Translation.tableName).toBe('translations');
    });

    it('should have correct attributes', () => {
      const attributes = Translation.getAttributes();
      
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('configId');
      expect(attributes).toHaveProperty('languageCode');
      expect(attributes).toHaveProperty('title');
      expect(attributes).toHaveProperty('author');
      expect(attributes).toHaveProperty('description');
      expect(attributes).toHaveProperty('keywords');
    });

    it('should have correct field mappings', () => {
      const attributes = Translation.getAttributes();
      
      // Check field name mapping (camelCase to snake_case)
      expect(attributes.configId.field).toBe('config_id');
      expect(attributes.languageCode.field).toBe('language_code');
    });

    it('should have correct field types', () => {
      const attributes = Translation.getAttributes();
      
      expect(attributes.id.type.constructor.name).toBe('INTEGER');
      expect(attributes.configId.type.constructor.name).toBe('INTEGER');
      expect(attributes.languageCode.type.constructor.name).toBe('STRING');
      expect(attributes.title.type.constructor.name).toBe('STRING');
      expect(attributes.author.type.constructor.name).toBe('STRING');
      expect(attributes.description.type.constructor.name).toBe('STRING');
      expect(attributes.keywords.type.constructor.name).toBe('TEXT');
    });

    it('should have correct allowNull settings', () => {
      const attributes = Translation.getAttributes();
      
      expect(attributes.configId.allowNull).toBe(false);
      expect(attributes.languageCode.allowNull).toBe(false);
      expect(attributes.title.allowNull).toBe(false);
      expect(attributes.author.allowNull).toBe(false);
      expect(attributes.description.allowNull).toBe(false);
      expect(attributes.keywords.allowNull).toBe(false);
    });
  });

  describe('Keywords JSON Serialization', () => {
    it('should serialize keywords array to JSON string', () => {
      const translation = Translation.build({
        configId: 1,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['keyword1', 'keyword2', 'keyword3'],
      });

      // The getter should return the array
      expect(translation.keywords).toEqual(['keyword1', 'keyword2', 'keyword3']);
      
      // The underlying data value should be a JSON string
      const rawValue = translation.getDataValue('keywords');
      expect(typeof rawValue).toBe('string');
      if (typeof rawValue === 'string') {
        expect(JSON.parse(rawValue)).toEqual(['keyword1', 'keyword2', 'keyword3']);
      }
    });

    it('should deserialize JSON string to keywords array', () => {
      const translation = Translation.build({
        configId: 1,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: [] as string[],
      });

      // Set raw JSON string
      translation.setDataValue('keywords', '["test1", "test2"]' as any);
      
      // Getter should return parsed array
      expect(translation.keywords).toEqual(['test1', 'test2']);
    });

    it('should handle empty keywords array', () => {
      const translation = Translation.build({
        configId: 1,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: [],
      });

      expect(translation.keywords).toEqual([]);
      
      const rawValue = translation.getDataValue('keywords');
      if (typeof rawValue === 'string') {
        expect(JSON.parse(rawValue)).toEqual([]);
      }
    });

    it('should handle null or undefined keywords gracefully', () => {
      const translation = Translation.build({
        configId: 1,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: [] as string[],
      });

      // Set to null
      translation.setDataValue('keywords', null as any);
      expect(translation.keywords).toEqual([]);

      // Set to undefined
      translation.setDataValue('keywords', undefined as any);
      expect(translation.keywords).toEqual([]);
    });

    it('should handle invalid JSON gracefully', () => {
      const translation = Translation.build({
        configId: 1,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: [] as string[],
      });

      // Set invalid JSON
      translation.setDataValue('keywords', 'invalid json' as any);
      expect(translation.keywords).toEqual([]);
    });

    it('should throw error when setting non-array value', () => {
      const translation = Translation.build({
        configId: 1,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: [] as string[],
      });

      expect(() => {
        translation.keywords = 'not an array' as any;
      }).toThrow('Keywords must be an array');
    });
  });

  describe('Model Associations', () => {
    it('should have belongsTo association with Config', () => {
      const associations = Translation.associations;
      
      expect(associations).toHaveProperty('config');
      expect(associations.config.associationType).toBe('BelongsTo');
      expect(associations.config.target).toBe(Config);
    });

    it('should have correct foreign key for Config association', () => {
      const association = Translation.associations.config;
      
      expect(association.foreignKey).toBe('configId');
    });
  });

  describe('Model Indexes', () => {
    it('should have unique composite index defined', () => {
      const options = Translation.options;
      const indexes = options.indexes || [];
      
      const uniqueIndex = indexes.find((idx: any) => 
        idx.unique && idx.fields.includes('config_id') && idx.fields.includes('language_code')
      );
      
      expect(uniqueIndex).toBeDefined();
      if (uniqueIndex) {
        expect(uniqueIndex.name).toBe('unique_config_language');
      }
    });

    it('should have language_code index defined', () => {
      const options = Translation.options;
      const indexes = options.indexes || [];
      
      const langIndex = indexes.find((idx: any) => 
        idx.fields.includes('language_code') && idx.name === 'idx_language_code'
      );
      
      expect(langIndex).toBeDefined();
    });
  });

  describe('Field Validations', () => {
    it('should have validation for languageCode format', () => {
      const attributes = Translation.getAttributes();
      const langCodeValidate = attributes.languageCode.validate;
      
      expect(langCodeValidate).toBeDefined();
      expect(langCodeValidate).toHaveProperty('notEmpty');
      expect(langCodeValidate).toHaveProperty('is');
    });

    it('should have length validation for title', () => {
      const attributes = Translation.getAttributes();
      const titleValidate = attributes.title.validate;
      
      expect(titleValidate).toBeDefined();
      expect(titleValidate).toHaveProperty('notEmpty');
      expect(titleValidate).toHaveProperty('len');
      if (titleValidate) {
        expect(titleValidate.len).toEqual([1, 200]);
      }
    });

    it('should have length validation for author', () => {
      const attributes = Translation.getAttributes();
      const authorValidate = attributes.author.validate;
      
      expect(authorValidate).toBeDefined();
      expect(authorValidate).toHaveProperty('notEmpty');
      expect(authorValidate).toHaveProperty('len');
      if (authorValidate) {
        expect(authorValidate.len).toEqual([1, 100]);
      }
    });

    it('should have length validation for description', () => {
      const attributes = Translation.getAttributes();
      const descValidate = attributes.description.validate;
      
      expect(descValidate).toBeDefined();
      expect(descValidate).toHaveProperty('notEmpty');
      expect(descValidate).toHaveProperty('len');
      if (descValidate) {
        expect(descValidate.len).toEqual([1, 1000]);
      }
    });

    it('should have JSON validation for keywords', () => {
      const attributes = Translation.getAttributes();
      const keywordsValidate = attributes.keywords.validate;
      
      expect(keywordsValidate).toBeDefined();
      expect(keywordsValidate).toHaveProperty('isValidJSON');
      if (keywordsValidate) {
        expect(typeof keywordsValidate.isValidJSON).toBe('function');
      }
    });
  });

  describe('Foreign Key Configuration', () => {
    it('should have correct foreign key reference', () => {
      const attributes = Translation.getAttributes();
      const configIdAttr = attributes.configId;
      
      expect(configIdAttr.references).toBeDefined();
      if (configIdAttr.references && typeof configIdAttr.references !== 'string') {
        expect(configIdAttr.references.model).toBe('configs');
        expect(configIdAttr.references.key).toBe('id');
      }
    });

    it('should have CASCADE delete configured', () => {
      const attributes = Translation.getAttributes();
      const configIdAttr = attributes.configId;
      
      expect(configIdAttr.onDelete).toBe('CASCADE');
    });
  });
});
