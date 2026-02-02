/**
 * ConfigService Multilingual Property-Based Tests
 * 
 * Property-based tests for the enhanced ConfigService with multilingual support
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fc from 'fast-check';
import { ConfigService } from './ConfigService';
import { ConfigRepository } from '../repositories/ConfigRepository';
import { DomainRepository } from '../repositories/DomainRepository';
import { TranslationService, TranslationResponse } from './TranslationService';
import { LanguageResolver } from './LanguageResolver';

// Mock dependencies
jest.mock('../repositories/ConfigRepository');
jest.mock('../repositories/DomainRepository');

describe('ConfigService - Multilingual Property-Based Tests', () => {
  let mockConfigRepository: jest.Mocked<ConfigRepository>;
  let mockDomainRepository: jest.Mocked<DomainRepository>;
  let mockTranslationService: jest.Mocked<TranslationService>;
  let mockLanguageResolver: jest.Mocked<LanguageResolver>;

  beforeEach(() => {
    mockConfigRepository = new ConfigRepository() as jest.Mocked<ConfigRepository>;
    mockDomainRepository = new DomainRepository() as jest.Mocked<DomainRepository>;
    
    mockTranslationService = {
      getTranslationWithFallback: jest.fn(),
      createTranslation: jest.fn(),
      updateTranslation: jest.fn(),
      getTranslation: jest.fn(),
      getAllTranslations: jest.fn(),
      deleteTranslation: jest.fn(),
    } as any;

    mockLanguageResolver = {
      getDefaultLanguage: jest.fn().mockReturnValue('zh-cn'),
      normalizeLanguageCode: jest.fn(code => code.toLowerCase().replace('_', '-')),
      isSupported: jest.fn().mockReturnValue(true),
      getSupportedLanguages: jest.fn().mockReturnValue(['zh-cn', 'en-us', 'ja-jp']),
      resolveLanguage: jest.fn(),
      parseAcceptLanguage: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 12: Language-Specific Query Results
   * 
   * **Validates: Requirements 5.1, 5.2, 5.3**
   * 
   * For any config query (by ID, by domain, or list) with a specified language code,
   * all returned configs should contain translations in the requested language
   * (or default language if unavailable), and the language field should correctly
   * indicate which language was returned.
   */
  describe('Property 12: Language-Specific Query Results', () => {
    it('getConfigById 应该返回请求语言的翻译', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // configId
          fc.constantFrom('zh-cn', 'en-us', 'ja-jp'), // languageCode
          fc.string({ minLength: 1, maxLength: 100 }), // title
          async (configId, languageCode, title) => {
            const configService = new ConfigService(
              mockConfigRepository,
              mockDomainRepository,
              mockTranslationService,
              mockLanguageResolver
            );

            const mockConfig = {
              id: configId,
              title: null,
              author: null,
              description: null,
              keywords: null,
              links: {},
              permissions: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockTranslation: TranslationResponse = {
              id: 1,
              configId,
              languageCode,
              title,
              author: 'Test Author',
              description: 'Test Description',
              keywords: ['test'],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
            mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
              translation: mockTranslation,
              actualLanguage: languageCode,
            });

            const result = await configService.getConfigById(configId, languageCode);

            // 验证返回的语言与请求的语言一致
            expect(result.language).toBe(languageCode);
            // 验证翻译内容正确
            expect(result.title).toBe(title);
            // 验证配置 ID 正确
            expect(result.id).toBe(configId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getConfigByDomain 应该返回请求语言的翻译', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // configId
          fc.domain(), // domain
          fc.constantFrom('zh-cn', 'en-us', 'ja-jp'), // languageCode
          fc.string({ minLength: 1, maxLength: 100 }), // title
          async (configId, domain, languageCode, title) => {
            const configService = new ConfigService(
              mockConfigRepository,
              mockDomainRepository,
              mockTranslationService,
              mockLanguageResolver
            );

            const mockDomainRecord = {
              id: 1,
              domain,
              configId,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockConfig = {
              id: configId,
              title: null,
              author: null,
              description: null,
              keywords: null,
              links: {},
              permissions: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockTranslation: TranslationResponse = {
              id: 1,
              configId,
              languageCode,
              title,
              author: 'Test Author',
              description: 'Test Description',
              keywords: ['test'],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(mockDomainRecord);
            mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
            mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
              translation: mockTranslation,
              actualLanguage: languageCode,
            });

            const result = await configService.getConfigByDomain(domain, languageCode);

            // 验证返回的语言与请求的语言一致
            expect(result.language).toBe(languageCode);
            // 验证翻译内容正确
            expect(result.title).toBe(title);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('listConfigs 应该返回所有配置的请求语言翻译', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 5 }), // configIds
          fc.constantFrom('zh-cn', 'en-us', 'ja-jp'), // languageCode
          async (configIds, languageCode) => {
            const configService = new ConfigService(
              mockConfigRepository,
              mockDomainRepository,
              mockTranslationService,
              mockLanguageResolver
            );

            const mockConfigs = configIds.map(id => ({
              id,
              title: null,
              author: null,
              description: null,
              keywords: null,
              links: {},
              permissions: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            mockConfigRepository.findAll = jest.fn().mockResolvedValue(mockConfigs);

            // 为每个配置设置翻译
            for (const config of mockConfigs) {
              const mockTranslation: TranslationResponse = {
                id: config.id,
                configId: config.id,
                languageCode,
                title: `Title ${config.id}`,
                author: 'Test Author',
                description: 'Test Description',
                keywords: ['test'],
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              mockTranslationService.getTranslationWithFallback = jest.fn()
                .mockImplementation((id: number) => {
                  const translation = {
                    ...mockTranslation,
                    configId: id,
                    title: `Title ${id}`,
                  };
                  return Promise.resolve({
                    translation,
                    actualLanguage: languageCode,
                  });
                });
            }

            const result = await configService.listConfigs(languageCode);

            // 验证所有配置都返回了请求的语言
            expect(result.length).toBeGreaterThan(0);
            result.forEach(config => {
              expect(config.language).toBe(languageCode);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Data Merging Correctness
   * 
   * **Validates: Requirements 5.4**
   * 
   * For any config with translations, when querying the config, the returned object
   * should contain all non-translatable fields (links, permissions) from the configs
   * table merged with translatable fields (title, author, description, keywords)
   * from the translations table.
   */
  describe('Property 13: Data Merging Correctness', () => {
    it('应该正确合并非翻译字段和翻译字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // configId
          fc.object(), // links
          fc.object(), // permissions
          fc.string({ minLength: 1, maxLength: 100 }), // title
          fc.string({ minLength: 1, maxLength: 100 }), // author
          fc.string({ minLength: 1, maxLength: 500 }), // description
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }), // keywords
          async (configId, links, permissions, title, author, description, keywords) => {
            const configService = new ConfigService(
              mockConfigRepository,
              mockDomainRepository,
              mockTranslationService,
              mockLanguageResolver
            );

            const mockConfig = {
              id: configId,
              title: null,
              author: null,
              description: null,
              keywords: null,
              links,
              permissions,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-02'),
            };

            const mockTranslation: TranslationResponse = {
              id: 1,
              configId,
              languageCode: 'en-us',
              title,
              author,
              description,
              keywords,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-02'),
            };

            mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
            mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
              translation: mockTranslation,
              actualLanguage: 'en-us',
            });

            const result = await configService.getConfigById(configId, 'en-us');

            // 验证非翻译字段来自 configs 表
            expect(result.links).toEqual(links);
            expect(result.permissions).toEqual(permissions);
            expect(result.createdAt).toEqual(mockConfig.createdAt);
            expect(result.updatedAt).toEqual(mockConfig.updatedAt);

            // 验证翻译字段来自 translations 表
            expect(result.title).toBe(title);
            expect(result.author).toBe(author);
            expect(result.description).toBe(description);
            expect(result.keywords).toEqual(keywords);

            // 验证配置 ID 正确
            expect(result.id).toBe(configId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Default Language When Unspecified
   * 
   * **Validates: Requirements 5.5, 7.1**
   * 
   * For any config query without a language code specified, the system should
   * return the default language (zh-cn) translation.
   */
  describe('Property 14: Default Language When Unspecified', () => {
    it('getConfigById 未指定语言时应该返回默认语言', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // configId
          fc.string({ minLength: 1, maxLength: 100 }), // title
          async (configId, title) => {
            const configService = new ConfigService(
              mockConfigRepository,
              mockDomainRepository,
              mockTranslationService,
              mockLanguageResolver
            );

            const mockConfig = {
              id: configId,
              title: null,
              author: null,
              description: null,
              keywords: null,
              links: {},
              permissions: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockTranslation: TranslationResponse = {
              id: 1,
              configId,
              languageCode: 'zh-cn',
              title,
              author: 'Test Author',
              description: 'Test Description',
              keywords: ['test'],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
            mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
              translation: mockTranslation,
              actualLanguage: 'zh-cn',
            });

            // 不指定语言代码
            const result = await configService.getConfigById(configId);

            // 验证返回的是默认语言
            expect(result.language).toBe('zh-cn');
            // 验证调用时使用了默认语言
            expect(mockTranslationService.getTranslationWithFallback).toHaveBeenCalledWith(
              configId,
              'zh-cn'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getConfigByDomain 未指定语言时应该返回默认语言', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // configId
          fc.domain(), // domain
          async (configId, domain) => {
            const configService = new ConfigService(
              mockConfigRepository,
              mockDomainRepository,
              mockTranslationService,
              mockLanguageResolver
            );

            const mockDomainRecord = {
              id: 1,
              domain,
              configId,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockConfig = {
              id: configId,
              title: null,
              author: null,
              description: null,
              keywords: null,
              links: {},
              permissions: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockTranslation: TranslationResponse = {
              id: 1,
              configId,
              languageCode: 'zh-cn',
              title: 'Default Title',
              author: 'Test Author',
              description: 'Test Description',
              keywords: ['test'],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(mockDomainRecord);
            mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
            mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
              translation: mockTranslation,
              actualLanguage: 'zh-cn',
            });

            // 不指定语言代码
            const result = await configService.getConfigByDomain(domain);

            // 验证返回的是默认语言
            expect(result.language).toBe('zh-cn');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('listConfigs 未指定语言时应该返回默认语言', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 5 }), // configIds
          async (configIds) => {
            const configService = new ConfigService(
              mockConfigRepository,
              mockDomainRepository,
              mockTranslationService,
              mockLanguageResolver
            );

            const mockConfigs = configIds.map(id => ({
              id,
              title: null,
              author: null,
              description: null,
              keywords: null,
              links: {},
              permissions: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            mockConfigRepository.findAll = jest.fn().mockResolvedValue(mockConfigs);

            for (const config of mockConfigs) {
              const mockTranslation: TranslationResponse = {
                id: config.id,
                configId: config.id,
                languageCode: 'zh-cn',
                title: `Title ${config.id}`,
                author: 'Test Author',
                description: 'Test Description',
                keywords: ['test'],
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              mockTranslationService.getTranslationWithFallback = jest.fn()
                .mockImplementation((id: number) => {
                  const translation = {
                    ...mockTranslation,
                    configId: id,
                    title: `Title ${id}`,
                  };
                  return Promise.resolve({
                    translation,
                    actualLanguage: 'zh-cn',
                  });
                });
            }

            // 不指定语言代码
            const result = await configService.listConfigs();

            // 验证所有配置都返回了默认语言
            expect(result.length).toBeGreaterThan(0);
            result.forEach(config => {
              expect(config.language).toBe('zh-cn');
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
