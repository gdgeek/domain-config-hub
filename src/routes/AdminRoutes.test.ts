/**
 * AdminRoutes 单元测试
 */

import request from 'supertest';
import express, { Application } from 'express';
import adminRoutes from './AdminRoutes';

jest.mock('../config/env', () => ({
  config: {
    adminPassword: 'test-password',
  },
}));

describe('AdminRoutes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', adminRoutes);
  });

  describe('POST /login', () => {
    it('应该在密码正确时返回成功', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'test-password' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('test-password');
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
