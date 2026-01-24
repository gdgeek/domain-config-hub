/**
 * RateLimitMiddleware 集成测试
 * 
 * 测试限流中间件在实际应用场景中的行为
 */

import request from 'supertest';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';

describe('RateLimitMiddleware Integration', () => {
  let app: Express;

  beforeEach(() => {
    // 创建测试应用，使用较小的限制值以便测试
    app = express();
    
    // 使用自定义配置的限流中间件（用于测试）
    const testRateLimiter = rateLimit({
      windowMs: 1000, // 1秒窗口
      max: 3, // 最多3个请求
      handler: (_req, res) => {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: '请求过于频繁，请稍后再试',
          },
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    app.use(testRateLimiter);
    
    // 添加测试路由
    app.get('/api/test', (_req, res) => {
      res.json({ message: 'success' });
    });
  });

  describe('限流行为', () => {
    it('应该允许在限制内的连续请求', async () => {
      // 发送3个请求（在限制内）
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/test')
          .expect(200);

        expect(response.body).toEqual({ message: 'success' });
      }
    });

    it('应该在超过限制后阻止请求', async () => {
      // 发送3个请求（达到限制）
      for (let i = 0; i < 3; i++) {
        await request(app).get('/api/test').expect(200);
      }

      // 第4个请求应该被限流
      const response = await request(app)
        .get('/api/test')
        .expect(429);

      expect(response.body).toEqual({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      });
    });

    it('应该在时间窗口重置后允许新请求', async () => {
      // 发送3个请求（达到限制）
      for (let i = 0; i < 3; i++) {
        await request(app).get('/api/test').expect(200);
      }

      // 第4个请求应该被限流
      await request(app).get('/api/test').expect(429);

      // 等待时间窗口重置（1秒 + 一点缓冲）
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 新的请求应该成功
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
    });
  });

  describe('响应头', () => {
    it('应该包含 RateLimit 响应头', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      // 验证标准响应头存在
      expect(response.headers['ratelimit-limit']).toBe('3');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('应该在每次请求后更新剩余次数', async () => {
      const response1 = await request(app).get('/api/test').expect(200);
      const response2 = await request(app).get('/api/test').expect(200);

      const remaining1 = parseInt(response1.headers['ratelimit-remaining'], 10);
      const remaining2 = parseInt(response2.headers['ratelimit-remaining'], 10);

      expect(remaining1).toBeGreaterThan(remaining2);
    });
  });

  describe('错误响应格式', () => {
    it('应该返回标准化的错误格式', async () => {
      // 达到限制
      for (let i = 0; i < 3; i++) {
        await request(app).get('/api/test').expect(200);
      }

      // 验证错误响应格式
      const response = await request(app)
        .get('/api/test')
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(typeof response.body.error.message).toBe('string');
    });
  });
});
