/**
 * ConfigRoutes Multilingual Unit Tests
 * 
 * Unit tests for multilingual support in config query endpoints (with mocked services)
 * Requirements: 5.1, 5.2, 5.3, 2.1, 2.2, 3.4
 */

import request from 'supertest';
import express, { Application } from 'express';
import { Router } from 'express';
import { errorHandler } from '../middleware/ErrorMiddleware';
import { createDefaultLanguageResolver } from '../services/LanguageResolver';
import { ConfigService, ConfigWithTranslation } from '../services/ConfigService';

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

describe('ConfigRoutes - Multilingual Support (Unit Tests)', () => {
  let app: Application;
  let mockConfigService: jest.Mocked<ConfigService>;
  const languageResolver = createDefaultLanguageResolver();

  const mockConfigWithTranslation: ConfigWithTranslation = {
    id: 1,
    links: { homepage: 'https://example.com' },
    permissions: { read: true },
    createdAt: new Date(),
    updatedAt: new Date(),
    title: 'Test Title',
    author: 'John Doe',
    description: 'Test Description',
    keywords: ['test', 'example'],
    language: 'en-us',
  };

  beforeEach(() => {
    // Create a simple router for testing
    const router = Router();
    
    // Mock ConfigService
    mockConfigService = {
      getConfigById: jest.fn(),
      listConfigs: jest.fn(),
    } as any;

    // Setup routes with mocked service
    router.get('/:id', async (req, res, next) => {
      try {
        const id = parseInt(req.params.id, 10);
        const languageCode = languageResolver.resolveLanguage(req);
        const config = await mockConfigService.getConfigById(id, languageCode);
        
        res.setHeader('X-Content-Language', config.language);
        res.json({ data: config });
      } catch (error) {
        next(error);
      }
    });

    router.get('/', async (req, res, next) => {
      try {
        const languageCode = languageResolver.resolveLanguage(req);
        const configs = await mockConfigService.listConfigs(languageCode);
        
        res.setHeader('X-Content-Language', languageCode);
        res.json({ data: configs });
      } catch (error) {
        next(error);
      }
    });

    app = express();
    app.use(express.json());
    app.use('/api/v1/configs', router);
    app.use(errorHandler);
  });

  describe('GET /api/v1/configs/:id - Language Resolution', () => {
    it('应该通过 lang 查询参数解析语言', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: 'Test Title',
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .query({ lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Test Title');
      expect(response.body.data.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'en-us');
    });

    it('应该通过 Accept-Language 头解析语言', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: 'テストタイトル',
        language: 'ja-jp',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('テストタイトル');
      expect(response.body.data.language).toBe('ja-jp');
      expect(response.headers['x-content-language']).toBe('ja-jp');
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'ja-jp');
    });

    it('lang 查询参数应该优先于 Accept-Language 头', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: 'Test Title',
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .query({ lang: 'en-us' })
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'en-us');
    });

    it('未指定语言时应使用默认语言（zh-cn）', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        title: '测试标题',
        language: 'zh-cn',
      });

      const response = await request(app)
        .get('/api/v1/configs/1');

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('测试标题');
      expect(response.body.data.language).toBe('zh-cn');
      expect(response.headers['x-content-language']).toBe('zh-cn');
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'zh-cn');
    });

    it('应该设置 X-Content-Language 响应头', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .query({ lang: 'en-us' });

      expect(response.headers['x-content-language']).toBe('en-us');
    });

    it('应该规范化语言代码（大写转小写）', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .query({ lang: 'EN-US' });

      expect(response.status).toBe(200);
      // Language resolver normalizes to lowercase
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'en-us');
    });

    it('应该规范化语言代码（下划线转连字符）', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .query({ lang: 'en_US' });

      expect(response.status).toBe(200);
      // Language resolver normalizes underscore to hyphen
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'en-us');
    });
  });

  describe('GET /api/v1/configs - Language Resolution', () => {
    it('应该通过 lang 查询参数解析语言', async () => {
      mockConfigService.listConfigs.mockResolvedValue([
        { ...mockConfigWithTranslation, language: 'en-us' },
      ]);

      const response = await request(app)
        .get('/api/v1/configs')
        .query({ lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.headers['x-content-language']).toBe('en-us');
      expect(mockConfigService.listConfigs).toHaveBeenCalledWith('en-us');
    });

    it('应该通过 Accept-Language 头解析语言', async () => {
      mockConfigService.listConfigs.mockResolvedValue([
        { ...mockConfigWithTranslation, language: 'ja-jp' },
      ]);

      const response = await request(app)
        .get('/api/v1/configs')
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-language']).toBe('ja-jp');
      expect(mockConfigService.listConfigs).toHaveBeenCalledWith('ja-jp');
    });

    it('未指定语言时应使用默认语言', async () => {
      mockConfigService.listConfigs.mockResolvedValue([
        { ...mockConfigWithTranslation, language: 'zh-cn' },
      ]);

      const response = await request(app)
        .get('/api/v1/configs');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-language']).toBe('zh-cn');
      expect(mockConfigService.listConfigs).toHaveBeenCalledWith('zh-cn');
    });
  });

  describe('Accept-Language Header Parsing', () => {
    it('应该解析带质量值的 Accept-Language 头', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'en-us',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .set('Accept-Language', 'en-US,en;q=0.9,zh-CN;q=0.8');

      expect(response.status).toBe(200);
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'en-us');
    });

    it('应该选择质量值最高的支持语言', async () => {
      mockConfigService.getConfigById.mockResolvedValue({
        ...mockConfigWithTranslation,
        language: 'zh-cn',
      });

      const response = await request(app)
        .get('/api/v1/configs/1')
        .set('Accept-Language', 'fr-FR;q=0.9,zh-CN;q=0.8,en-US;q=0.7');

      expect(response.status).toBe(200);
      // fr-FR is not supported, so should fall back to zh-CN (highest supported)
      expect(mockConfigService.getConfigById).toHaveBeenCalledWith(1, 'zh-cn');
    });
  });
});
