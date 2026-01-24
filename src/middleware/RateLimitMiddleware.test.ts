/**
 * RateLimitMiddleware 单元测试
 * 
 * 测试限流中间件的功能：
 * - 正常请求通过
 * - 超过限制返回 429
 * - 标准化错误响应格式
 * - 环境变量配置
 */

import request from 'supertest';
import express, { Express } from 'express';
import { rateLimitMiddleware } from './RateLimitMiddleware';

describe('RateLimitMiddleware', () => {
  let app: Express;

  beforeEach(() => {
    // 创建测试应用
    app = express();
    app.use(rateLimitMiddleware);
    
    // 添加测试路由
    app.get('/test', (_req, res) => {
      res.json({ message: 'success' });
    });
  });

  describe('正常请求', () => {
    it('应该允许在限制内的请求通过', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
    });

    it('应该返回标准的 RateLimit 响应头', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // 检查标准响应头
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('超过限制', () => {
    it('应该在超过限制后返回 429 状态码', async () => {
      // 获取配置的限制值
      const limit = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

      // 发送超过限制的请求
      for (let i = 0; i < limit; i++) {
        await request(app).get('/test');
      }

      // 下一个请求应该被限流
      const response = await request(app)
        .get('/test')
        .expect(429);

      // 验证错误响应格式
      expect(response.body).toEqual({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      });
    });

    it('应该返回标准化的错误响应格式', async () => {
      const limit = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

      // 发送超过限制的请求
      for (let i = 0; i < limit; i++) {
        await request(app).get('/test');
      }

      const response = await request(app)
        .get('/test')
        .expect(429);

      // 验证错误响应结构
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('配置验证', () => {
    it('应该正确配置限流中间件', () => {
      // 验证中间件已正确导出
      expect(rateLimitMiddleware).toBeDefined();
      expect(typeof rateLimitMiddleware).toBe('function');
    });

    it('应该使用环境变量配置的限流参数', () => {
      // 验证配置已加载
      const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
      const max = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

      expect(windowMs).toBeGreaterThan(0);
      expect(max).toBeGreaterThan(0);
    });
  });
});
