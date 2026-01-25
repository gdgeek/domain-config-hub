/**
 * AdminRoutes 单元测试
 */

import request from 'supertest';
import express, { Application } from 'express';

// Mock 必须在导入之前
jest.mock('../config/env', () => ({
  config: {
    adminPassword: 'test-password',
  },
}));

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// 不 mock generateToken，让它真实执行
import adminRoutes from './AdminRoutes';

describe('AdminRoutes', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', adminRoutes);
  });

  describe('POST /login', () => {
    it('应该在密码正确时返回成功和 JWT 令牌', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'test-password' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
      expect(response.body.message).toBe('登录成功');
    });

    it('应该在密码错误时返回 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('密码错误');
    });

    it('应该在未提供密码时返回 400', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('请提供密码');
    });
  });
});
