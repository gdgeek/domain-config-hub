/**
 * DomainRoutes API 集成测试
 * 
 * 测试完整的请求-响应流程和错误处理
 * 使用 Mock 服务层来隔离 API 层的测试
 * 
 * 验证需求: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 * - 1.1: 返回存在的域名配置
 * - 1.2: 不存在的域名返回 404
 * - 1.3: 无效域名参数返回 400
 * - 3.1: 创建新的域名配置
 * - 3.2: 重复域名返回 409
 * - 3.3: 更新域名配置
 * - 3.4: 更新不存在的域名返回 404
 * - 3.5: 删除域名配置
 * - 3.6: 删除不存在的域名返回 404
 * - 3.7: 分页查询域名配置列表
 */

import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../app';
import { IDomainService, DomainOutput, PaginatedResult } from '../services/DomainService';
import { ConflictError } from '../errors/ConflictError';

// Mock 外部依赖
jest.mock('../config/logger');
jest.mock('../config/redis', () => ({
  isRedisEnabled: jest.fn(() => false),
  isRedisConnected: jest.fn(() => false),
}));
jest.mock('../config/database', () => ({
  isDatabaseConnected: jest.fn(() => Promise.resolve(true)),
}));

describe('DomainRoutes - API Integration Tests', () => {
  let app: Application;
  let mockDomainService: jest.Mocked<IDomainService>;
  
  // 模拟数据存储
  let mockDataStore: Map<number, DomainOutput>;
  let nextId: number;

  beforeAll(() => {
    // 设置高限流以避免测试干扰
    process.env.RATE_LIMIT_MAX = '1000';
  });

  beforeEach(() => {
    // 重置模拟数据存储
    mockDataStore = new Map();
    nextId = 1;

    // 创建 mock 服务，模拟真实的数据库行为
    mockDomainService = {
      create: jest.fn(async (input) => {
        // 检查域名是否已存在
        const existing = Array.from(mockDataStore.values()).find(d => d.domain === input.domain);
        if (existing) {
          throw new ConflictError(`域名 '${input.domain}' 已存在`, 'DUPLICATE_DOMAIN');
        }
        
        const domain: DomainOutput = {
          id: nextId++,
          domain: input.domain,
          title: input.title !== undefined ? input.title : null,
          author: input.author !== undefined ? input.author : null,
          description: input.description !== undefined ? input.description : null,
          keywords: input.keywords !== undefined ? input.keywords : null,
          links: input.links !== undefined ? input.links : null,
        };
        mockDataStore.set(domain.id, domain);
        return domain;
      }),
      
      getById: jest.fn(async (id) => {
        return mockDataStore.get(id) || null;
      }),
      
      getByDomain: jest.fn(async (domain) => {
        return Array.from(mockDataStore.values()).find(d => d.domain === domain) || null;
      }),
      
      list: jest.fn(async ({ page, pageSize }) => {
        const allDomains = Array.from(mockDataStore.values());
        const total = allDomains.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const data = allDomains.slice(start, start + pageSize);
        
        return {
          data,
          pagination: {
            page,
            pageSize,
            total,
            totalPages,
          },
        } as PaginatedResult<DomainOutput>;
      }),
      
      update: jest.fn(async (id, input) => {
        const domain = mockDataStore.get(id);
        if (!domain) {
          return null;
        }
        
        const updated = {
          ...domain,
          ...input,
        };
        mockDataStore.set(id, updated);
        return updated;
      }),
      
      delete: jest.fn(async (id) => {
        const exists = mockDataStore.has(id);
        if (exists) {
          mockDataStore.delete(id);
        }
        return exists;
      }),
    } as jest.Mocked<IDomainService>;

    // 创建应用
    app = createApp(mockDomainService);
  });

  describe('POST /api/v1/domains - 创建域名配置', () => {
    it('应该成功创建新的域名配置 (需求 3.1)', async () => {
      const input = {
        domain: 'example.com',
        title: 'Example Site',
        author: 'John Doe',
        description: 'A test site',
        keywords: 'test, example',
        links: { home: 'https://example.com', about: 'https://example.com/about' },
      };

      const response = await request(app)
        .post('/api/v1/domains')
        .send(input)
        .expect(201);

      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        domain: 'example.com',
        title: 'Example Site',
        author: 'John Doe',
        description: 'A test site',
        keywords: 'test, example',
        links: { home: 'https://example.com', about: 'https://example.com/about' },
      });

      // 验证响应头包含请求 ID
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('应该接受可选字段为 null 或空字符串', async () => {
      const input = {
        domain: 'minimal.com',
        title: null,
        author: '',
        description: null,
        keywords: '',
        links: null,
      };

      const response = await request(app)
        .post('/api/v1/domains')
        .send(input)
        .expect(201);

      expect(response.body.data).toMatchObject({
        domain: 'minimal.com',
        title: null,
        author: '',
        description: null,
        keywords: '',
        links: null,
      });
    });

    it('应该在域名已存在时返回 409 冲突 (需求 3.2)', async () => {
      // 先创建一个域名配置
      await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'duplicate.com', title: 'First' })
        .expect(201);

      // 尝试创建相同域名的配置
      const response = await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'duplicate.com', title: 'Second' })
        .expect(409);

      expect(response.body.error).toMatchObject({
        code: 'DUPLICATE_DOMAIN',
        message: expect.stringContaining('duplicate.com'),
      });
    });

    it('应该在缺少必需字段时返回 400 验证错误 (需求 1.3)', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({ title: 'Missing Domain' })
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: '请求数据验证失败',
        details: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'domain',
            }),
          ]),
        },
      });
    });

    it('应该在字段超长时返回 400 验证错误 (需求 1.3)', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'example.com',
          title: 'a'.repeat(256), // 超过 255 字符
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该在 links 字段不是对象时返回 400 验证错误', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'example.com',
          links: 'not an object',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/domains/:domain - 通过域名查询配置', () => {
    it('应该返回存在的域名配置 (需求 1.1)', async () => {
      // 先创建一个域名配置
      const created = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'test.com',
          title: 'Test Site',
          author: 'Tester',
        });

      // 通过域名查询
      const response = await request(app)
        .get('/api/v1/domains/test.com')
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: created.body.data.id,
        domain: 'test.com',
        title: 'Test Site',
        author: 'Tester',
      });

      // 验证响应头包含请求 ID
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('应该在域名不存在时返回 404 (需求 1.2)', async () => {
      const response = await request(app)
        .get('/api/v1/domains/nonexistent.com')
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('nonexistent.com'),
      });
    });

    it('应该在域名参数为空时返回正确的响应 (需求 1.3)', async () => {
      // GET /api/v1/domains/ 会匹配列表路由，而不是域名查询路由
      // 这是正确的行为，因为空域名应该返回列表
      await request(app)
        .get('/api/v1/domains/')
        .expect(200); // 返回列表
    });

    it('应该在域名参数超长时返回 400 (需求 1.3)', async () => {
      const longDomain = 'a'.repeat(256);
      const response = await request(app)
        .get(`/api/v1/domains/${longDomain}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/domains/id/:id - 通过 ID 查询配置', () => {
    it('应该返回存在的域名配置', async () => {
      // 先创建一个域名配置
      const created = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'idtest.com',
          title: 'ID Test',
        });

      const id = created.body.data.id;

      // 通过 ID 查询
      const response = await request(app)
        .get(`/api/v1/domains/id/${id}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id,
        domain: 'idtest.com',
        title: 'ID Test',
      });
    });

    it('应该在 ID 不存在时返回 404 (需求 3.4)', async () => {
      const response = await request(app)
        .get('/api/v1/domains/id/99999')
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('99999'),
      });
    });

    it('应该在 ID 无效时返回 400', async () => {
      const response = await request(app)
        .get('/api/v1/domains/id/invalid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该在 ID 为负数时返回 400', async () => {
      const response = await request(app)
        .get('/api/v1/domains/id/-1')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该在 ID 为 0 时返回 400', async () => {
      const response = await request(app)
        .get('/api/v1/domains/id/0')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/domains - 查询域名配置列表', () => {
    beforeEach(async () => {
      // 创建多个测试数据
      for (let i = 1; i <= 25; i++) {
        await request(app)
          .post('/api/v1/domains')
          .send({
            domain: `test${i}.com`,
            title: `Test Site ${i}`,
          });
      }
    });

    it('应该返回分页的域名配置列表 (需求 3.7)', async () => {
      const response = await request(app)
        .get('/api/v1/domains')
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        pagination: {
          page: 1,
          pageSize: 20,
          total: 25,
          totalPages: 2,
        },
      });

      expect(response.body.data).toHaveLength(20);
    });

    it('应该支持自定义分页参数 (需求 3.7)', async () => {
      const response = await request(app)
        .get('/api/v1/domains?page=2&pageSize=10')
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        pagination: {
          page: 2,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      });

      expect(response.body.data).toHaveLength(10);
    });

    it('应该在 page 小于 1 时返回 400', async () => {
      const response = await request(app)
        .get('/api/v1/domains?page=0')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该在 pageSize 超过 100 时返回 400', async () => {
      const response = await request(app)
        .get('/api/v1/domains?pageSize=101')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该在分页参数非数字时返回 400', async () => {
      const response = await request(app)
        .get('/api/v1/domains?page=abc')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该使用默认分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/domains')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('PUT /api/v1/domains/:id - 更新域名配置', () => {
    it('应该成功更新域名配置 (需求 3.3)', async () => {
      // 先创建一个域名配置
      const created = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'update.com',
          title: 'Original Title',
          author: 'Original Author',
        });

      const id = created.body.data.id;

      // 更新配置
      const response = await request(app)
        .put(`/api/v1/domains/${id}`)
        .send({
          title: 'Updated Title',
          description: 'New Description',
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id,
        domain: 'update.com',
        title: 'Updated Title',
        author: 'Original Author',
        description: 'New Description',
      });

      // 验证更新后的数据
      const verified = await request(app)
        .get(`/api/v1/domains/id/${id}`)
        .expect(200);

      expect(verified.body.data).toMatchObject({
        title: 'Updated Title',
        description: 'New Description',
      });
    });

    it('应该支持部分更新', async () => {
      // 先创建一个域名配置
      const created = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'partial.com',
          title: 'Original',
          author: 'Author',
        });

      const id = created.body.data.id;

      // 只更新 title
      const response = await request(app)
        .put(`/api/v1/domains/${id}`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        title: 'Updated',
        author: 'Author', // 未更新的字段保持不变
      });
    });

    it('应该在 ID 不存在时返回 404 (需求 3.4)', async () => {
      const response = await request(app)
        .put('/api/v1/domains/99999')
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('99999'),
      });
    });

    it('应该在更新数据无效时返回 400', async () => {
      // 先创建一个域名配置
      const created = await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'invalid-update.com' });

      const id = created.body.data.id;

      // 尝试用超长字段更新
      const response = await request(app)
        .put(`/api/v1/domains/${id}`)
        .send({ title: 'a'.repeat(256) })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该在 ID 无效时返回 400', async () => {
      const response = await request(app)
        .put('/api/v1/domains/invalid')
        .send({ title: 'Updated' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/domains/:id - 删除域名配置', () => {
    it('应该成功删除域名配置 (需求 3.5)', async () => {
      // 先创建一个域名配置
      const created = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'delete.com',
          title: 'To Be Deleted',
        });

      const id = created.body.data.id;

      // 删除配置
      const response = await request(app)
        .delete(`/api/v1/domains/${id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: '域名配置已删除',
      });

      // 验证已删除
      await request(app)
        .get(`/api/v1/domains/id/${id}`)
        .expect(404);
    });

    it('应该在 ID 不存在时返回 404 (需求 3.6)', async () => {
      const response = await request(app)
        .delete('/api/v1/domains/99999')
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('99999'),
      });
    });

    it('应该在 ID 无效时返回 400', async () => {
      const response = await request(app)
        .delete('/api/v1/domains/invalid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该在 ID 为负数时返回 400', async () => {
      const response = await request(app)
        .delete('/api/v1/domains/-1')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('完整的 CRUD 流程测试', () => {
    it('应该支持完整的创建-读取-更新-删除流程', async () => {
      // 1. 创建
      const created = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'crud.com',
          title: 'CRUD Test',
          author: 'Tester',
        })
        .expect(201);

      const id = created.body.data.id;
      expect(created.body.data).toMatchObject({
        domain: 'crud.com',
        title: 'CRUD Test',
        author: 'Tester',
      });

      // 2. 通过域名读取
      const readByDomain = await request(app)
        .get('/api/v1/domains/crud.com')
        .expect(200);

      expect(readByDomain.body.data).toMatchObject({
        id,
        domain: 'crud.com',
        title: 'CRUD Test',
      });

      // 3. 通过 ID 读取
      const readById = await request(app)
        .get(`/api/v1/domains/id/${id}`)
        .expect(200);

      expect(readById.body.data).toMatchObject({
        id,
        domain: 'crud.com',
      });

      // 4. 更新
      const updated = await request(app)
        .put(`/api/v1/domains/${id}`)
        .send({
          title: 'Updated CRUD Test',
          description: 'Updated description',
        })
        .expect(200);

      expect(updated.body.data).toMatchObject({
        id,
        domain: 'crud.com',
        title: 'Updated CRUD Test',
        description: 'Updated description',
      });

      // 5. 验证更新
      const verifyUpdate = await request(app)
        .get('/api/v1/domains/crud.com')
        .expect(200);

      expect(verifyUpdate.body.data.title).toBe('Updated CRUD Test');

      // 6. 删除
      await request(app)
        .delete(`/api/v1/domains/${id}`)
        .expect(200);

      // 7. 验证删除
      await request(app)
        .get(`/api/v1/domains/crud.com`)
        .expect(404);

      await request(app)
        .get(`/api/v1/domains/id/${id}`)
        .expect(404);
    });
  });

  describe('错误处理和响应格式', () => {
    it('所有响应应包含请求 ID (需求 1.4)', async () => {
      // 成功响应
      const successResponse = await request(app)
        .get('/api/v1/domains');
      expect(successResponse.headers['x-request-id']).toBeDefined();

      // 错误响应
      const errorResponse = await request(app)
        .get('/api/v1/domains/nonexistent.com');
      expect(errorResponse.headers['x-request-id']).toBeDefined();
    });

    it('验证错误应包含具体的字段和错误信息', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({
          title: 'Missing domain',
        })
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: '请求数据验证失败',
        details: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'domain',
              message: expect.any(String),
              type: expect.any(String),
            }),
          ]),
        },
      });
    });

    it('错误响应应使用统一的格式', async () => {
      // 404 错误
      const notFoundResponse = await request(app)
        .get('/api/v1/domains/notfound.com')
        .expect(404);

      expect(notFoundResponse.body).toHaveProperty('error');
      expect(notFoundResponse.body.error).toHaveProperty('code');
      expect(notFoundResponse.body.error).toHaveProperty('message');

      // 400 错误
      const validationResponse = await request(app)
        .post('/api/v1/domains')
        .send({})
        .expect(400);

      expect(validationResponse.body).toHaveProperty('error');
      expect(validationResponse.body.error).toHaveProperty('code');
      expect(validationResponse.body.error).toHaveProperty('message');

      // 409 错误
      await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'conflict.com' });

      const conflictResponse = await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'conflict.com' })
        .expect(409);

      expect(conflictResponse.body).toHaveProperty('error');
      expect(conflictResponse.body.error).toHaveProperty('code');
      expect(conflictResponse.body.error).toHaveProperty('message');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理最大长度的字段', async () => {
      const maxLengthString = 'a'.repeat(255);

      const response = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: maxLengthString,
          title: maxLengthString,
          author: maxLengthString,
          description: maxLengthString,
          keywords: maxLengthString,
        })
        .expect(201);

      expect(response.body.data.domain).toBe(maxLengthString);
      expect(response.body.data.title).toBe(maxLengthString);
    });

    it('应该处理空对象的 links 字段', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'emptylinks.com',
          links: {},
        })
        .expect(201);

      expect(response.body.data.links).toEqual({});
    });

    it('应该处理复杂的 links 对象', async () => {
      const complexLinks = {
        home: 'https://example.com',
        about: 'https://example.com/about',
        contact: 'https://example.com/contact',
        nested: {
          level1: {
            level2: 'value',
          },
        },
        array: ['item1', 'item2'],
      };

      const response = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: 'complexlinks.com',
          links: complexLinks,
        })
        .expect(201);

      expect(response.body.data.links).toEqual(complexLinks);
    });

    it('应该处理特殊字符的域名', async () => {
      const specialDomain = 'test-domain_123.example.com';

      const response = await request(app)
        .post('/api/v1/domains')
        .send({
          domain: specialDomain,
          title: 'Special Domain',
        })
        .expect(201);

      expect(response.body.data.domain).toBe(specialDomain);

      // 验证可以通过域名查询
      const retrieved = await request(app)
        .get(`/api/v1/domains/${specialDomain}`)
        .expect(200);

      expect(retrieved.body.data.domain).toBe(specialDomain);
    });

    it('应该处理空列表查询', async () => {
      // 确保数据存储为空（已在 beforeEach 中重置）
      const response = await request(app)
        .get('/api/v1/domains')
        .expect(200);

      expect(response.body).toMatchObject({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('应该处理超出范围的分页请求', async () => {
      // 只创建 5 条数据
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/v1/domains')
          .send({ domain: `page${i}.com` });
      }

      // 请求第 10 页
      const response = await request(app)
        .get('/api/v1/domains?page=10&pageSize=10')
        .expect(200);

      expect(response.body).toMatchObject({
        data: [],
        pagination: {
          page: 10,
          pageSize: 10,
          total: 5,
          totalPages: 1,
        },
      });
    });
  });
});
