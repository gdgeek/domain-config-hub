/**
 * Property-Based Tests for TranslationService
 * 
 * 使用 fast-check 进行属性测试，验证翻译服务的通用正确性属性
 * 
 * Requirements: 1.2, 4.1, 4.5, 5.1, 8.2, 8.3, 8.5, 8.6, 8.7, 3.1, 3.4, 4.7, 6.3
 */

import * as fc from 'fast-check';
import { Translation } from '../models/Translation';
import { Config } from '../models/Config';
import { TranslationService } from './TranslationService';
import { RedisCacheManager } from './RedisCacheManager';
import { LanguageResolver } from './LanguageResolver';
import { ValidationError } from '../errors/ValidationError';
import { ConflictError } from '../errors/ConflictError';
import Redis from 'ioredis';
import { sequelize } from '../config/database';

describe('TranslationService - Property-Based Tests', () => {
  let redisClient: Redis;
  let cacheManager: RedisCacheManager;
  let languageResolver: LanguageResolver;
  let service: TranslationService;
  let dbConnected = false;
  let redisConnected = false;

  beforeAll(async () => {
    // 设置测试数据库
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: true });
      dbConnected = true;
    } catch (error) {
      console.warn('Database not available for property tests. Tests will be skipped.');
      dbConnected = false;
    }

    // 设置 Redis
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
      console.warn('Redis not available for property tests. Tests will be skipped.');
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
      // 先删除 translations（子表），再删除 configs（父表）
      await Translation.destroy({ where: {}, force: true });
      await Config.destroy({ where: {}, force: true });
    }
    if (redisConnected) {
      await redisClient.flushdb();
    }
  });

  // Helper to skip tests if dependencies not available
  const skipIfNotReady = () => {
    if (!dbConnected || !redisConnected) {
      console.log('Skipping test - database or Redis not available');
      return true;
    }
    return false;
  };

  // Arbitraries for generating test data
  const supportedLanguageArbitrary = fc.constantFrom('zh-cn', 'en-us', 'ja-jp', 'ZH-CN', 'EN-US', 'JA-JP');
  const unsupportedLanguageArbitrary = fc.constantFrom('fr-fr', 'de-de', 'es-es', 'xx-xx');
  
  const titleArbitrary = fc.string({ minLength: 1, maxLength: 200 });
  const authorArbitrary = fc.string({ minLength: 1, maxLength: 100 });
  const descriptionArbitrary = fc.string({ minLength: 1, maxLength: 1000 });
  const keywordsArbitrary = fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 });

  const validTranslationDataArbitrary = fc.record({
    languageCode: supportedLanguageArbitrary,
    title: titleArbitrary,
    author: authorArbitrary,
    description: descriptionArbitrary,
    keywords: keywordsArbitrary,
  });

  /**
   * Property 2: Language Code Validation and Normalization
   * 
   * For any language code input, the system should accept only valid BCP 47 format codes
   * (e.g., zh-CN, en-US, ja-JP), normalize them to lowercase with hyphen format
   * (zh-cn, en-us, ja-jp), and reject invalid codes with a 400 error.
   * 
   * **Validates: Requirements 1.2, 4.1, 4.5, 8.1, 9.3**
   */
  describe('Property 2: Language Code Validation and Normalization', () => {
    it('should accept and normalize supported language codes', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          const translation = await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Property: language code should be normalized to lowercase
          expect(translation.languageCode).toBe(translation.languageCode.toLowerCase());
          expect(translation.languageCode).toMatch(/^[a-z]{2}-[a-z]{2}$/);

          // Cleanup
          await Translation.destroy({ where: { id: translation.id } });
        }),
        { numRuns: 100 }
      );
    });

    it('should reject unsupported language codes', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          unsupportedLanguageArbitrary,
          titleArbitrary,
          authorArbitrary,
          descriptionArbitrary,
          keywordsArbitrary,
          async (languageCode, title, author, description, keywords) => {
            // Property: unsupported language codes should throw ValidationError
            await expect(
              service.createTranslation({
                configId: config.id,
                languageCode,
                title,
                author,
                description,
                keywords,
              })
            ).rejects.toThrow(ValidationError);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 10: Required Fields Validation
   * 
   * For any translation creation or update request, if any required translatable field
   * (title, author, description, keywords) is missing or empty, the system should reject
   * the request with a 400 validation error.
   * 
   * **Validates: Requirements 4.5, 8.2**
   */
  describe('Property 10: Required Fields Validation', () => {
    it('should reject creation with missing required fields', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          supportedLanguageArbitrary,
          fc.constantFrom('title', 'author', 'description', 'keywords'),
          async (languageCode, fieldToOmit) => {
            const data: any = {
              configId: config.id,
              languageCode,
              title: 'Test Title',
              author: 'Test Author',
              description: 'Test Description',
              keywords: ['test'],
            };

            // Omit one required field
            delete data[fieldToOmit];

            // Property: missing required field should throw ValidationError
            await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject creation with empty string fields', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          supportedLanguageArbitrary,
          fc.constantFrom('title', 'author', 'description'),
          async (languageCode, fieldToEmpty) => {
            const data: any = {
              configId: config.id,
              languageCode,
              title: 'Test Title',
              author: 'Test Author',
              description: 'Test Description',
              keywords: ['test'],
            };

            // Set field to empty string
            data[fieldToEmpty] = '';

            // Property: empty required field should throw ValidationError
            await expect(service.createTranslation(data)).rejects.toThrow(ValidationError);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 19: Duplicate Translation Prevention
   * 
   * For any config and language code combination, attempting to create a second translation
   * with the same config ID and language code should fail with a 409 Conflict error.
   * 
   * **Validates: Requirements 8.3**
   */
  describe('Property 19: Duplicate Translation Prevention', () => {
    it('should prevent duplicate translations for same config and language', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          // Create first translation
          await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Property: attempting to create duplicate should throw ConflictError
          await expect(
            service.createTranslation({
              configId: config.id,
              ...data,
            })
          ).rejects.toThrow(ConflictError);

          // Cleanup
          await Translation.destroy({
            where: {
              configId: config.id,
              languageCode: languageResolver.normalizeLanguageCode(data.languageCode),
            },
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 21: Field Length Validation
   * 
   * For any translation, the title should not exceed 200 characters and the description
   * should not exceed 1000 characters; violations should result in a 400 validation error.
   * 
   * **Validates: Requirements 8.5, 8.6**
   */
  describe('Property 21: Field Length Validation', () => {
    it('should reject titles exceeding 200 characters', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          supportedLanguageArbitrary,
          fc.string({ minLength: 201, maxLength: 300 }),
          authorArbitrary,
          descriptionArbitrary,
          keywordsArbitrary,
          async (languageCode, title, author, description, keywords) => {
            // Property: title > 200 chars should throw ValidationError
            await expect(
              service.createTranslation({
                configId: config.id,
                languageCode,
                title,
                author,
                description,
                keywords,
              })
            ).rejects.toThrow(ValidationError);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject descriptions exceeding 1000 characters', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          supportedLanguageArbitrary,
          titleArbitrary,
          authorArbitrary,
          fc.string({ minLength: 1001, maxLength: 1500 }),
          keywordsArbitrary,
          async (languageCode, title, author, description, keywords) => {
            // Property: description > 1000 chars should throw ValidationError
            await expect(
              service.createTranslation({
                configId: config.id,
                languageCode,
                title,
                author,
                description,
                keywords,
              })
            ).rejects.toThrow(ValidationError);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept valid field lengths', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          const translation = await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Property: valid lengths should succeed
          expect(translation.title.length).toBeLessThanOrEqual(200);
          expect(translation.description.length).toBeLessThanOrEqual(1000);

          // Cleanup
          await Translation.destroy({ where: { id: translation.id } });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 22: Keywords Format Validation
   * 
   * For any translation, the keywords field should be a valid JSON array of strings;
   * invalid formats should result in a 400 validation error.
   * 
   * **Validates: Requirements 8.7**
   */
  describe('Property 22: Keywords Format Validation', () => {
    it('should reject non-array keywords', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          supportedLanguageArbitrary,
          titleArbitrary,
          authorArbitrary,
          descriptionArbitrary,
          fc.oneof(fc.string(), fc.integer(), fc.object(), fc.constant(null)),
          async (languageCode, title, author, description, invalidKeywords) => {
            // Property: non-array keywords should throw ValidationError
            await expect(
              service.createTranslation({
                configId: config.id,
                languageCode,
                title,
                author,
                description,
                keywords: invalidKeywords as any,
              })
            ).rejects.toThrow(ValidationError);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject arrays with non-string elements', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          supportedLanguageArbitrary,
          titleArbitrary,
          authorArbitrary,
          descriptionArbitrary,
          fc.array(fc.oneof(fc.integer(), fc.boolean(), fc.object()), { minLength: 1 }),
          async (languageCode, title, author, description, invalidKeywords) => {
            // Property: array with non-string elements should throw ValidationError
            await expect(
              service.createTranslation({
                configId: config.id,
                languageCode,
                title,
                author,
                description,
                keywords: invalidKeywords as any,
              })
            ).rejects.toThrow(ValidationError);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept valid string arrays', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          const translation = await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Property: valid string array should succeed
          expect(Array.isArray(translation.keywords)).toBe(true);
          expect(translation.keywords.every(k => typeof k === 'string')).toBe(true);

          // Cleanup
          await Translation.destroy({ where: { id: translation.id } });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 23: Translation Round-Trip Consistency
   * 
   * For any valid translation, creating it via the API and then retrieving it should return
   * an equivalent translation with all fields matching the original input (excluding
   * auto-generated fields like id, createdAt, updatedAt).
   * 
   * **Validates: Requirements 1.1, 4.1, 5.1**
   */
  describe('Property 23: Translation Round-Trip Consistency', () => {
    it('should maintain data consistency through create and retrieve', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          // Create translation
          const created = await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Retrieve translation
          const retrieved = await service.getTranslation(
            config.id,
            data.languageCode
          );

          // Property: retrieved data should match created data
          expect(retrieved).not.toBeNull();
          expect(retrieved!.configId).toBe(config.id);
          expect(retrieved!.languageCode).toBe(
            languageResolver.normalizeLanguageCode(data.languageCode)
          );
          expect(retrieved!.title).toBe(data.title);
          expect(retrieved!.author).toBe(data.author);
          expect(retrieved!.description).toBe(data.description);
          expect(retrieved!.keywords).toEqual(data.keywords);

          // Cleanup
          await Translation.destroy({ where: { id: created.id } });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Language Fallback Mechanism
   * 
   * For any config and any unsupported or non-existent language code, when requesting
   * a translation, the system should return the default language (zh-cn) translation.
   * 
   * **Validates: Requirements 3.1, 3.4**
   */
  describe('Property 8: Language Fallback Mechanism', () => {
    it('should fallback to default language when requested language not found', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          validTranslationDataArbitrary,
          unsupportedLanguageArbitrary,
          async (defaultData, requestedLang) => {
            // Create default language translation
            const { languageCode: _, ...dataWithoutLang } = defaultData;
            await service.createTranslation({
              configId: config.id,
              languageCode: 'zh-cn',
              ...dataWithoutLang,
            });

            // Request non-existent language
            const { translation, actualLanguage } = await service.getTranslationWithFallback(
              config.id,
              requestedLang
            );

            // Property: should return default language
            expect(actualLanguage).toBe('zh-cn');
            expect(translation.languageCode).toBe('zh-cn');
            expect(translation.title).toBe(defaultData.title);

            // Cleanup
            await Translation.destroy({ where: { configId: config.id } });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 11: Default Language Protection
   * 
   * For any config with multiple translations, attempting to delete the default language
   * (zh-cn) translation should fail with a validation error, but deleting non-default
   * language translations should succeed.
   * 
   * **Validates: Requirements 4.7**
   */
  describe('Property 11: Default Language Protection', () => {
    it('should prevent deletion of default language when other translations exist', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          validTranslationDataArbitrary,
          validTranslationDataArbitrary,
          async (defaultData, otherData) => {
            // Create default language translation
            const { languageCode: _1, ...defaultDataWithoutLang } = defaultData;
            await service.createTranslation({
              configId: config.id,
              languageCode: 'zh-cn',
              ...defaultDataWithoutLang,
            });

            // Create another language translation
            const { languageCode: _2, ...otherDataWithoutLang } = otherData;
            await service.createTranslation({
              configId: config.id,
              languageCode: 'en-us',
              ...otherDataWithoutLang,
            });

            // Property: deleting default language should fail
            await expect(
              service.deleteTranslation(config.id, 'zh-cn')
            ).rejects.toThrow(ValidationError);

            // Property: deleting non-default language should succeed
            await expect(
              service.deleteTranslation(config.id, 'en-us')
            ).resolves.not.toThrow();

            // Cleanup
            await Translation.destroy({ where: { configId: config.id } });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should allow deletion of default language when it is the only translation', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          // Create only default language translation
          const { languageCode: _, ...dataWithoutLang } = data;
          await service.createTranslation({
            configId: config.id,
            languageCode: 'zh-cn',
            ...dataWithoutLang,
          });

          // Property: deleting default language should succeed when it's the only one
          await expect(
            service.deleteTranslation(config.id, 'zh-cn')
          ).resolves.not.toThrow();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 16: Cache Invalidation on Update
   * 
   * For any translation, when it is updated or deleted, the corresponding cache entry
   * should be immediately invalidated, and the next request should fetch fresh data
   * from the database.
   * 
   * **Validates: Requirements 6.3**
   */
  describe('Property 16: Cache Invalidation on Update', () => {
    it('should invalidate cache on update', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(
          validTranslationDataArbitrary,
          titleArbitrary,
          async (initialData, newTitle) => {
            // Create translation
            const created = await service.createTranslation({
              configId: config.id,
              ...initialData,
            });

            // Get translation (should cache it)
            await service.getTranslation(config.id, initialData.languageCode);

            // Update translation
            await service.updateTranslation(config.id, initialData.languageCode, {
              title: newTitle,
            });

            // Get translation again
            const retrieved = await service.getTranslation(
              config.id,
              initialData.languageCode
            );

            // Property: retrieved data should reflect the update
            expect(retrieved!.title).toBe(newTitle);
            expect(retrieved!.title).not.toBe(initialData.title);

            // Cleanup
            await Translation.destroy({ where: { id: created.id } });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should invalidate cache on delete', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          // Create translation
          await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Get translation (should cache it)
          const cached = await service.getTranslation(config.id, data.languageCode);
          expect(cached).not.toBeNull();

          // Delete translation
          await service.deleteTranslation(config.id, data.languageCode);

          // Get translation again
          const retrieved = await service.getTranslation(config.id, data.languageCode);

          // Property: translation should not be found
          expect(retrieved).toBeNull();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 9: Fallback Logging
   * 
   * For any language fallback event (when requested language is unavailable), the system
   * should log the event with config ID, requested language, and returned language.
   * 
   * **Validates: Requirements 3.5**
   */
  describe('Property 9: Fallback Logging', () => {
    it('should log fallback events when requested language is unavailable', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      // Mock logger to capture log calls
      const logSpy = jest.spyOn(require('../config/logger').logger, 'info');

      await fc.assert(
        fc.asyncProperty(
          validTranslationDataArbitrary,
          supportedLanguageArbitrary,
          async (data, requestedLang) => {
            // Create only default language translation
            const { languageCode: _, ...dataWithoutLang } = data;
            await service.createTranslation({
              configId: config.id,
              languageCode: 'zh-cn',
              ...dataWithoutLang,
            });

            // Clear previous log calls
            logSpy.mockClear();

            // Request a different language (should fallback to zh-cn)
            const normalizedRequested = languageResolver.normalizeLanguageCode(requestedLang);
            if (normalizedRequested !== 'zh-cn') {
              const result = await service.getTranslationWithFallback(
                config.id,
                requestedLang
              );

              // Property: should return default language
              expect(result.actualLanguage).toBe('zh-cn');

              // Property: should log the fallback event
              expect(logSpy).toHaveBeenCalledWith(
                'Language fallback occurred',
                expect.objectContaining({
                  configId: config.id,
                  requestedLanguage: normalizedRequested,
                  returnedLanguage: 'zh-cn',
                })
              );
            }

            // Cleanup
            await Translation.destroy({ where: { configId: config.id } });
          }
        ),
        { numRuns: 50 }
      );

      logSpy.mockRestore();
    });

    it('should not log fallback when requested language is available', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      // Mock logger to capture log calls
      const logSpy = jest.spyOn(require('../config/logger').logger, 'info');

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          // Create translation
          await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Clear previous log calls
          logSpy.mockClear();

          // Request the same language (should not fallback)
          const result = await service.getTranslationWithFallback(
            config.id,
            data.languageCode
          );

          // Property: should return requested language
          const normalizedLang = languageResolver.normalizeLanguageCode(data.languageCode);
          expect(result.actualLanguage).toBe(normalizedLang);

          // Property: should NOT log fallback event
          const fallbackCalls = logSpy.mock.calls.filter(
            call => call[0] === 'Language fallback occurred'
          );
          expect(fallbackCalls.length).toBe(0);

          // Cleanup
          await Translation.destroy({ where: { configId: config.id } });
        }),
        { numRuns: 50 }
      );

      logSpy.mockRestore();
    });
  });

  /**
   * Property 4: Referential Integrity and Cascade Deletion
   * 
   * For any config with associated translations, when the config is deleted, all associated
   * translations should be automatically deleted (cascade), and attempting to create a
   * translation for a non-existent config should fail.
   * 
   * **Validates: Requirements 1.5, 4.6, 10.3**
   */
  describe('Property 4: Referential Integrity and Cascade Deletion', () => {
    it('should cascade delete translations when config is deleted', async () => {
      if (skipIfNotReady()) return;

      await fc.assert(
        fc.asyncProperty(
          fc.array(validTranslationDataArbitrary, { minLength: 1, maxLength: 3 }),
          async (translationsData) => {
            // Create config
            const config = await Config.create({ links: {}, permissions: {} });

            // Create multiple translations for the config
            const createdTranslations = await Promise.all(
              translationsData.map(data =>
                service.createTranslation({
                  configId: config.id,
                  ...data,
                })
              )
            );

            // Verify translations exist
            for (const translation of createdTranslations) {
              const found = await Translation.findByPk(translation.id);
              expect(found).not.toBeNull();
            }

            // Delete the config
            await Config.destroy({ where: { id: config.id } });

            // Property: all translations should be automatically deleted
            for (const translation of createdTranslations) {
              const found = await Translation.findByPk(translation.id);
              expect(found).toBeNull();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should fail to create translation for non-existent config', async () => {
      if (skipIfNotReady()) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 999999, max: 9999999 }),
          validTranslationDataArbitrary,
          async (nonExistentConfigId, data) => {
            // Property: creating translation for non-existent config should fail
            await expect(
              service.createTranslation({
                configId: nonExistentConfigId,
                ...data,
              })
            ).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 17: Batch Cache Invalidation
   * 
   * For any config with multiple cached translations in different languages, when the
   * config is deleted, all cache entries for all languages should be invalidated.
   * 
   * **Validates: Requirements 6.4**
   */
  describe('Property 17: Batch Cache Invalidation', () => {
    it('should invalidate all language caches when config is deleted', async () => {
      if (skipIfNotReady()) return;

      await fc.assert(
        fc.asyncProperty(
          fc.array(validTranslationDataArbitrary, { minLength: 2, maxLength: 3 }),
          async (translationsData) => {
            // Create config
            const config = await Config.create({ links: {}, permissions: {} });

            // Create translations in different languages
            const uniqueLanguages = Array.from(
              new Set(translationsData.map(d => languageResolver.normalizeLanguageCode(d.languageCode)))
            );

            for (let i = 0; i < uniqueLanguages.length; i++) {
              const lang = uniqueLanguages[i];
              const data = translationsData[i];
              await service.createTranslation({
                configId: config.id,
                languageCode: lang,
                title: data.title,
                author: data.author,
                description: data.description,
                keywords: data.keywords,
              });
            }

            // Get all translations to cache them
            for (const lang of uniqueLanguages) {
              await service.getTranslation(config.id, lang);
            }

            // Verify all are cached
            for (const lang of uniqueLanguages) {
              const cacheKey = `config:${config.id}:lang:${lang}`;
              const cached = await cacheManager.get(cacheKey);
              expect(cached).not.toBeNull();
            }

            // Invalidate all caches for the config
            await service.invalidateAllCachesForConfig(config.id);

            // Property: all cache entries should be invalidated
            for (const lang of uniqueLanguages) {
              const cacheKey = `config:${config.id}:lang:${lang}`;
              const cached = await cacheManager.get(cacheKey);
              expect(cached).toBeNull();
            }

            // Cleanup
            await Config.destroy({ where: { id: config.id } });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should invalidate caches for specific config without affecting others', async () => {
      if (skipIfNotReady()) return;

      await fc.assert(
        fc.asyncProperty(
          validTranslationDataArbitrary,
          validTranslationDataArbitrary,
          async (data1, data2) => {
            // Create two configs
            const config1 = await Config.create({ links: {}, permissions: {} });
            const config2 = await Config.create({ links: {}, permissions: {} });

            // Create translations for both configs
            await service.createTranslation({
              configId: config1.id,
              ...data1,
            });
            await service.createTranslation({
              configId: config2.id,
              ...data2,
            });

            // Cache both translations
            await service.getTranslation(config1.id, data1.languageCode);
            await service.getTranslation(config2.id, data2.languageCode);

            // Invalidate only config1's caches
            await service.invalidateAllCachesForConfig(config1.id);

            // Property: config1's cache should be invalidated
            const lang1 = languageResolver.normalizeLanguageCode(data1.languageCode);
            const cacheKey1 = `config:${config1.id}:lang:${lang1}`;
            const cached1 = await cacheManager.get(cacheKey1);
            expect(cached1).toBeNull();

            // Property: config2's cache should still exist
            const lang2 = languageResolver.normalizeLanguageCode(data2.languageCode);
            const cacheKey2 = `config:${config2.id}:lang:${lang2}`;
            const cached2 = await cacheManager.get(cacheKey2);
            expect(cached2).not.toBeNull();

            // Cleanup
            await Config.destroy({ where: { id: config1.id } });
            await Config.destroy({ where: { id: config2.id } });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 20: Database Constraint Error Handling
   * 
   * For any database constraint violation (foreign key, unique constraint, etc.), the
   * system should catch the error and return a descriptive error response rather than
   * exposing raw database errors.
   * 
   * **Validates: Requirements 8.4**
   */
  describe('Property 20: Database Constraint Error Handling', () => {
    it('should handle foreign key constraint violations gracefully', async () => {
      if (skipIfNotReady()) return;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 999999, max: 9999999 }),
          validTranslationDataArbitrary,
          async (nonExistentConfigId, data) => {
            // Property: attempting to create translation for non-existent config should throw
            // a descriptive error, not expose raw database error
            try {
              await service.createTranslation({
                configId: nonExistentConfigId,
                ...data,
              });
              // Should not reach here
              expect(true).toBe(false);
            } catch (error) {
              // Property: error should be a proper Error instance
              expect(error).toBeInstanceOf(Error);
              
              // Property: error should have a message (not raw database error)
              expect((error as Error).message).toBeDefined();
              expect((error as Error).message.length).toBeGreaterThan(0);
              
              // Property: error message should not contain raw SQL or database internals
              const message = (error as Error).message.toLowerCase();
              expect(message).not.toContain('sql');
              expect(message).not.toContain('sequelize');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle unique constraint violations gracefully', async () => {
      if (skipIfNotReady()) return;

      const config = await Config.create({ links: {}, permissions: {} });

      await fc.assert(
        fc.asyncProperty(validTranslationDataArbitrary, async (data) => {
          // Create first translation
          await service.createTranslation({
            configId: config.id,
            ...data,
          });

          // Property: attempting to create duplicate should throw ConflictError
          try {
            await service.createTranslation({
              configId: config.id,
              ...data,
            });
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            // Property: should be ConflictError, not raw database error
            expect(error).toBeInstanceOf(ConflictError);
            
            // Property: error should have descriptive message
            expect((error as ConflictError).message).toContain('already exists');
            expect((error as ConflictError).code).toBe('CONFLICT');
          }

          // Cleanup
          await Translation.destroy({ where: { configId: config.id } });
        }),
        { numRuns: 50 }
      );
    });
  });
});
