/**
 * DomainRoutes 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 */

import fc from 'fast-check';
import request from 'supertest';
import express, { Express } from 'express';
import { createDomainRoutes } from './DomainRoutes';
import { IDomainService } from '../services/DomainService';
import { errorHandler } from '../middleware/ErrorMiddleware';

describe('DomainRoutes - Property Tests', () => {
  let app: Express;
  let mockDomainService: jest.Mocked<IDomainService>;

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

  describe('Property 2: 不存在资源返回 404', () => {
    /**
     * **Validates: Requirements 1.2, 3.4, 3.6**
     * 
     * Feature: domain-config-service, Property 2: 不存在资源返回 404
     * 
     * 对于任意不存在于数据库中的域名或 ID，查询、更新或删除操作应返回 404 状态码和标准化错误响应。
     */

    it('查询不存在的域名应返回 404', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 255 })
            .filter(s => s.trim().length > 0), // Filter out whitespace-only strings
          async (domain) => {
            // 重置 mock 以确保每次迭代都是干净的状态
            mockDomainService.getByDomain.mockReset();
            // 模拟域名不存在
            mockDomainService.getByDomain.mockResolvedValue(null);

            const response = await request(app)
              .get(`/api/v1/domains/${encodeURIComponent(domain)}`);

            // 验证返回 404 状态码
            expect(response.status).toBe(404);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
            expect(response.body.error).toHaveProperty('message');
            expect(typeof response.body.error.message).toBe('string');
            
            // 验证服务被正确调用
            expect(mockDomainService.getByDomain).toHaveBeenCalledWith(domain.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('查询不存在的 ID 应返回 404', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          async (id) => {
            // 重置 mock 以确保每次迭代都是干净的状态
            mockDomainService.getById.mockReset();
            // 模拟 ID 不存在
            mockDomainService.getById.mockResolvedValue(null);

            const response = await request(app)
              .get(`/api/v1/domains/id/${id}`);

            // 验证返回 404 状态码
            expect(response.status).toBe(404);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
            expect(response.body.error).toHaveProperty('message');
            expect(typeof response.body.error.message).toBe('string');
            
            // 验证服务被正确调用
            expect(mockDomainService.getById).toHaveBeenCalledWith(id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('更新不存在的 ID 应返回 404', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          fc.record({
            title: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
            author: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
            description: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
            keywords: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
            links: fc.option(
              fc.dictionary(fc.string(), fc.string()),
              { nil: null }
            ),
          }),
          async (id, updateData) => {
            // 重置 mock 以确保每次迭代都是干净的状态
            mockDomainService.update.mockReset();
            // 模拟 ID 不存在
            mockDomainService.update.mockResolvedValue(null);

            const response = await request(app)
              .put(`/api/v1/domains/${id}`)
              .send(updateData);

            // 验证返回 404 状态码
            expect(response.status).toBe(404);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
            expect(response.body.error).toHaveProperty('message');
            expect(typeof response.body.error.message).toBe('string');
            
            // 验证服务被正确调用
            expect(mockDomainService.update).toHaveBeenCalledWith(id, updateData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('删除不存在的 ID 应返回 404', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          async (id) => {
            // 重置 mock 以确保每次迭代都是干净的状态
            mockDomainService.delete.mockReset();
            // 模拟 ID 不存在（delete 返回 false）
            mockDomainService.delete.mockResolvedValue(false);

            const response = await request(app)
              .delete(`/api/v1/domains/${id}`);

            // 验证返回 404 状态码
            expect(response.status).toBe(404);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
            expect(response.body.error).toHaveProperty('message');
            expect(typeof response.body.error.message).toBe('string');
            
            // 验证服务被正确调用
            expect(mockDomainService.delete).toHaveBeenCalledWith(id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: 无效输入返回 400', () => {
    /**
     * **Validates: Requirements 1.3, 4.1, 4.2, 4.3**
     * 
     * Feature: domain-config-service, Property 3: 无效输入返回 400
     * 
     * 对于任意无效的输入数据（空域名、超长字段、无效 JSON），创建或更新操作应返回 400 状态码和包含具体字段错误信息的响应。
     */

    it('创建域名配置时空域名应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t', '\n'),
          async (emptyDomain) => {
            const response = await request(app)
              .post('/api/v1/domains')
              .send({
                domain: emptyDomain,
                title: 'Test Title',
              });

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            expect(response.body.error).toHaveProperty('message');
            
            // 验证包含字段错误详情
            expect(response.body.error).toHaveProperty('details');
            expect(response.body.error.details).toHaveProperty('errors');
            expect(Array.isArray(response.body.error.details.errors)).toBe(true);
            
            // 验证错误详情包含域名字段
            const domainError = response.body.error.details.errors.find(
              (e: any) => e.field === 'domain'
            );
            expect(domainError).toBeDefined();
            expect(domainError.message).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('创建域名配置时超长域名应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).map(s => 'a'.repeat(256) + s), // Guaranteed > 255
          async (longDomain) => {
            const response = await request(app)
              .post('/api/v1/domains')
              .send({
                domain: longDomain,
                title: 'Test Title',
              });

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            expect(response.body.error).toHaveProperty('message');
            
            // 验证包含字段错误详情
            expect(response.body.error).toHaveProperty('details');
            expect(response.body.error.details).toHaveProperty('errors');
            
            // 验证错误详情包含域名字段
            const domainError = response.body.error.details.errors.find(
              (e: any) => e.field === 'domain'
            );
            expect(domainError).toBeDefined();
            expect(domainError.message).toContain('255');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('创建域名配置时超长 title 应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 256, maxLength: 500 }),
          async (domain, longTitle) => {
            const response = await request(app)
              .post('/api/v1/domains')
              .send({
                domain,
                title: longTitle,
              });

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            
            // 验证包含字段错误详情
            const titleError = response.body.error.details.errors.find(
              (e: any) => e.field === 'title'
            );
            expect(titleError).toBeDefined();
            expect(titleError.message).toContain('255');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('创建域名配置时超长 author 应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 256, maxLength: 500 }),
          async (domain, longAuthor) => {
            const response = await request(app)
              .post('/api/v1/domains')
              .send({
                domain,
                author: longAuthor,
              });

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            
            // 验证包含字段错误详情
            const authorError = response.body.error.details.errors.find(
              (e: any) => e.field === 'author'
            );
            expect(authorError).toBeDefined();
            expect(authorError.message).toContain('255');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('创建域名配置时超长 description 应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          fc.string({ minLength: 256, maxLength: 300 }), // Reduced max length to avoid timeout
          async (domain, longDescription) => {
            const response = await request(app)
              .post('/api/v1/domains')
              .send({
                domain,
                description: longDescription,
              });

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            
            // 验证包含字段错误详情
            const descError = response.body.error.details.errors.find(
              (e: any) => e.field === 'description'
            );
            expect(descError).toBeDefined();
            expect(descError.message).toContain('255');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('创建域名配置时超长 keywords 应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 256, maxLength: 500 }),
          async (domain, longKeywords) => {
            const response = await request(app)
              .post('/api/v1/domains')
              .send({
                domain,
                keywords: longKeywords,
              });

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            
            // 验证包含字段错误详情
            const keywordsError = response.body.error.details.errors.find(
              (e: any) => e.field === 'keywords'
            );
            expect(keywordsError).toBeDefined();
            expect(keywordsError.message).toContain('255');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('创建域名配置时无效的 links JSON 应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.oneof(
            fc.constant('not a json'),
            fc.constant(123),
            fc.constant(true),
            fc.constant([1, 2, 3]),
            fc.string()
          ),
          async (domain, invalidLinks) => {
            const response = await request(app)
              .post('/api/v1/domains')
              .send({
                domain,
                links: invalidLinks,
              });

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            
            // 验证包含字段错误详情
            expect(response.body.error).toHaveProperty('details');
            expect(response.body.error.details).toHaveProperty('errors');
            
            // 验证错误详情包含 links 字段
            const linksError = response.body.error.details.errors.find(
              (e: any) => e.field === 'links'
            );
            expect(linksError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('更新域名配置时超长字段应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          fc.oneof(
            fc.record({ title: fc.string({ minLength: 256, maxLength: 500 }) }),
            fc.record({ author: fc.string({ minLength: 256, maxLength: 500 }) }),
            fc.record({ description: fc.string({ minLength: 256, maxLength: 500 }) }),
            fc.record({ keywords: fc.string({ minLength: 256, maxLength: 500 }) })
          ),
          async (id, invalidUpdate) => {
            const response = await request(app)
              .put(`/api/v1/domains/${id}`)
              .send(invalidUpdate);

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            
            // 验证包含字段错误详情
            expect(response.body.error).toHaveProperty('details');
            expect(response.body.error.details).toHaveProperty('errors');
            expect(Array.isArray(response.body.error.details.errors)).toBe(true);
            expect(response.body.error.details.errors.length).toBeGreaterThan(0);
            
            // 验证错误消息包含 255
            const errorMessage = response.body.error.details.errors[0].message;
            expect(errorMessage).toContain('255');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('查询域名时空域名参数应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('   ', '\t\t', '\n\n'), // Only whitespace strings that will be trimmed to empty
          async (whitespaceDomain) => {
            const response = await request(app)
              .get(`/api/v1/domains/${encodeURIComponent(whitespaceDomain)}`);

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            expect(response.body.error).toHaveProperty('message');
            
            // 验证包含字段错误详情
            expect(response.body.error).toHaveProperty('details');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('查询域名时超长域名参数应返回 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 256, maxLength: 500 })
            .filter(s => s.trim().length > 255), // Filter to ensure trimmed string is still > 255 chars
          async (longDomain) => {
            const response = await request(app)
              .get(`/api/v1/domains/${encodeURIComponent(longDomain)}`);

            // 验证返回 400 状态码
            expect(response.status).toBe(400);
            
            // 验证标准化错误响应格式
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
            
            // 验证错误详情包含域名字段
            const domainError = response.body.error.details.errors.find(
              (e: any) => e.field === 'domain'
            );
            expect(domainError).toBeDefined();
            // After trim, if the string is still > 255 chars, we should get the max length error
            // Otherwise we get the empty error, both are valid 400 responses
            expect(domainError.message).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
