/**
 * DomainRoutes 单元测试
 */

import request from 'supertest';
import express, { Application } from 'express';
import domainRoutes from './DomainRoutes';
import domainService from '../services/DomainService';
import { errorHandler } from '../middleware/ErrorMiddleware';

jest.mock('../services/DomainService');

describe('DomainRoutes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/domains', domainRoutes);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('应该返回域名列表', async () => {
      const mockResult = {
        data: [{ id: 1, domain: 'test.com' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      (domainService.list as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/domains');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('应该通过 domain 参数查询域名（返回单个对象）', async () => {
      const mockResult = { 
        domain: 'test.com', 
        config: { title: 'Test Config', author: 'Test' }
      };
      (domainService.getByDomain as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/domains?domain=test.com');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.pagination).toBeUndefined();
    });

    it('域名不存在时应返回 404', async () => {
      (domainService.getByDomain as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/domains?domain=notfound.com');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('DOMAIN_NOT_FOUND');
    });
  });

  describe('GET /:id', () => {
    it('应该通过 ID 返回域名详情', async () => {
      const mockDomain = { id: 1, domain: 'test.com' };
      (domainService.getById as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app).get('/api/v1/domains/1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDomain);
    });

    it('域名不存在时应返回 404', async () => {
      (domainService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/domains/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /', () => {
    it('应该创建域名', async () => {
      const mockDomain = { id: 1, domain: 'test.com', configId: 1 };
      (domainService.create as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'test.com', configId: 1 });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(mockDomain);
    });
  });

  describe('PUT /:id', () => {
    it('应该完全更新域名', async () => {
      const mockDomain = { id: 1, domain: 'test.com', configId: 2 };
      (domainService.update as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app)
        .put('/api/v1/domains/1')
        .send({ configId: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDomain);
    });

    it('域名不存在时应返回 404', async () => {
      (domainService.update as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/domains/999')
        .send({ configId: 2 });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /:id', () => {
    it('应该部分更新域名', async () => {
      const mockDomain = { id: 1, domain: 'test.com', homepage: 'https://new.com' };
      (domainService.update as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app)
        .patch('/api/v1/domains/1')
        .send({ homepage: 'https://new.com' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDomain);
    });

    it('没有提供更新字段时应返回 400', async () => {
      const response = await request(app)
        .patch('/api/v1/domains/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('域名不存在时应返回 404', async () => {
      (domainService.update as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/v1/domains/999')
        .send({ homepage: 'https://new.com' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('应该删除域名并返回 204', async () => {
      (domainService.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/api/v1/domains/1');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });
  });
});
