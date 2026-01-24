/**
 * ConfigRoutes 单元测试
 */

import request from 'supertest';
import express, { Application } from 'express';
import configRoutes from './ConfigRoutes';
import configService from '../services/ConfigService';
import { errorHandler } from '../middleware/ErrorMiddleware';

jest.mock('../services/ConfigService');

describe('ConfigRoutes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/configs', configRoutes);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('应该返回配置列表', async () => {
      const mockResult = {
        data: [{ id: 1, title: 'Test' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      (configService.list as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/configs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('GET /:id', () => {
    it('应该返回配置详情', async () => {
      const mockConfig = { id: 1, title: 'Test' };
      (configService.getById as jest.Mock).mockResolvedValue(mockConfig);

      const response = await request(app).get('/api/v1/configs/1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockConfig);
    });

    it('配置不存在时应返回 404', async () => {
      (configService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/configs/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /', () => {
    it('应该创建配置', async () => {
      const mockConfig = { id: 1, title: 'Test' };
      (configService.create as jest.Mock).mockResolvedValue(mockConfig);

      const response = await request(app)
        .post('/api/v1/configs')
        .send({ title: 'Test', author: 'Author', description: 'Desc' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(mockConfig);
    });
  });

  describe('PUT /:id', () => {
    it('应该更新配置', async () => {
      const mockConfig = { id: 1, title: 'Updated' };
      (configService.update as jest.Mock).mockResolvedValue(mockConfig);

      const response = await request(app)
        .put('/api/v1/configs/1')
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockConfig);
    });

    it('配置不存在时应返回 404', async () => {
      (configService.update as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/configs/999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('应该删除配置', async () => {
      (configService.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/api/v1/configs/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('配置删除成功');
    });
  });
});
