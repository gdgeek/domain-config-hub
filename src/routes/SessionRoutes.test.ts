/**
 * SessionRoutes 单元测试
 */

// Mock 必须在导入之前
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../config/env', () => ({
  config: {
    adminPassword: 'test123',
    jwtSecret: 'test-secret-key-for-testing',
  },
}));

jest.mock('../middleware/AuthMiddleware', () => {
  const jwt = require('jsonwebtoken');
  return {
    generateToken: () => {
      return jwt.sign({ role: 'admin' }, 'test-secret-key-for-testing', { expiresIn: '24h' });
    },
    authMiddleware: (_req: any, _res: any, next: any) => next(),
  };
});

import request from 'supertest';
import express, { Application } from 'express';
import sessionRoutes from './SessionRoutes';
import { errorHandler } from '../middleware/ErrorMiddleware';

describe('SessionRoutes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/sessions', sessionRoutes);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('应该创建会话并返回 201', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .send({ password: 'test123' });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('token');
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.token.length).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty('tokenType', 'Bearer');
      expect(response.body.data).toHaveProperty('expiresIn', 86400);
    });

    it('密码错误时应返回 401', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .send({ password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('缺少密码时应返回 400', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /current', () => {
    it('应该返回当前会话信息', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/current');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('authenticated', true);
      expect(response.body.data).toHaveProperty('tokenType', 'Bearer');
    });
  });

  describe('DELETE /', () => {
    it('应该删除会话并返回 204', async () => {
      const response = await request(app)
        .delete('/api/v1/sessions');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });
  });
});
