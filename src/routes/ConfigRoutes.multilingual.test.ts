/**
 * ConfigRoutes Multilingual Integration Tests
 * 
 * Tests for multilingual support in config query endpoints
 * Requirements: 5.1, 5.2, 5.3, 2.1, 2.2, 3.4
 */

import request from 'supertest';
import express, { Application } from 'express';
import configRoutes from './ConfigRoutes';
import { errorHandler } from '../middleware/ErrorMiddleware';
import Config from '../models/Config';
import Translation from '../models/Translation';
import { connectRedis, closeRedis, isRedisEnabled } from '../config/redis';
import { setupTestDatabase, closeTestDatabase } from '../test-utils/setupTestDatabase';

describe('ConfigRoutes - Multilingual Support', () => {
  let app: Application;
  let testConfigId: number;

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
    if (testConfigId) {
      await Translation.destroy({ where: { configId: testConfigId } });
      await Config.destroy({ where: { id: testConfigId } });
    }
    
    // Disconnect
    if (isRedisEnabled()) {
      await closeRedis();
    }
    await closeTestDatabase();
  });

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/configs', configRoutes);
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
      title: '测试标题',
      author: '张三',
      description: '这是一个测试描述',
      keywords: ['测试', '示例'] as any,
    });

    await Translation.create({
      configId: testConfigId,
      languageCode: 'en-us',
      title: 'Test Title',
      author: 'John Doe',
      description: 'This is a test description',
      keywords: ['test', 'example'] as any,
    });

    await Translation.create({
      configId: testConfigId,
      languageCode: 'ja-jp',
      title: 'テストタイトル',
      author: '田中太郎',
      description: 'これはテストの説明です',
      keywords: ['テスト', '例'] as any,
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testConfigId) {
      await Translation.destroy({ where: { configId: testConfigId } });
      await Config.destroy({ where: { id: testConfigId } });
    }
  });

  describe('GET /api/v1/configs/:id - Language Support', () => {
    it('应该通过 lang 查询参数返回指定语言的配置', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}`)
        .query({ lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Test Title');
      expect(response.body.data.author).toBe('John Doe');
      expect(response.body.data.description).toBe('This is a test description');
      expect(response.body.data.keywords).toEqual(['test', 'example']);
      expect(response.body.data.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
    });

    it('应该通过 Accept-Language 头返回指定语言的配置', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}`)
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('テストタイトル');
      expect(response.body.data.author).toBe('田中太郎');
      expect(response.body.data.language).toBe('ja-jp');
      expect(response.headers['x-content-language']).toBe('ja-jp');
    });

    it('lang 查询参数应该优先于 Accept-Language 头', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}`)
        .query({ lang: 'en-us' })
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Test Title');
      expect(response.body.data.language).toBe('en-us');
      expect(response.headers['x-content-language']).toBe('en-us');
    });

    it('未指定语言时应返回默认语言（zh-cn）', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('测试标题');
      expect(response.body.data.author).toBe('张三');
      expect(response.body.data.language).toBe('zh-cn');
      expect(response.headers['x-content-language']).toBe('zh-cn');
    });

    it('请求不存在的语言时应降级到默认语言', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}`)
        .query({ lang: 'fr-fr' }); // Unsupported language

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('测试标题');
      expect(response.body.data.language).toBe('zh-cn');
      expect(response.headers['x-content-language']).toBe('zh-cn');
    });

    it('应该合并非翻译字段和翻译字段', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}`)
        .query({ lang: 'en-us' });

      expect(response.status).toBe(200);
      // Non-translatable fields
      expect(response.body.data.links).toEqual({ homepage: 'https://example.com' });
      expect(response.body.data.permissions).toEqual({ read: true });
      // Translatable fields
      expect(response.body.data.title).toBe('Test Title');
      expect(response.body.data.author).toBe('John Doe');
    });

    it('配置不存在时应返回 404', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/configs/99999')
        .query({ lang: 'en-us' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/configs - Language Support', () => {
    it('应该返回指定语言的配置列表', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/configs')
        .query({ lang: 'en-us' });

      expect(response.status).toBe(200);
      expect(response.headers['x-content-language']).toBe('en-us');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Find our test config in the list
      const testConfig = response.body.data.find((c: any) => c.id === testConfigId);
      expect(testConfig).toBeDefined();
      expect(testConfig.title).toBe('Test Title');
      expect(testConfig.language).toBe('en-us');
    });

    it('应该通过 Accept-Language 头返回指定语言的配置列表', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/configs')
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-language']).toBe('ja-jp');
      
      const testConfig = response.body.data.find((c: any) => c.id === testConfigId);
      expect(testConfig).toBeDefined();
      expect(testConfig.title).toBe('テストタイトル');
      expect(testConfig.language).toBe('ja-jp');
    });

    it('未指定语言时应返回默认语言的配置列表', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      const response = await request(app)
        .get('/api/v1/configs');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-language']).toBe('zh-cn');
      
      const testConfig = response.body.data.find((c: any) => c.id === testConfigId);
      expect(testConfig).toBeDefined();
      expect(testConfig.title).toBe('测试标题');
      expect(testConfig.language).toBe('zh-cn');
    });
  });

  describe('Backward Compatibility', () => {
    it('Redis 未启用时应降级到非多语言服务', async () => {
      if (isRedisEnabled()) {
        console.log('Skipping test: Redis is enabled');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}`)
        .query({ lang: 'en-us' });

      // Should still return 200, but using the old service
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });
});
