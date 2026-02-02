/**
 * DomainRoutes Multilingual Integration Tests
 * 
 * Tests for multilingual support in domain query endpoints
 * Requirements: 5.2, 2.1, 2.2, 3.4
 */

import request from 'supertest';
import express, { Application } from 'express';
import domainRoutes from './DomainRoutes';
import { errorHandler } from '../middleware/ErrorMiddleware';
import Config from '../models/Config';
import Domain from '../models/Domain';
import Translation from '../models/Translation';
import { connectRedis, closeRedis, isRedisEnabled } from '../config/redis';
import { setupTestDatabase, closeTestDatabase, sequelize } from '../test-utils/setupTestDatabase';

describe('DomainRoutes - Multilingual Support', () => {
  let app: Application;
  let testConfigId: number;
  let testDomainId: number;
  const testDomainName = 'test-multilingual.com';

  beforeAll(async () => {
    // 使用统一的测试数据库初始化
    await setupTestDatabase();
    
    // Connect to Redis if enabled
    if (isRedisEnabled()) {
      await connectRedis();
    }
  });

  afterAll(async () => {
    // Clean up
    if (testDomainId) {
      await Domain.destroy({ where: { id: testDomainId } });
    }
    if (testConfigId) {
      await Translation.destroy({ where: { configId: testConfigId } });
      await Config.destroy({ where: { id: testConfigId } });
    }
    
    // Disconnect
    if (isRedisEnabled()) {
      await closeRedis();
    }
    
    await closeTestDatabase();
    await sequelize.close();
  });

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/domains', domainRoutes);
    app.use(errorHandler);

    // Create test config with translations
    const config = await Config.create({
      links: { homepage: 'https://example.com' },
      permissions: { read: true },
    });
    testConfigId = config.id;

    // Create translations for different languages
    await Translation.create({
      configId: testConfigId,
      languageCode: 'zh-cn',
      title: '测试域名标题',
      author: '李四',
      description: '这是域名测试描述',
      keywords: ['域名', '测试'] as any,
    });

    await Translation.create({
      configId: testConfigId,
      languageCode: 'en-us',
      title: 'Test Domain Title',
      author: 'Jane Smith',
      description: 'This is a domain test description',
      keywords: ['domain', 'test'] as any,
    });

    await Translation.create({
      configId: testConfigId,
      languageCode: 'ja-jp',
      title: 'テストドメインタイトル',
      author: '佐藤花子',
      description: 'これはドメインテストの説明です',
      keywords: ['ドメイン', 'テスト'] as any,
    });

    // Create test domain
    const domain = await Domain.create({
      domain: testDomainName,
      configId: testConfigId,
      homepage: 'https://www.test-multilingual.com',
    });
    testDomainId = domain.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testDomainId) {
      await Domain.destroy({ where: { id: testDomainId } });
    }
    if (testConfigId) {
      await Translation.destroy({ where: { configId: testConfigId } });
      await Config.destroy({ where: { id: testConfigId } });
    }
  });

  describe('GET /api/v1/domains?domain=xxx - Language Support', () => {
    it('应该通过 lang 查询参数返回指定语言的域名配置', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: testDomainName, lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.body.data.domain).toBe(testDomainName);
      expect(response.body.data.config.title).toBe('Test Domain Title');
      expect(response.body.data.config.author).toBe('Jane Smith');
      expect(response.body.data.config.description).toBe('This is a domain test description');
      expect(response.body.data.config.keywords).toEqual(['domain', 'test']);
      expect(response.body.data.config.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
    });

    it('应该通过 Accept-Language 头返回指定语言的域名配置', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: testDomainName })
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('テストドメインタイトル');
      expect(response.body.data.config.author).toBe('佐藤花子');
      expect(response.body.data.config.language).toBe('ja-jp');
      expect(response.headers['x-content-language']).toBe('ja-jp');
    });

    it('lang 查询参数应该优先于 Accept-Language 头', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: testDomainName, lang: 'en-us' })
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('Test Domain Title');
      expect(response.body.data.config.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
    });

    it('未指定语言时应返回默认语言（zh-cn）', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: testDomainName });

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('测试域名标题');
      expect(response.body.data.config.author).toBe('李四');
      expect(response.body.data.config.language).toBe('zh-cn');
      expect(response.headers['x-content-language']).toBe('zh-cn');
    });

    it('请求不存在的语言时应降级到默认语言', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: testDomainName, lang: 'fr-fr' }); // Unsupported language

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('测试域名标题');
      expect(response.body.data.config.language).toBe('zh-cn');
      expect(response.headers['x-content-language']).toBe('zh-cn');
    });

    it('应该合并非翻译字段和翻译字段', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: testDomainName, lang: 'en-us' });

      expect(response.status).toBe(200);
      // Non-translatable fields
      expect(response.body.data.config.links).toEqual({ homepage: 'https://example.com' });
      expect(response.body.data.config.permissions).toEqual({ read: true });
      // Translatable fields
      expect(response.body.data.config.title).toBe('Test Domain Title');
      expect(response.body.data.config.author).toBe('Jane Smith');
    });

    it('域名不存在时应返回 404', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: 'nonexistent.com', lang: 'en-us' });

      expect(response.status).toBe(404);
    });

    it('应该支持 URL 格式的域名查询', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: `https://www.${testDomainName}/path`, lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.body.data.config.title).toBe('Test Domain Title');
      expect(response.headers['x-content-language']).toBe('en-us');
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

  describe('Backward Compatibility', () => {
    it('Redis 未启用时应降级到非多语言服务', async () => {
      if (isRedisEnabled()) {
        console.log('Skipping test: Redis is enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/domains')
        .query({ domain: testDomainName, lang: 'en-us' });

      // Should still return 200, but using the old service
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });
});
