/**
 * Content-Type 响应头测试
 * 
 * 验证所有 JSON API 端点都正确设置 Content-Type 响应头
 */

import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../app';

describe('Content-Type 响应头测试', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('公开 API 端点', () => {
    it('域名列表应返回 application/json', async () => {
      const response = await request(app).get('/api/v1/domains');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('配置列表应返回 application/json', async () => {
      const response = await request(app).get('/api/v1/configs');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('404 错误应返回 application/json', async () => {
      const response = await request(app).get('/api/v1/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('认证 API 端点', () => {
    it('登录接口应返回 application/json', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'wrong' });
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('创建域名接口（未授权）应返回 application/json', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'test.com', configId: 999 });
      
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('创建配置接口（未授权）应返回 application/json', async () => {
      const response = await request(app)
        .post('/api/v1/configs')
        .send({ name: 'test', config: {} });
      
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('错误响应', () => {
    it('验证错误应返回 application/json', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
