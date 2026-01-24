/**
 * DomainRoutes 单元测试
 * 
 * 测试域名配置路由的各个端点
 */

import request from 'supertest';
import express, { Express } from 'express';
import { createDomainRoutes } from './DomainRoutes';
import { IDomainService, DomainOutput, PaginatedResult } from '../services/DomainService';
import { errorHandler } from '../middleware/ErrorMiddleware';
import { ConflictError } from '../errors/ConflictError';

describe('DomainRoutes', () => {
  let app: Express;
  let mockDomainService: jest.Mocked<IDomainService>;

  // 测试数据
  const mockDomain: DomainOutput = {
    id: 1,
    domain: 'example.com',
    title: 'Example Site',
    author: 'John Doe',
    description: 'A test site',
    keywords: 'test, example',
    links: { home: 'https://example.com' },
  };

  beforeEach(() => {
    // 创建 mock service
    mockDomainService = {
      create: jest.fn(),
      getById: jest.fn(),
      getByDomain: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // 创建 Express 应用
    app = express();
    app.use(express.json());
    app.use('/api/v1/domains', createDomainRoutes(mockDomainService));
    app.use(errorHandler);
  });

  describe('GET /api/v1/domains', () => {
    it('应该返回分页的域名配置列表', async () => {
      const mockResult: PaginatedResult<DomainOutput> = {
        data: [mockDomain],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockDomainService.list.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/domains')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockDomainService.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    it('应该支持自定义分页参数', async () => {
      const mockResult: PaginatedResult<DomainOutput> = {
        data: [mockDomain],
        pagination: {
          page: 2,
          pageSize: 10,
          total: 15,
          totalPages: 2,
        },
      };

      mockDomainService.list.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/domains?page=2&pageSize=10')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockDomainService.list).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
      });
    });

    it('应该拒绝无效的分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/domains?page=0&pageSize=200')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockDomainService.list).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/domains/:domain', () => {
    it('应该通过域名返回配置', async () => {
      mockDomainService.getByDomain.mockResolvedValue(mockDomain);

      const response = await request(app)
        .get('/api/v1/domains/example.com')
        .expect(200);

      expect(response.body).toEqual({ data: mockDomain });
      expect(mockDomainService.getByDomain).toHaveBeenCalledWith('example.com');
    });

    it('应该在域名不存在时返回 404', async () => {
      mockDomainService.getByDomain.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/domains/nonexistent.com')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('nonexistent.com');
    });
  });

  describe('GET /api/v1/domains/id/:id', () => {
    it('应该通过 ID 返回配置', async () => {
      mockDomainService.getById.mockResolvedValue(mockDomain);

      const response = await request(app)
        .get('/api/v1/domains/id/1')
        .expect(200);

      expect(response.body).toEqual({ data: mockDomain });
      expect(mockDomainService.getById).toHaveBeenCalledWith(1);
    });

    it('应该在 ID 不存在时返回 404', async () => {
      mockDomainService.getById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/domains/id/999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('999');
    });

    it('应该拒绝无效的 ID', async () => {
      const response = await request(app)
        .get('/api/v1/domains/id/invalid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockDomainService.getById).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/domains', () => {
    it('应该创建新的域名配置', async () => {
      const input = {
        domain: 'example.com',
        title: 'Example Site',
        author: 'John Doe',
      };

      mockDomainService.create.mockResolvedValue(mockDomain);

      const response = await request(app)
        .post('/api/v1/domains')
        .send(input)
        .expect(201);

      expect(response.body).toEqual({ data: mockDomain });
      expect(mockDomainService.create).toHaveBeenCalledWith(input);
    });

    it('应该在域名已存在时返回 409', async () => {
      const input = {
        domain: 'example.com',
        title: 'Example Site',
      };

      mockDomainService.create.mockRejectedValue(
        new ConflictError('域名已存在', 'DUPLICATE_DOMAIN')
      );

      const response = await request(app)
        .post('/api/v1/domains')
        .send(input)
        .expect(409);

      expect(response.body.error.code).toBe('DUPLICATE_DOMAIN');
    });

    it('应该拒绝缺少必需字段的请求', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({ title: 'Example Site' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockDomainService.create).not.toHaveBeenCalled();
    });

    it('应该拒绝超长字段', async () => {
      const input = {
        domain: 'example.com',
        title: 'a'.repeat(256), // 超过 255 字符
      };

      const response = await request(app)
        .post('/api/v1/domains')
        .send(input)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockDomainService.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/domains/:id', () => {
    it('应该更新域名配置', async () => {
      const input = {
        title: 'Updated Title',
        author: 'Jane Doe',
      };

      const updatedDomain = { ...mockDomain, ...input };
      mockDomainService.update.mockResolvedValue(updatedDomain);

      const response = await request(app)
        .put('/api/v1/domains/1')
        .send(input)
        .expect(200);

      expect(response.body).toEqual({ data: updatedDomain });
      expect(mockDomainService.update).toHaveBeenCalledWith(1, input);
    });

    it('应该在 ID 不存在时返回 404', async () => {
      mockDomainService.update.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/domains/999')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('应该拒绝无效的更新数据', async () => {
      const input = {
        title: 'a'.repeat(256), // 超过 255 字符
      };

      const response = await request(app)
        .put('/api/v1/domains/1')
        .send(input)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockDomainService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/domains/:id', () => {
    it('应该删除域名配置', async () => {
      mockDomainService.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/v1/domains/1')
        .expect(200);

      expect(response.body).toEqual({ message: '域名配置已删除' });
      expect(mockDomainService.delete).toHaveBeenCalledWith(1);
    });

    it('应该在 ID 不存在时返回 404', async () => {
      mockDomainService.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/v1/domains/999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('应该拒绝无效的 ID', async () => {
      const response = await request(app)
        .delete('/api/v1/domains/invalid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockDomainService.delete).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理服务层抛出的错误', async () => {
      mockDomainService.getByDomain.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/v1/domains/example.com')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
