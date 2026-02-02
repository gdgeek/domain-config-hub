/**
 * Language Resolver Configuration Tests
 * 
 * Tests for language configuration management from environment variables
 * 
 * Requirements: 9.4
 */

import { createDefaultLanguageResolver } from './LanguageResolver';

describe('Language Resolver Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createDefaultLanguageResolver', () => {
    it('should use default values when environment variables are not set', () => {
      // Requirement 9.4: 测试默认配置
      delete process.env.DEFAULT_LANGUAGE;
      delete process.env.SUPPORTED_LANGUAGES;

      const resolver = createDefaultLanguageResolver();

      expect(resolver.getDefaultLanguage()).toBe('zh-cn');
      expect(resolver.getSupportedLanguages()).toEqual(['zh-cn', 'en-us', 'ja-jp']);
    });

    it('should read DEFAULT_LANGUAGE from environment variable', () => {
      // Requirement 9.4: 测试从环境变量读取默认语言
      process.env.DEFAULT_LANGUAGE = 'en-us';
      process.env.SUPPORTED_LANGUAGES = 'en-us,zh-cn';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.getDefaultLanguage()).toBe('en-us');
    });

    it('should read SUPPORTED_LANGUAGES from environment variable', () => {
      // Requirement 9.4: 测试从环境变量读取支持的语言列表
      process.env.DEFAULT_LANGUAGE = 'zh-cn';
      process.env.SUPPORTED_LANGUAGES = 'zh-cn,en-us,ja-jp,ko-kr';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.getSupportedLanguages()).toEqual(['zh-cn', 'en-us', 'ja-jp', 'ko-kr']);
    });

    it('should trim whitespace from supported languages', () => {
      // Requirement 9.4: 测试配置验证
      process.env.DEFAULT_LANGUAGE = 'zh-cn';
      process.env.SUPPORTED_LANGUAGES = ' zh-cn , en-us , ja-jp ';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.getSupportedLanguages()).toEqual(['zh-cn', 'en-us', 'ja-jp']);
    });

    it('should handle single supported language', () => {
      // Requirement 9.4: 测试单一语言配置
      process.env.DEFAULT_LANGUAGE = 'zh-cn';
      process.env.SUPPORTED_LANGUAGES = 'zh-cn';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.getSupportedLanguages()).toEqual(['zh-cn']);
    });

    it('should normalize language codes from environment variables', () => {
      // Requirement 9.4: 测试语言代码规范化
      process.env.DEFAULT_LANGUAGE = 'ZH_CN';
      process.env.SUPPORTED_LANGUAGES = 'ZH_CN,EN_US,JA_JP';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.getDefaultLanguage()).toBe('zh-cn');
      expect(resolver.getSupportedLanguages()).toEqual(['zh-cn', 'en-us', 'ja-jp']);
    });

    it('should validate that default language is supported', () => {
      // Requirement 9.4: 测试默认语言必须在支持列表中
      process.env.DEFAULT_LANGUAGE = 'zh-cn';
      process.env.SUPPORTED_LANGUAGES = 'zh-cn,en-us';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.isSupported('zh-cn')).toBe(true);
      expect(resolver.getDefaultLanguage()).toBe('zh-cn');
    });

    it('should handle empty SUPPORTED_LANGUAGES gracefully', () => {
      // Requirement 9.4: 测试空语言列表的处理
      process.env.DEFAULT_LANGUAGE = 'zh-cn';
      process.env.SUPPORTED_LANGUAGES = '';

      const resolver = createDefaultLanguageResolver();

      // Should fall back to default when empty
      expect(resolver.getSupportedLanguages()).toEqual(['zh-cn', 'en-us', 'ja-jp']);
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid language codes', () => {
      // Requirement 9.4: 测试有效的语言代码
      process.env.DEFAULT_LANGUAGE = 'zh-cn';
      process.env.SUPPORTED_LANGUAGES = 'zh-cn,en-us,ja-jp,ko-kr,fr-fr,de-de';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.isSupported('zh-cn')).toBe(true);
      expect(resolver.isSupported('en-us')).toBe(true);
      expect(resolver.isSupported('ja-jp')).toBe(true);
      expect(resolver.isSupported('ko-kr')).toBe(true);
      expect(resolver.isSupported('fr-fr')).toBe(true);
      expect(resolver.isSupported('de-de')).toBe(true);
    });

    it('should reject unsupported language codes', () => {
      // Requirement 9.4: 测试不支持的语言代码
      process.env.DEFAULT_LANGUAGE = 'zh-cn';
      process.env.SUPPORTED_LANGUAGES = 'zh-cn,en-us';

      const resolver = createDefaultLanguageResolver();

      expect(resolver.isSupported('ja-jp')).toBe(false);
      expect(resolver.isSupported('ko-kr')).toBe(false);
    });
  });

  describe('Configuration Documentation', () => {
    it('should document default values', () => {
      // Requirement 9.4: 确保默认值有文档记录
      // 默认语言：zh-cn
      // 支持的语言：zh-cn, en-us, ja-jp
      
      delete process.env.DEFAULT_LANGUAGE;
      delete process.env.SUPPORTED_LANGUAGES;

      const resolver = createDefaultLanguageResolver();

      expect(resolver.getDefaultLanguage()).toBe('zh-cn');
      expect(resolver.getSupportedLanguages()).toContain('zh-cn');
      expect(resolver.getSupportedLanguages()).toContain('en-us');
      expect(resolver.getSupportedLanguages()).toContain('ja-jp');
    });
  });
});
