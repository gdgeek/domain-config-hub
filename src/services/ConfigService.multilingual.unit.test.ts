/**
 * ConfigService Multilingual Unit Tests
 * 
 * Tests for the enhanced ConfigService with multilingual support
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { ConfigService } from './ConfigService';
import { ConfigRepository } from '../repositories/ConfigRepository';
import { DomainRepository } from '../repositories/DomainRepository';
import { TranslationService, TranslationResponse } from './TranslationService';
import { LanguageResolver } from './LanguageResolver';
import { NotFoundError } from '../errors/NotFoundError';

// Mock dependencies
jest.mock('../repositories/ConfigRepository');
jest.mock('../repositories/DomainRepository');

describe('ConfigService - Multilingual Support', () => {
  let configService: ConfigService;
  let mockConfigRepository: jest.Mocked<ConfigRepository>;
  let mockDomainRepository: jest.Mocked<DomainRepository>;
  let mockTranslationService: jest.Mocked<TranslationService>;
  let mockLanguageResolver: jest.Mocked<LanguageResolver>;

  beforeEach(() => {
    mockConfigRepository = new ConfigRepository() as jest.Mocked<ConfigRepository>;
    mockDomainRepository = new DomainRepository() as jest.Mocked<DomainRepository>;
    
    // Mock TranslationService
    mockTranslationService = {
      getTranslationWithFallback: jest.fn(),
      createTranslation: jest.fn(),
      updateTranslation: jest.fn(),
      getTranslation: jest.fn(),
      getAllTranslations: jest.fn(),
      deleteTranslation: jest.fn(),
    } as any;

    // Mock LanguageResolver
    mockLanguageResolver = {
      getDefaultLanguage: jest.fn().mockReturnValue('zh-cn'),
      normalizeLanguageCode: jest.fn(code => code.toLowerCase().replace('_', '-')),
      isSupported: jest.fn().mockReturnValue(true),
      getSupportedLanguages: jest.fn().mockReturnValue(['zh-cn', 'en-us', 'ja-jp']),
      resolveLanguage: jest.fn(),
      parseAcceptLanguage: jest.fn(),
    } as any;

    configService = new ConfigService(
      mockConfigRepository,
      mockDomainRepository,
      mockTranslationService,
      mockLanguageResolver
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfigById', () => {
    const mockConfig = {
      id: 1,
      title: null,
      author: null,
      description: null,
      keywords: null,
      links: { homepage: 'https://example.com' },
      permissions: { read: true },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    const mockTranslation: TranslationResponse = {
      id: 1,
      configId: 1,
      languageCode: 'en-us',
      title: 'Example Title',
      author: 'John Doe',
      description: 'Example description',
      keywords: ['example', 'test'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    it('应该返回指定语言的配置（Requirements: 5.1, 5.4）', async () => {
      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
        translation: mockTranslation,
        actualLanguage: 'en-us',
      });

      const result = await configService.getConfigById(1, 'en-us');

      expect(result).toEqual({
        id: 1,
        links: { homepage: 'https://example.com' },
        permissions: { read: true },
        createdAt: mockConfig.createdAt,
        updatedAt: mockConfig.updatedAt,
        title: 'Example Title',
        author: 'John Doe',
        description: 'Example description',
        keywords: ['example', 'test'],
        language: 'en-us',
      });

      expect(mockConfigRepository.findById).toHaveBeenCalledWith(1);
      expect(mockTranslationService.getTranslationWithFallback).toHaveBeenCalledWith(1, 'en-us');
    });

    it('应该使用默认语言当未指定语言时（Requirements: 5.5）', async () => {
      const zhTranslation: TranslationResponse = {
        ...mockTranslation,
        languageCode: 'zh-cn',
        title: '示例标题',
        author: '张三',
        description: '示例描述',
        keywords: ['示例', '测试'],
      };

      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
        translation: zhTranslation,
        actualLanguage: 'zh-cn',
      });

      const result = await configService.getConfigById(1);

      expect(result.language).toBe('zh-cn');
      expect(result.title).toBe('示例标题');
      expect(mockTranslationService.getTranslationWithFallback).toHaveBeenCalledWith(1, 'zh-cn');
    });

    it('应该正确合并非翻译字段和翻译字段（Requirements: 5.4）', async () => {
      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
        translation: mockTranslation,
        actualLanguage: 'en-us',
      });

      const result = await configService.getConfigById(1, 'en-us');

      // 验证非翻译字段来自 configs 表
      expect(result.links).toEqual({ homepage: 'https://example.com' });
      expect(result.permissions).toEqual({ read: true });

      // 验证翻译字段来自 translations 表
      expect(result.title).toBe('Example Title');
      expect(result.author).toBe('John Doe');
      expect(result.description).toBe('Example description');
      expect(result.keywords).toEqual(['example', 'test']);
    });

    it('配置不存在时应该抛出 NotFoundError', async () => {
      mockConfigRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(configService.getConfigById(999, 'en-us')).rejects.toThrow(NotFoundError);
      await expect(configService.getConfigById(999, 'en-us')).rejects.toThrow('Config not found: 999');
    });

    it('应该处理语言降级场景', async () => {
      const zhTranslation: TranslationResponse = {
        ...mockTranslation,
        languageCode: 'zh-cn',
        title: '示例标题',
      };

      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      // 请求 ja-jp，但降级到 zh-cn
      mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
        translation: zhTranslation,
        actualLanguage: 'zh-cn',
      });

      const result = await configService.getConfigById(1, 'ja-jp');

      expect(result.language).toBe('zh-cn');
      expect(result.title).toBe('示例标题');
    });
  });

  describe('getConfigByDomain', () => {
    const mockConfig = {
      id: 1,
      title: null,
      author: null,
      description: null,
      keywords: null,
      links: { homepage: 'https://example.com' },
      permissions: { read: true },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    const mockDomainRecord = {
      id: 1,
      domain: 'example.com',
      configId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    const mockTranslation: TranslationResponse = {
      id: 1,
      configId: 1,
      languageCode: 'en-us',
      title: 'Example Title',
      author: 'John Doe',
      description: 'Example description',
      keywords: ['example', 'test'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    it('应该通过域名返回指定语言的配置（Requirements: 5.2, 5.4）', async () => {
      mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(mockDomainRecord);
      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
        translation: mockTranslation,
        actualLanguage: 'en-us',
      });

      const result = await configService.getConfigByDomain('example.com', 'en-us');

      expect(result.title).toBe('Example Title');
      expect(result.language).toBe('en-us');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('example.com');
      expect(mockConfigRepository.findById).toHaveBeenCalledWith(1);
    });

    it('域名不存在时应该抛出 NotFoundError', async () => {
      mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(null);

      await expect(configService.getConfigByDomain('notexist.com', 'en-us')).rejects.toThrow(NotFoundError);
      await expect(configService.getConfigByDomain('notexist.com', 'en-us')).rejects.toThrow('Domain not found: notexist.com');
    });

    it('应该使用默认语言当未指定语言时（Requirements: 5.5）', async () => {
      const zhTranslation: TranslationResponse = {
        ...mockTranslation,
        languageCode: 'zh-cn',
        title: '示例标题',
      };

      mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(mockDomainRecord);
      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
        translation: zhTranslation,
        actualLanguage: 'zh-cn',
      });

      const result = await configService.getConfigByDomain('example.com');

      expect(result.language).toBe('zh-cn');
      expect(mockTranslationService.getTranslationWithFallback).toHaveBeenCalledWith(1, 'zh-cn');
    });
  });

  describe('listConfigs', () => {
    const mockConfigs = [
      {
        id: 1,
        title: null,
        author: null,
        description: null,
        keywords: null,
        links: { homepage: 'https://example1.com' },
        permissions: { read: true },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 2,
        title: null,
        author: null,
        description: null,
        keywords: null,
        links: { homepage: 'https://example2.com' },
        permissions: { read: true },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    const mockTranslations: TranslationResponse[] = [
      {
        id: 1,
        configId: 1,
        languageCode: 'en-us',
        title: 'Config 1',
        author: 'Author 1',
        description: 'Description 1',
        keywords: ['test1'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 2,
        configId: 2,
        languageCode: 'en-us',
        title: 'Config 2',
        author: 'Author 2',
        description: 'Description 2',
        keywords: ['test2'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    it('应该返回所有配置的指定语言翻译（Requirements: 5.3, 5.4）', async () => {
      mockConfigRepository.findAll = jest.fn().mockResolvedValue(mockConfigs);
      mockTranslationService.getTranslationWithFallback = jest.fn()
        .mockResolvedValueOnce({
          translation: mockTranslations[0],
          actualLanguage: 'en-us',
        })
        .mockResolvedValueOnce({
          translation: mockTranslations[1],
          actualLanguage: 'en-us',
        });

      const result = await configService.listConfigs('en-us');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Config 1');
      expect(result[0].language).toBe('en-us');
      expect(result[1].title).toBe('Config 2');
      expect(result[1].language).toBe('en-us');
      expect(mockTranslationService.getTranslationWithFallback).toHaveBeenCalledTimes(2);
    });

    it('应该使用默认语言当未指定语言时（Requirements: 5.5）', async () => {
      const zhTranslations: TranslationResponse[] = mockTranslations.map(t => ({
        ...t,
        languageCode: 'zh-cn',
        title: `配置 ${t.configId}`,
      }));

      mockConfigRepository.findAll = jest.fn().mockResolvedValue(mockConfigs);
      mockTranslationService.getTranslationWithFallback = jest.fn()
        .mockResolvedValueOnce({
          translation: zhTranslations[0],
          actualLanguage: 'zh-cn',
        })
        .mockResolvedValueOnce({
          translation: zhTranslations[1],
          actualLanguage: 'zh-cn',
        });

      const result = await configService.listConfigs();

      expect(result).toHaveLength(2);
      expect(result[0].language).toBe('zh-cn');
      expect(result[1].language).toBe('zh-cn');
      expect(mockTranslationService.getTranslationWithFallback).toHaveBeenCalledWith(1, 'zh-cn');
      expect(mockTranslationService.getTranslationWithFallback).toHaveBeenCalledWith(2, 'zh-cn');
    });

    it('应该过滤掉没有翻译的配置', async () => {
      mockConfigRepository.findAll = jest.fn().mockResolvedValue(mockConfigs);
      mockTranslationService.getTranslationWithFallback = jest.fn()
        .mockResolvedValueOnce({
          translation: mockTranslations[0],
          actualLanguage: 'en-us',
        })
        .mockRejectedValueOnce(new NotFoundError('Translation not found', 'NOT_FOUND'));

      const result = await configService.listConfigs('en-us');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Config 1');
    });

    it('应该正确合并所有配置的非翻译字段和翻译字段（Requirements: 5.4）', async () => {
      mockConfigRepository.findAll = jest.fn().mockResolvedValue(mockConfigs);
      mockTranslationService.getTranslationWithFallback = jest.fn()
        .mockResolvedValueOnce({
          translation: mockTranslations[0],
          actualLanguage: 'en-us',
        })
        .mockResolvedValueOnce({
          translation: mockTranslations[1],
          actualLanguage: 'en-us',
        });

      const result = await configService.listConfigs('en-us');

      // 验证第一个配置
      expect(result[0].links).toEqual({ homepage: 'https://example1.com' });
      expect(result[0].title).toBe('Config 1');

      // 验证第二个配置
      expect(result[1].links).toEqual({ homepage: 'https://example2.com' });
      expect(result[1].title).toBe('Config 2');
    });
  });

  describe('mergeConfigWithTranslation', () => {
    it('应该正确合并配置和翻译（Requirements: 5.4）', async () => {
      const config = {
        id: 1,
        title: null,
        author: null,
        description: null,
        keywords: null,
        links: { homepage: 'https://example.com' },
        permissions: { read: true, write: false },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const translation: TranslationResponse = {
        id: 1,
        configId: 1,
        languageCode: 'en-us',
        title: 'Merged Title',
        author: 'Merged Author',
        description: 'Merged Description',
        keywords: ['merged', 'test'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockConfigRepository.findById = jest.fn().mockResolvedValue(config);
      mockTranslationService.getTranslationWithFallback = jest.fn().mockResolvedValue({
        translation,
        actualLanguage: 'en-us',
      });

      const result = await configService.getConfigById(1, 'en-us');

      // 验证非翻译字段
      expect(result.id).toBe(1);
      expect(result.links).toEqual({ homepage: 'https://example.com' });
      expect(result.permissions).toEqual({ read: true, write: false });
      expect(result.createdAt).toEqual(config.createdAt);
      expect(result.updatedAt).toEqual(config.updatedAt);

      // 验证翻译字段
      expect(result.title).toBe('Merged Title');
      expect(result.author).toBe('Merged Author');
      expect(result.description).toBe('Merged Description');
      expect(result.keywords).toEqual(['merged', 'test']);

      // 验证元数据
      expect(result.language).toBe('en-us');
    });
  });

  describe('Multilingual support not enabled', () => {
    it('应该在未启用多语言支持时抛出错误', async () => {
      const serviceWithoutMultilingual = new ConfigService(
        mockConfigRepository,
        mockDomainRepository
      );

      await expect(serviceWithoutMultilingual.getConfigById(1, 'en-us')).rejects.toThrow(
        'Multilingual support is not enabled'
      );

      await expect(serviceWithoutMultilingual.getConfigByDomain('example.com', 'en-us')).rejects.toThrow(
        'Multilingual support is not enabled'
      );

      await expect(serviceWithoutMultilingual.listConfigs('en-us')).rejects.toThrow(
        'Multilingual support is not enabled'
      );
    });
  });
});
