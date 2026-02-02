/**
 * TranslationRoutes 集成测试
 * 
 * 测试翻译管理 API 端点的功能
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import request from 'supertest';
import express, { Application } from 'express';
import { Translation } from '../models/Translation';
import { Config } from '../models/Config';
import translationRoutes from './TranslationRoutes';
import { errorHandler } from '../middleware/ErrorMiddleware';
import { setupTestDatabase, closeTestDatabase } from '../test-utils/setupTestDatabase';

describe('TranslationRoutes Integration Tests', () => {
  let app: Application;
  let testConfigId: number;

  beforeAll(async () => {
    // 使用统一的测试数据库初始化
    await setupTestDatabase();

    // 创建测试配置
    const config = await Config.create({
      links: { homepage: 'https://example.com' },
      permissions: { read: true },
    });
    testConfigId = config.id;
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/configs', translationRoutes);
    app.use(errorHandler);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('POST /api/v1/configs/:configId/translations', () => {
    afterEach(async () => {
      // 清理测试数据
      await Translation.destroy({ where: { configId: testConfigId } });
    });

    it('应该成功创建翻译', async () => {
      const translationData = {
        languageCode: 'en-us',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test', 'example'],
      };

      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send(translationData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        configId: testConfigId,
        languageCode: 'en-us',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test', 'example'],
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('应该拒绝不支持的语言代码', async () => {
      const translationData = {
        languageCode: 'xx-XX',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      };

      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send(translationData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Unsupported language');
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const translationData = {
        languageCode: 'ja-jp',
        title: 'Test Title',
        // 缺少 author, description, keywords
      };

      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send(translationData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该拒绝重复的翻译', async () => {
      // 先创建一个翻译
      await Translation.create({
        configId: testConfigId,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['中文', '测试'],
      });

      // 尝试创建相同语言的翻译
      const translationData = {
        languageCode: 'zh-CN', // 大小写不同但规范化后相同
        title: 'Another Chinese Title',
        author: 'Another Author',
        description: 'Another Description',
        keywords: ['另一个'],
      };

      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send(translationData);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('应该拒绝标题超过200字符的请求', async () => {
      const translationData = {
        languageCode: 'en-us',
        title: 'a'.repeat(201),
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['test'],
      };

      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send(translationData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该拒绝描述超过1000字符的请求', async () => {
      const translationData = {
        languageCode: 'en-us',
        title: 'Test Title',
        author: 'Test Author',
        description: 'a'.repeat(1001),
        keywords: ['test'],
      };

      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send(translationData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该拒绝无效的 keywords 格式', async () => {
      const translationData = {
        languageCode: 'en-us',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: 'not-an-array', // 应该是数组
      };

      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send(translationData as any);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/configs/:configId/translations/:languageCode', () => {
    beforeEach(async () => {
      // 先清理可能存在的翻译数据
      await Translation.destroy({ where: { configId: testConfigId } });
      
      // 创建一个翻译用于更新测试
      await Translation.create({
        configId: testConfigId,
        languageCode: 'ja-jp',
        title: 'Original Title',
        author: 'Original Author',
        description: 'Original Description',
        keywords: ['original'],
      });
    });

    afterEach(async () => {
      // 清理测试数据
      await Translation.destroy({ where: { configId: testConfigId } });
    });

    it('应该成功更新翻译', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const response = await request(app)
        .put(`/api/v1/configs/${testConfigId}/translations/ja-jp`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        configId: testConfigId,
        languageCode: 'ja-jp',
        title: 'Updated Title',
        author: 'Original Author', // 未更新
        description: 'Updated Description',
      });
    });

    it('应该拒绝不存在的翻译更新', async () => {
      const updates = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/v1/configs/${testConfigId}/translations/fr-fr`)
        .send(updates);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('应该拒绝空的更新请求', async () => {
      const response = await request(app)
        .put(`/api/v1/configs/${testConfigId}/translations/ja-jp`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/configs/:configId/translations', () => {
    beforeEach(async () => {
      // 先清理可能存在的翻译数据
      await Translation.destroy({ where: { configId: testConfigId } });
      
      // 创建多个翻译
      await Translation.bulkCreate([
        {
          configId: testConfigId,
          languageCode: 'zh-cn',
          title: 'Chinese Title',
          author: 'Chinese Author',
          description: 'Chinese Description',
          keywords: ['中文'],
        },
        {
          configId: testConfigId,
          languageCode: 'en-us',
          title: 'English Title',
          author: 'English Author',
          description: 'English Description',
          keywords: ['english'],
        },
      ]);
    });

    afterEach(async () => {
      // 清理测试数据
      await Translation.destroy({ where: { configId: testConfigId } });
    });

    it('应该返回配置的所有翻译', async () => {
      const response = await request(app)
        .get(`/api/v1/configs/${testConfigId}/translations`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].languageCode).toBe('en-us');
      expect(response.body.data[1].languageCode).toBe('zh-cn');
    });

    it('应该返回空数组如果没有翻译', async () => {
      // 创建一个新配置
      const newConfig = await Config.create({
        links: {},
        permissions: {},
      });

      const response = await request(app)
        .get(`/api/v1/configs/${newConfig.id}/translations`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);

      // 清理
      await newConfig.destroy();
    });
  });

  describe('DELETE /api/v1/configs/:configId/translations/:languageCode', () => {
    let translationId: number;

    beforeEach(async () => {
      // 先清理可能存在的翻译数据
      await Translation.destroy({ where: { configId: testConfigId } });
      
      // 创建一个翻译用于删除测试
      const translation = await Translation.create({
        configId: testConfigId,
        languageCode: 'en-us',
        title: 'English Title',
        author: 'English Author',
        description: 'English Description',
        keywords: ['english'],
      });
      translationId = translation.id;
    });

    afterEach(async () => {
      // 清理测试数据
      await Translation.destroy({ where: { configId: testConfigId } });
    });

    it('应该成功删除翻译', async () => {
      const response = await request(app)
        .delete(`/api/v1/configs/${testConfigId}/translations/en-us`);

      expect(response.status).toBe(204);

      // 验证翻译已被删除
      const deleted = await Translation.findByPk(translationId);
      expect(deleted).toBeNull();
    });

    it('应该拒绝删除不存在的翻译', async () => {
      const response = await request(app)
        .delete(`/api/v1/configs/${testConfigId}/translations/fr-fr`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('应该拒绝删除默认语言翻译（当存在其他翻译时）', async () => {
      // 创建默认语言翻译和另一个翻译
      await Translation.bulkCreate([
        {
          configId: testConfigId,
          languageCode: 'zh-cn',
          title: 'Chinese Title',
          author: 'Chinese Author',
          description: 'Chinese Description',
          keywords: ['中文'],
        },
        {
          configId: testConfigId,
          languageCode: 'ja-jp',
          title: 'Japanese Title',
          author: 'Japanese Author',
          description: 'Japanese Description',
          keywords: ['日本語'],
        },
      ]);

      const response = await request(app)
        .delete(`/api/v1/configs/${testConfigId}/translations/zh-cn`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Cannot delete default language');

      // 清理
      await Translation.destroy({ where: { configId: testConfigId } });
    });

    it('应该允许删除默认语言翻译（当它是唯一的翻译时）', async () => {
      // 创建一个新配置，只有默认语言翻译
      const newConfig = await Config.create({
        links: {},
        permissions: {},
      });

      const translation = await Translation.create({
        configId: newConfig.id,
        languageCode: 'zh-cn',
        title: 'Chinese Title',
        author: 'Chinese Author',
        description: 'Chinese Description',
        keywords: ['中文'],
      });

      const response = await request(app)
        .delete(`/api/v1/configs/${newConfig.id}/translations/zh-cn`);

      expect(response.status).toBe(204);

      // 验证翻译已被删除
      const deleted = await Translation.findByPk(translation.id);
      expect(deleted).toBeNull();

      // 清理
      await newConfig.destroy();
    });
  });

  describe('Error Handling', () => {
    it('应该返回标准化的错误响应格式', async () => {
      const response = await request(app)
        .post(`/api/v1/configs/${testConfigId}/translations`)
        .send({
          languageCode: 'invalid',
          // 缺少必填字段
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('应该处理无效的 configId', async () => {
      const response = await request(app)
        .post('/api/v1/configs/invalid/translations')
        .send({
          languageCode: 'en-us',
          title: 'Test',
          author: 'Test',
          description: 'Test',
          keywords: ['test'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
