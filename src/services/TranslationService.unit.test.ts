/**
 * Unit Tests for TranslationService
 * 
 * 测试翻译服务的各种功能和边界情况
 * Requirements: 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.7
 */

import { Translation } from '../models/Translation';
import { Config } from '../models/Config';
import { TranslationService, CreateTranslationDTO, UpdateTranslationDTO } from './TranslationService';
import { RedisCacheManager } from './RedisCacheManager';
import { LanguageResolver } from './LanguageResolver';
import { ValidationError } from '../errors/ValidationError';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';
import { sequelize } from '../config/database';
import Redis from 'ioredis';

describe('TranslationService - Unit Tests', () => {
  let redisClient: Redis;
  let cacheManager: RedisCacheManager;
  let languageResolver: LanguageResolver;
  let service: TranslationService;
  let dbConnected = false;
  let redisConnected = false;

  beforeAll(async () => {
    // Setup database
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: true });
      dbConnected = true;
    } catch (error) {
      console.warn('Database not available for unit tests. Tests will be skipped.');
      dbConnected = false;
    }

    // Setup Redis
    try {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });
      await redisClient.ping();
      redisConnected = true;

      cacheManager = new RedisCacheManager(redisClient);
      languageResolver = new LanguageResolver({
        defaultLanguage: 'zh-cn',
        supportedLanguages: ['zh-cn', 'en-us', 'ja-jp'],
      });

      service = new TranslationService(Translation, cacheManager, languageResolver);
    } catch (error) {
      console.warn('Redis not available for unit tests. Tests will be skipped.');
      redisConnected = false;
    }
  });

  afterAll(async () => {
    if (dbConnected) {
      await sequelize.close();
    }
    if (redisConnected) {
      redisClient.disconnect();
    }
  });

  beforeEach(async () => {
    if (dbConnected) {
      await Translation.destroy({ where: {}, truncate: true, cascade: true });
      await Config.destroy({ where: {}, truncate: true, cascade: true });
    }
    if (redisConnected) {
      await redisClient.flushdb();
    }
  });

  const skipIfNotReady = () => {
    if (!dbConnected || !redisConnected) {
      console.log('Skipping test - database or Redis not available');
      return true;
    }
    return false;
  };

  describe('createTranslation', () => {
    it('should create a translation with valid data', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: CreateTranslationDTO = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test', 'keyword'],
      };

      const result = await service.createTranslation(data);

      expect(result).toBeDefined();
      expect(result.configId).toBe(config.id);
      expect(result.languageCode).toBe('zh-cn');
      expect(result.title).toBe('Test Title');
      expect(result.author).toBe('Test Author');
      expect(result.description).toBe('Test Description');
      expect(result.keywords).toEqual(['test', 'keyword']);
    });

    it('should normalize language code when creating translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: CreateTranslationDTO = {
        configId: config.id,
        languageCode: 'ZH-CN',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      };

      const result = await service.createTranslation(data);

      expect(result.languageCode).toBe('zh-cn');
    });

    it('should throw ValidationError for unsupported language', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: CreateTranslationDTO = {
        configId: config.id,
        languageCode: 'fr-fr',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      };

      await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
      await expect(service.createTranslation(data)).rejects.toThrow('Unsupported language');
    });

    it('should throw ValidationError for missing required fields', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: any = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        // Missing author, description, keywords
      };

      await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty title', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: CreateTranslationDTO = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: '',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      };

      await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for title exceeding 200 characters', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: CreateTranslationDTO = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'a'.repeat(201),
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      };

      await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
      await expect(service.createTranslation(data)).rejects.toThrow('exceeds maximum length');
    });

    it('should throw ValidationError for description exceeding 1000 characters', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: CreateTranslationDTO = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'a'.repeat(1001),
        keywords: ['test'],
      };

      await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-array keywords', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: any = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: 'not-an-array',
      };

      await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
      await expect(service.createTranslation(data)).rejects.toThrow('must be an array');
    });

    it('should throw ValidationError for keywords with non-string elements', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: any = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['valid', 123, 'another'],
      };

      await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
      await expect(service.createTranslation(data)).rejects.toThrow('must be strings');
    });

    it('should throw ConflictError for duplicate translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const data: CreateTranslationDTO = {
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      };

      await service.createTranslation(data);

      await expect(service.createTranslation(data)).rejects.toThrow(ConflictError);
      await expect(service.createTranslation(data)).rejects.toThrow('already exists');
    });
  });

  describe('updateTranslation', () => {
    it('should update translation with valid data', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const created = await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Original Title',
        author: 'Original Author',
        description: 'Original Description',
        keywords: ['original'],
      });

      const updateData: UpdateTranslationDTO = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const result = await service.updateTranslation(config.id, 'zh-cn', updateData);

      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Updated Title');
      expect(result.author).toBe('Original Author'); // Not updated
      expect(result.description).toBe('Updated Description');
      expect(result.keywords).toEqual(['original']); // Not updated
    });

    it('should update only specified fields', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Original Title',
        author: 'Original Author',
        description: 'Original Description',
        keywords: ['original'],
      });

      const updateData: UpdateTranslationDTO = {
        keywords: ['updated', 'keywords'],
      };

      const result = await service.updateTranslation(config.id, 'zh-cn', updateData);

      expect(result.title).toBe('Original Title');
      expect(result.author).toBe('Original Author');
      expect(result.description).toBe('Original Description');
      expect(result.keywords).toEqual(['updated', 'keywords']);
    });

    it('should throw NotFoundError for non-existent translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const updateData: UpdateTranslationDTO = {
        title: 'Updated Title',
      };

      await expect(
        service.updateTranslation(config.id, 'zh-cn', updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for title exceeding 200 characters', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Original Title',
        author: 'Original Author',
        description: 'Original Description',
        keywords: ['original'],
      });

      const updateData: UpdateTranslationDTO = {
        title: 'a'.repeat(201),
      };

      await expect(
        service.updateTranslation(config.id, 'zh-cn', updateData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid keywords format', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Original Title',
        author: 'Original Author',
        description: 'Original Description',
        keywords: ['original'],
      });

      const updateData: any = {
        keywords: 'not-an-array',
      };

      await expect(
        service.updateTranslation(config.id, 'zh-cn', updateData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTranslation', () => {
    it('should retrieve translation from database', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      const created = await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      });

      const result = await service.getTranslation(config.id, 'zh-cn');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.title).toBe('Test Title');
    });

    it('should return null for non-existent translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      const result = await service.getTranslation(config.id, 'zh-cn');

      expect(result).toBeNull();
    });

    it('should retrieve translation from cache on second call', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      });

      // First call - from database
      const result1 = await service.getTranslation(config.id, 'zh-cn');
      expect(result1).not.toBeNull();

      // Delete from database to verify cache is used
      await Translation.destroy({ where: { configId: config.id } });

      // Second call - should still return from cache
      const result2 = await service.getTranslation(config.id, 'zh-cn');
      expect(result2).not.toBeNull();
      expect(result2!.title).toBe('Test Title');
    });

    it('should normalize language code when retrieving', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      });

      const result = await service.getTranslation(config.id, 'ZH-CN');

      expect(result).not.toBeNull();
      expect(result!.languageCode).toBe('zh-cn');
    });
  });

  describe('getTranslationWithFallback', () => {
    it('should return requested language if available', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'en-us',
        title: 'English Title',
        author: 'English Author',
        description: 'English Description',
        keywords: ['english'],
      });

      const { translation, actualLanguage } = await service.getTranslationWithFallback(
        config.id,
        'en-us'
      );

      expect(actualLanguage).toBe('en-us');
      expect(translation.title).toBe('English Title');
    });

    it('should fallback to default language if requested language not available', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['chinese'],
      });

      const { translation, actualLanguage } = await service.getTranslationWithFallback(
        config.id,
        'en-us'
      );

      expect(actualLanguage).toBe('zh-cn');
      expect(translation.title).toBe('Chinese Title');
    });

    it('should throw NotFoundError if no translation exists', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await expect(
        service.getTranslationWithFallback(config.id, 'en-us')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllTranslations', () => {
    it('should return all translations for a config', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['chinese'],
      });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'en-us',
        title: 'English Title',
        author: 'English Author',
        description: 'English Description',
        keywords: ['english'],
      });

      const results = await service.getAllTranslations(config.id);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.languageCode).sort()).toEqual(['en-us', 'zh-cn']);
    });

    it('should return empty array for config with no translations', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      const results = await service.getAllTranslations(config.id);

      expect(results).toHaveLength(0);
    });
  });

  describe('deleteTranslation', () => {
    it('should delete non-default language translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['chinese'],
      });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'en-us',
        title: 'English Title',
        author: 'English Author',
        description: 'English Description',
        keywords: ['english'],
      });

      await service.deleteTranslation(config.id, 'en-us');

      const remaining = await service.getAllTranslations(config.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].languageCode).toBe('zh-cn');
    });

    it('should throw ValidationError when deleting default language with other translations', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['chinese'],
      });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'en-us',
        title: 'English Title',
        author: 'English Author',
        description: 'English Description',
        keywords: ['english'],
      });

      await expect(
        service.deleteTranslation(config.id, 'zh-cn')
      ).rejects.toThrow(ValidationError);
      await expect(
        service.deleteTranslation(config.id, 'zh-cn')
      ).rejects.toThrow('Cannot delete default language');
    });

    it('should allow deleting default language when it is the only translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['chinese'],
      });

      await service.deleteTranslation(config.id, 'zh-cn');

      const remaining = await service.getAllTranslations(config.id);
      expect(remaining).toHaveLength(0);
    });

    it('should throw NotFoundError for non-existent translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await expect(
        service.deleteTranslation(config.id, 'zh-cn')
      ).rejects.toThrow(NotFoundError);
    });

    it('should invalidate cache after deletion', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      });

      // Get translation to cache it
      await service.getTranslation(config.id, 'zh-cn');

      // Delete translation
      await service.deleteTranslation(config.id, 'zh-cn');

      // Try to get again - should return null
      const result = await service.getTranslation(config.id, 'zh-cn');
      expect(result).toBeNull();
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache after update', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Original Title',
        author: 'Original Author',
        description: 'Original Description',
        keywords: ['original'],
      });

      // Get translation to cache it
      const cached = await service.getTranslation(config.id, 'zh-cn');
      expect(cached!.title).toBe('Original Title');

      // Update translation
      await service.updateTranslation(config.id, 'zh-cn', {
        title: 'Updated Title',
      });

      // Get translation again - should reflect update
      const updated = await service.getTranslation(config.id, 'zh-cn');
      expect(updated!.title).toBe('Updated Title');
    });

    it('should invalidate all caches for a config', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      // Create translations in multiple languages
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['chinese'],
      });

      await service.createTranslation({
        configId: config.id,
        languageCode: 'en-us',
        title: 'English Title',
        author: 'English Author',
        description: 'English Description',
        keywords: ['english'],
      });

      await service.createTranslation({
        configId: config.id,
        languageCode: 'ja-jp',
        title: 'Japanese Title',
        author: 'Japanese Author',
        description: 'Japanese Description',
        keywords: ['japanese'],
      });

      // Cache all translations
      await service.getTranslation(config.id, 'zh-cn');
      await service.getTranslation(config.id, 'en-us');
      await service.getTranslation(config.id, 'ja-jp');

      // Verify all are cached
      const zhCached = await cacheManager.get(`config:${config.id}:lang:zh-cn`);
      const enCached = await cacheManager.get(`config:${config.id}:lang:en-us`);
      const jaCached = await cacheManager.get(`config:${config.id}:lang:ja-jp`);
      expect(zhCached).not.toBeNull();
      expect(enCached).not.toBeNull();
      expect(jaCached).not.toBeNull();

      // Invalidate all caches for the config
      await service.invalidateAllCachesForConfig(config.id);

      // Verify all caches are invalidated
      const zhAfter = await cacheManager.get(`config:${config.id}:lang:zh-cn`);
      const enAfter = await cacheManager.get(`config:${config.id}:lang:en-us`);
      const jaAfter = await cacheManager.get(`config:${config.id}:lang:ja-jp`);
      expect(zhAfter).toBeNull();
      expect(enAfter).toBeNull();
      expect(jaAfter).toBeNull();
    });

    it('should only invalidate caches for specific config', async () => {
      if (skipIfNotReady()) return;

      const config1 = await Config.create({ links: {}, permissions: {} });
      const config2 = await Config.create({ links: {}, permissions: {} });

      // Create translations for both configs
      await service.createTranslation({
        configId: config1.id,
        languageCode: 'zh-cn',
        title: 'Config 1 Title',
        author: 'Config 1 Author',
        description: 'Config 1 Description',
        keywords: ['config1'],
      });

      await service.createTranslation({
        configId: config2.id,
        languageCode: 'zh-cn',
        title: 'Config 2 Title',
        author: 'Config 2 Author',
        description: 'Config 2 Description',
        keywords: ['config2'],
      });

      // Cache both translations
      await service.getTranslation(config1.id, 'zh-cn');
      await service.getTranslation(config2.id, 'zh-cn');

      // Invalidate only config1's caches
      await service.invalidateAllCachesForConfig(config1.id);

      // Verify config1's cache is invalidated
      const config1After = await cacheManager.get(`config:${config1.id}:lang:zh-cn`);
      expect(config1After).toBeNull();

      // Verify config2's cache still exists
      const config2After = await cacheManager.get(`config:${config2.id}:lang:zh-cn`);
      expect(config2After).not.toBeNull();
    });

    it('should use correct cache key format', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      });

      // Get translation to cache it
      await service.getTranslation(config.id, 'zh-cn');

      // Verify cache key format: config:{configId}:lang:{languageCode}
      const expectedKey = `config:${config.id}:lang:zh-cn`;
      const cached = await cacheManager.get(expectedKey);
      expect(cached).not.toBeNull();
    });

    it('should cache with correct TTL', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      });

      // Get translation to cache it
      await service.getTranslation(config.id, 'zh-cn');

      // Check TTL (should be 3600 seconds)
      const cacheKey = `config:${config.id}:lang:zh-cn`;
      const ttl = await redisClient.ttl(cacheKey);
      
      // TTL should be close to 3600 (allowing for small time differences)
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should handle cache miss and populate cache', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });
      await service.createTranslation({
        configId: config.id,
        languageCode: 'zh-cn',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      });

      const cacheKey = `config:${config.id}:lang:zh-cn`;

      // Ensure cache is empty
      await cacheManager.delete(cacheKey);
      const beforeCache = await cacheManager.get(cacheKey);
      expect(beforeCache).toBeNull();

      // Get translation (cache miss)
      const result = await service.getTranslation(config.id, 'zh-cn');
      expect(result).not.toBeNull();

      // Verify cache is now populated
      const afterCache = await cacheManager.get(cacheKey);
      expect(afterCache).not.toBeNull();
    });
  });
});
