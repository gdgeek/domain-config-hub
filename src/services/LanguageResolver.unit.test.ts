/**
 * Unit Tests for LanguageResolver
 * 
 * 测试语言解析器的各种功能和边界情况
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

import { Request } from 'express';
import { LanguageResolver } from './LanguageResolver';

describe('LanguageResolver', () => {
  let resolver: LanguageResolver;

  beforeEach(() => {
    resolver = new LanguageResolver({
      defaultLanguage: 'zh-cn',
      supportedLanguages: ['zh-cn', 'en-us', 'ja-jp'],
    });
  });

  describe('normalizeLanguageCode', () => {
    it('should convert underscore to hyphen', () => {
      expect(resolver.normalizeLanguageCode('zh_CN')).toBe('zh-cn');
      expect(resolver.normalizeLanguageCode('en_US')).toBe('en-us');
      expect(resolver.normalizeLanguageCode('ja_JP')).toBe('ja-jp');
    });

    it('should convert to lowercase', () => {
      expect(resolver.normalizeLanguageCode('ZH-CN')).toBe('zh-cn');
      expect(resolver.normalizeLanguageCode('EN-US')).toBe('en-us');
      expect(resolver.normalizeLanguageCode('JA-JP')).toBe('ja-jp');
    });

    it('should handle mixed case and underscore', () => {
      expect(resolver.normalizeLanguageCode('Zh_Cn')).toBe('zh-cn');
      expect(resolver.normalizeLanguageCode('En_Us')).toBe('en-us');
    });

    it('should handle already normalized codes', () => {
      expect(resolver.normalizeLanguageCode('zh-cn')).toBe('zh-cn');
      expect(resolver.normalizeLanguageCode('en-us')).toBe('en-us');
    });

    it('should handle multiple underscores', () => {
      expect(resolver.normalizeLanguageCode('zh_CN_test')).toBe('zh-cn-test');
    });
  });

  describe('parseAcceptLanguage', () => {
    it('should parse simple Accept-Language header', () => {
      const result = resolver.parseAcceptLanguage('zh-CN');
      expect(result).toBe('zh-cn');
    });

    it('should parse Accept-Language with quality values', () => {
      const result = resolver.parseAcceptLanguage('en-US,zh-CN;q=0.9');
      expect(result).toBe('en-us');
    });

    it('should respect quality values and return highest priority supported language', () => {
      const result = resolver.parseAcceptLanguage('fr-FR;q=0.9,zh-CN;q=0.8,en-US;q=0.7');
      expect(result).toBe('zh-cn'); // fr-FR not supported, zh-CN is next
    });

    it('should handle complex Accept-Language header', () => {
      const result = resolver.parseAcceptLanguage('en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7');
      expect(result).toBe('en-us');
    });

    it('should return null if no supported language found', () => {
      const result = resolver.parseAcceptLanguage('fr-FR,de-DE');
      expect(result).toBeNull();
    });

    it('should handle Accept-Language with spaces', () => {
      const result = resolver.parseAcceptLanguage('en-US, zh-CN;q=0.9, ja-JP;q=0.8');
      expect(result).toBe('en-us');
    });

    it('should handle Accept-Language with default quality (1.0)', () => {
      const result = resolver.parseAcceptLanguage('ja-JP,en-US;q=0.9');
      expect(result).toBe('ja-jp');
    });

    it('should normalize language codes in Accept-Language', () => {
      const result = resolver.parseAcceptLanguage('ZH_CN,EN_US;q=0.9');
      expect(result).toBe('zh-cn');
    });

    it('should handle empty Accept-Language header', () => {
      const result = resolver.parseAcceptLanguage('');
      expect(result).toBeNull();
    });

    it('should handle malformed quality values', () => {
      const result = resolver.parseAcceptLanguage('zh-CN;q=invalid,en-US');
      // zh-CN has invalid q (defaults to 1.0), en-US has default q=1.0
      // Both have same quality, so first one (zh-CN) is returned
      expect(result).toBe('zh-cn');
    });
  });

  describe('resolveLanguage', () => {
    it('should prioritize query parameter over Accept-Language header', () => {
      const req = {
        query: { lang: 'en-us' },
        headers: { 'accept-language': 'zh-CN' },
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('en-us');
    });

    it('should use Accept-Language header when query parameter is not present', () => {
      const req = {
        query: {},
        headers: { 'accept-language': 'ja-JP' },
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('ja-jp');
    });

    it('should return default language when neither query param nor header is present', () => {
      const req = {
        query: {},
        headers: {},
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('zh-cn');
    });

    it('should normalize query parameter language code', () => {
      const req = {
        query: { lang: 'EN_US' },
        headers: {},
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('en-us');
    });

    it('should fall back to Accept-Language if query param is unsupported', () => {
      const req = {
        query: { lang: 'fr-fr' }, // unsupported
        headers: { 'accept-language': 'en-US' },
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('en-us');
    });

    it('should fall back to default if both query param and header are unsupported', () => {
      const req = {
        query: { lang: 'fr-fr' },
        headers: { 'accept-language': 'de-DE' },
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('zh-cn');
    });

    it('should handle non-string query parameter', () => {
      const req = {
        query: { lang: ['en-us', 'zh-cn'] }, // array instead of string
        headers: { 'accept-language': 'ja-JP' },
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('ja-jp'); // should fall back to Accept-Language
    });

    it('should handle missing Accept-Language header', () => {
      const req = {
        query: {},
        headers: {},
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('zh-cn');
    });

    it('should handle Accept-Language as array (edge case)', () => {
      const req = {
        query: {},
        headers: { 'accept-language': ['en-US', 'zh-CN'] }, // array instead of string
      } as unknown as Request;

      const result = resolver.resolveLanguage(req);
      expect(result).toBe('zh-cn'); // should fall back to default
    });
  });

  describe('isSupported', () => {
    it('should return true for supported languages', () => {
      expect(resolver.isSupported('zh-cn')).toBe(true);
      expect(resolver.isSupported('en-us')).toBe(true);
      expect(resolver.isSupported('ja-jp')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(resolver.isSupported('fr-fr')).toBe(false);
      expect(resolver.isSupported('de-de')).toBe(false);
    });

    it('should normalize language code before checking', () => {
      expect(resolver.isSupported('ZH-CN')).toBe(true);
      expect(resolver.isSupported('zh_cn')).toBe(true);
      expect(resolver.isSupported('EN_US')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(resolver.isSupported('')).toBe(false);
    });

    it('should return false for invalid language codes', () => {
      expect(resolver.isSupported('invalid')).toBe(false);
      expect(resolver.isSupported('zh')).toBe(false); // partial code
    });
  });

  describe('getDefaultLanguage', () => {
    it('should return the default language', () => {
      expect(resolver.getDefaultLanguage()).toBe('zh-cn');
    });

    it('should return normalized default language', () => {
      const customResolver = new LanguageResolver({
        defaultLanguage: 'EN_US',
        supportedLanguages: ['en-us'],
      });
      expect(customResolver.getDefaultLanguage()).toBe('en-us');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', () => {
      const languages = resolver.getSupportedLanguages();
      expect(languages).toHaveLength(3);
      expect(languages).toContain('zh-cn');
      expect(languages).toContain('en-us');
      expect(languages).toContain('ja-jp');
    });

    it('should return normalized language codes', () => {
      const customResolver = new LanguageResolver({
        defaultLanguage: 'zh-cn',
        supportedLanguages: ['ZH_CN', 'EN_US', 'JA_JP'],
      });
      const languages = customResolver.getSupportedLanguages();
      expect(languages).toContain('zh-cn');
      expect(languages).toContain('en-us');
      expect(languages).toContain('ja-jp');
    });

    it('should return a new array each time', () => {
      const languages1 = resolver.getSupportedLanguages();
      const languages2 = resolver.getSupportedLanguages();
      expect(languages1).not.toBe(languages2); // different array instances
      expect(languages1).toEqual(languages2); // but same content
    });
  });

  describe('constructor', () => {
    it('should normalize default language in constructor', () => {
      const customResolver = new LanguageResolver({
        defaultLanguage: 'ZH_CN',
        supportedLanguages: ['zh-cn'],
      });
      expect(customResolver.getDefaultLanguage()).toBe('zh-cn');
    });

    it('should normalize supported languages in constructor', () => {
      const customResolver = new LanguageResolver({
        defaultLanguage: 'zh-cn',
        supportedLanguages: ['ZH_CN', 'EN_US'],
      });
      const languages = customResolver.getSupportedLanguages();
      expect(languages).toContain('zh-cn');
      expect(languages).toContain('en-us');
    });

    it('should handle duplicate supported languages', () => {
      const customResolver = new LanguageResolver({
        defaultLanguage: 'zh-cn',
        supportedLanguages: ['zh-cn', 'ZH-CN', 'zh_cn'],
      });
      const languages = customResolver.getSupportedLanguages();
      expect(languages).toHaveLength(1); // duplicates removed by Set
      expect(languages).toContain('zh-cn');
    });
  });

  describe('edge cases', () => {
    it('should handle empty supported languages list', () => {
      const customResolver = new LanguageResolver({
        defaultLanguage: 'zh-cn',
        supportedLanguages: [],
      });
      expect(customResolver.getSupportedLanguages()).toHaveLength(0);
      expect(customResolver.isSupported('zh-cn')).toBe(false);
    });

    it('should handle single supported language', () => {
      const customResolver = new LanguageResolver({
        defaultLanguage: 'zh-cn',
        supportedLanguages: ['zh-cn'],
      });
      expect(customResolver.getSupportedLanguages()).toHaveLength(1);
      expect(customResolver.isSupported('zh-cn')).toBe(true);
    });

    it('should handle language codes with extra hyphens', () => {
      const result = resolver.normalizeLanguageCode('zh-Hans-CN');
      expect(result).toBe('zh-hans-cn');
    });
  });
});
