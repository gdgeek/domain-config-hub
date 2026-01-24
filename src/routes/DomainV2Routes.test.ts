/**
 * DomainV2Routes 单元测试
 */

import request from 'supertest';
import express, { Application } from 'express';
import domainV2Routes from './DomainV2Routes';
import domainV2Service from '../services/DomainV2Service';
import { errorHandler } from '../middleware/ErrorMiddleware';

jest.mock('../services/DomainV2Service');

describe('DomainV2Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v2/domains', domainV2Routes);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('应该返回域名列表', async () => {
      const mockResult = {
        data: [{ id: 1, domain: 'test.com' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      (domainV2Service.list as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v2/domains');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('GET /:domain', () => {
    it('应该返回域名详情', async () => {
      const mockDomain = { id: 1, domain: 'test.com' };
      (domainV2Service.getByDomain as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app).get('/api/v2/domains/test.com');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDomain);
    });

    it('域名不存在时应返回 404', async () => {
      (domainV2Service.getByDomain as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v2/domains/notfound.com');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /id/:id', () => {
    it('应该通过 ID 返回域名详情', async () => {
      const mockDomain = { id: 1, domain: 'test.com' };
      (domainV2Service.getById as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app).get('/api/v2/domains/id/1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDomain);
    });

    it('域名不存在时应返回 404', async () => {
      (domainV2Service.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v2/domains/id/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /', () => {
    it('应该创建域名', async () => {
      const mockDomain = { id: 1, domain: 'test.com', configId: 1 };
      (domainV2Service.create as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app)
        .post('/api/v2/domains')
        .send({ domain: 'test.com', configId: 1 });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(mockDomain);
    });
  });

  describe('PUT /:id', () => {
    it('应该更新域名', async () => {
      const mockDomain = { id: 1, domain: 'test.com', configId: 2 };
      (domainV2Service.update as jest.Mock).mockResolvedValue(mockDomain);

      const response = await request(app)
        .put('/api/v2/domains/1')
        .send({ configId: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDomain);
    });

    it('域名不存在时应返回 404', async () => {
      (domainV2Service.update as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v2/domains/999')
        .send({ configId: 2 });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('应该删除域名', async () => {
      (domainV2Service.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/api/v2/domains/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('域名删除成功');
    });
  });
});
