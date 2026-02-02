/**
 * DomainRoutes Multilingual Unit Tests
 * 
 * Unit tests for multilingual support in domain query endpoints (with mocked services)
 * Requirements: 5.2, 2.1, 2.2, 3.4
 */

import request from 'supertest';
import express, { Application } from 'express';
import { Router } from 'express';
import { errorHandler } from '../middleware/ErrorMiddleware';
import { createDefaultLanguageResolver } from '../services/LanguageResolver';
import { ConfigService, ConfigWithTranslation } from '../services/ConfigService';
import { NotFoundError } from '../errors/NotFoundError';

// Mock the services
jest.mock('../services/ConfigService');
jest.mock('../config/redis', () => ({
  isRedisEnabled: jest.fn(() => true),
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  })),
  connectRedis: jest.fn(),
  closeRedis: jest.fn(),
}));

describe('DomainRoutes - Multilingual Support (Unit Tests)', () => {
  let app: Application;
  let mockConfigService: jest.Mocked<ConfigService>;
  const languageResolver = createDefaultLanguageResolver();

  const mockConfigWithTranslation: ConfigWithTranslation = {
    id: 1,
    links: { homepage: 'https://example.com' },
    permissions: { read: true },
    createdAt: new Date(),
    updatedAt: new Date(),
    title: 'Test Domain Title',
    author: 'Jane Smith',
    description: 'Test Domain Description',
    keywords: ['domain', 'test'],
    language: 'en-us',
  };

  beforeEach(() => {
    // Create a simple router for testing
    const router = Router();
    
    // Mock ConfigService
    mockConfigService = {
      getConfigByDomain: jest.fn(),
    } as any;

    // Setup routes with mocked service
    router.get('/', async (req, res, next) => {
      try {
        const { domain } = req.query as any;
        
        if (domain) {
          // Query by domain with multilingual support
          const languageCode = languageResolver.resolveLanguage(req);
          const result = await mockConfigService.getConfigByDomain(domain, languageCode);
          
          res.setHeader('X-Content-Language', result.language);
          res.json({ 
            data: {
              domain,
              config: result
            }
          });
        } else {
          // List domains (no multilingual support)
          res.json({ data: [] });
        }
      } catch (error) {
        next(error);
      }
    });

    app = express();
    app.use(express.json());
    app.use('/api/v1/domains', router);
    app.use(errorHandler);
  });

  describe('GET /api/v1/domains?domain=xxx - Language Resolution', () => {
    it('应该通过 lang 查询参数解析语言', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: 'Test Domain Title',
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com', lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.body.data.domain).toBe('example.com');
      expect(response.body.data.config.title).toBe('Test Domain Title');
      expect(response.body.data.config.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
      expect(mockConfigService.getConfigByDomain).toHaveBeenCalledWith('example.com', 'en-us');
    });

    it('应该通过 Accept-Language 头解析语言', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: 'テストドメインタイトル',
        language: 'ja-jp',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com' })
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('テストドメインタイトル');
      expect(response.body.data.config.language).toBe('ja-jp');
      expect(response.headers['x-content-language']).toBe('ja-jp');
      expect(mockConfigService.getConfigByDomain).toHaveBeenCalledWith('example.com', 'ja-jp');
    });

    it('lang 查询参数应该优先于 Accept-Language 头', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: 'Test Domain Title',
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com', lang: 'en-us' })
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.config.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
      expect(mockConfigService.getConfigByDomain).toHaveBeenCalledWith('example.com', 'en-us');
    });

    it('未指定语言时应使用默认语言（zh-cn）', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: '测试域名标题',
        language: 'zh-cn',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com' });

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('测试域名标题');
      expect(response.body.data.config.language).toBe('zh-cn');
      expect(response.headers['x-content-language']).toBe('zh-cn');
      expect(mockConfigService.getConfigByDomain).toHaveBeenCalledWith('example.com', 'zh-cn');
    });

    it('应该设置 X-Content-Language 响应头', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com', lang: 'en-us' });

      expect(response.headers['x-content-language']).toBe('en-us');
    });

    it('应该规范化语言代码', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com', lang: 'EN_US' });

      expect(response.status).toBe(200);
      // Language resolver normalizes to lowercase with hyphen
      expect(mockConfigService.getConfigByDomain).toHaveBeenCalledWith('example.com', 'en-us');
    });

    it('域名不存在时应返回 404', async () => {
      mockConfigService.getConfigByDomain.mockRejectedValue(
        new NotFoundError('Domain not found', 'DOMAIN_NOT_FOUND')
      );

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'nonexistent.com', lang: 'en-us' });

      expect(response.status).toBe(404);
    });

    it('应该合并域名信息和配置信息', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com', lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.body.data.domain).toBe('example.com');
      expect(response.body.data.config).toBeDefined();
      expect(response.body.data.config.title).toBe('Test Domain Title');
      expect(response.body.data.config.links).toEqual({ homepage: 'https://example.com' });
      expect(response.body.data.config.permissions).toEqual({ read: true });
    });
  });

  describe('GET /api/v1/domains (list) - No Language Support', () => {
    it('列表查询不应该添加 X-Content-Language 头', async () => {
      const response = await request(app)
        .get('/api/v1/domains')
        .query({ page: 1, pageSize: 20 });

      expect(response.status).toBe(200);
      expect(response.headers['x-content-language']).toBeUndefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Accept-Language Header Parsing', () => {
    it('应该解析带质量值的 Accept-Language 头', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com' })
        .set('Accept-Language', 'en-US,en;q=0.9,zh-CN;q=0.8');

      expect(response.status).toBe(200);
      expect(mockConfigService.getConfigByDomain).toHaveBeenCalledWith('example.com', 'en-us');
    });

    it('应该选择质量值最高的支持语言', async () => {
      mockConfigService.getConfigByDomain.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'zh-cn',
      });

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'example.com' })
        .set('Accept-Language', 'fr-FR;q=0.9,zh-CN;q=0.8,en-US;q=0.7');

      expect(response.status).toBe(200);
      // fr-FR is not supported, so should fall back to zh-CN (highest supported)
      expect(mockConfigService.getConfigByDomain).toHaveBeenCalledWith('example.com', 'zh-cn');
    });
  });
});
