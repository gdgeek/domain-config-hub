/**
 * Express 应用配置模块测试
 * 
 * 测试中间件执行顺序、路由挂载、Swagger UI、健康检查和监控指标端点
 */

import request from 'supertest';
import { Application } from 'express';
import { createApp } from './app';
import { IDomainService, DomainOutput } from './services/DomainService';
import * as database from './config/database';
import * as redis from './config/redis';

// Mock 依赖
jest.mock('./config/database');
jest.mock('./config/redis');
jest.mock('./config/logger');

describe('Express Application Configuration', () => {
  let app: Application;
  let mockDomainService: jest.Mocked<IDomainService>;

  beforeAll(() => {
    // Set a high rate limit for tests to avoid interference
    process.env.RATE_LIMIT_MAX = '1000';
  });

  beforeEach(() => {
    // 创建 mock 域名服务
    mockDomainService = {
      create: jest.fn(),
      getById: jest.fn(),
      getByDomain: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IDomainService>;

    // 创建应用实例
    app = createApp(mockDomainService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Middleware Configuration', () => {
    it('should add X-Request-ID header to all responses', async () => {
      // Mock database connection
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(true);

      const response = await request(app).get('/health');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    it('should parse JSON request body', async () => {
      const mockDomain: DomainOutput = {
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: null,
        description: null,
        keywords: null,
        links: null,
      };

      mockDomainService.create.mockResolvedValue(mockDomain);

      const response = await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'example.com', title: 'Example' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(mockDomainService.create).toHaveBeenCalledWith({
        domain: 'example.com',
        title: 'Example',
      });
    });

    it('should enforce rate limiting', async () => {
      // Create a separate app instance with low rate limit for this test
      const originalRateLimit = process.env.RATE_LIMIT_MAX;
      process.env.RATE_LIMIT_MAX = '5';
      
      // Need to reload config module to pick up new env var
      jest.resetModules();
      const { createApp: createAppReloaded } = require('./app');
      const rateLimitApp = createAppReloaded(mockDomainService);
      
      // Mock database connection
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(true);

      // Make requests sequentially to ensure they hit the rate limiter
      let rateLimitedCount = 0;
      for (let i = 0; i < 10; i++) {
        const response = await request(rateLimitApp).get('/health');
        if (response.status === 429) {
          rateLimitedCount++;
          // Check rate limit error format
          expect(response.body).toEqual({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: '请求过于频繁，请稍后再试',
            },
          });
        }
      }

      // At least one request should be rate limited
      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // Restore original rate limit
      if (originalRateLimit) {
        process.env.RATE_LIMIT_MAX = originalRateLimit;
      } else {
        delete process.env.RATE_LIMIT_MAX;
      }
      
      // Reload modules to restore original config
      jest.resetModules();
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger UI at /api-docs', async () => {
      const response = await request(app).get('/api-docs/');

      expect(response.status).toBe(200);
      expect(response.text).toContain('swagger-ui');
    });

    it('should redirect /api-docs to /api-docs/', async () => {
      const response = await request(app).get('/api-docs');

      expect([200, 301, 302]).toContain(response.status);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return healthy status when all services are connected', async () => {
      // Mock all services as connected
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(true);
      jest.spyOn(redis, 'isRedisEnabled').mockReturnValue(true);
      jest.spyOn(redis, 'isRedisConnected').mockReturnValue(true);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          database: {
            status: 'connected',
            message: '数据库连接正常',
          },
          redis: {
            status: 'connected',
            message: 'Redis 连接正常',
          },
        },
      });
    });

    it('should return degraded status when Redis is enabled but disconnected', async () => {
      // Mock database connected, Redis enabled but disconnected
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(true);
      jest.spyOn(redis, 'isRedisEnabled').mockReturnValue(true);
      jest.spyOn(redis, 'isRedisConnected').mockReturnValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'degraded',
        timestamp: expect.any(String),
        services: {
          database: {
            status: 'connected',
            message: '数据库连接正常',
          },
          redis: {
            status: 'disconnected',
            message: 'Redis 连接失败',
          },
        },
      });
    });

    it('should return unhealthy status when database is disconnected', async () => {
      // Mock database disconnected
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(false);
      jest.spyOn(redis, 'isRedisEnabled').mockReturnValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        services: {
          database: {
            status: 'disconnected',
            message: '数据库连接失败',
          },
          redis: {
            status: 'disabled',
            message: 'Redis 未启用',
          },
        },
      });
    });

    it('should return healthy status when Redis is disabled', async () => {
      // Mock database connected, Redis disabled
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(true);
      jest.spyOn(redis, 'isRedisEnabled').mockReturnValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          database: {
            status: 'connected',
            message: '数据库连接正常',
          },
          redis: {
            status: 'disabled',
            message: 'Redis 未启用',
          },
        },
      });
    });

    it('should handle errors during health check gracefully', async () => {
      // Mock database check to throw error
      jest.spyOn(database, 'isDatabaseConnected').mockRejectedValue(new Error('Connection error'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        services: {
          database: {
            status: 'unknown',
            message: '无法检查数据库状态',
          },
          redis: {
            status: 'unknown',
            message: '无法检查 Redis 状态',
          },
        },
      });
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });

    it('should include metrics for the /metrics request itself', async () => {
      // Make a request to generate metrics
      await request(app).get('/metrics');

      // Make another request to see the metrics
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.text).toContain('http_requests_total');
    });
  });

  describe('Domain Routes', () => {
    it('should mount domain routes under /api/v1/domains', async () => {
      mockDomainService.list.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        },
      });

      const response = await request(app).get('/api/v1/domains');

      expect(response.status).toBe(200);
      expect(mockDomainService.list).toHaveBeenCalled();
    });

    it('should handle domain creation', async () => {
      const mockDomain: DomainOutput = {
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: null,
        description: null,
        keywords: null,
        links: null,
      };

      mockDomainService.create.mockResolvedValue(mockDomain);

      const response = await request(app)
        .post('/api/v1/domains')
        .send({ domain: 'example.com', title: 'Example' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(mockDomain);
    });

    it('should handle domain retrieval by domain name', async () => {
      const mockDomain: DomainOutput = {
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: null,
        description: null,
        keywords: null,
        links: null,
      };

      mockDomainService.getByDomain.mockResolvedValue(mockDomain);

      const response = await request(app).get('/api/v1/domains/example.com');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDomain);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors with 400 status', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({ title: 'Example' }); // Missing required 'domain' field

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle not found errors with 404 status', async () => {
      mockDomainService.getByDomain.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/domains/nonexistent.com');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should include request ID in error responses', async () => {
      const response = await request(app)
        .post('/api/v1/domains')
        .send({ title: 'Example' }); // Invalid request

      expect(response.status).toBe(400);
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Middleware Execution Order', () => {
    it('should execute middleware in correct order', async () => {
      // Mock database connection
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(true);

      const response = await request(app).get('/health');

      // Request ID should be added first
      expect(response.headers['x-request-id']).toBeDefined();

      // Response should be successful
      expect(response.status).toBe(200);
    });

    it('should apply rate limiting before route handlers', async () => {
      // Create a separate app instance with low rate limit for this test
      const originalRateLimit = process.env.RATE_LIMIT_MAX;
      process.env.RATE_LIMIT_MAX = '5';
      
      // Need to reload config module to pick up new env var
      jest.resetModules();
      const { createApp: createAppReloaded } = require('./app');
      const rateLimitApp = createAppReloaded(mockDomainService);
      
      // Mock database connection
      jest.spyOn(database, 'isDatabaseConnected').mockResolvedValue(true);

      // Make requests sequentially to ensure they hit the rate limiter
      let rateLimitedCount = 0;
      for (let i = 0; i < 10; i++) {
        const response = await request(rateLimitApp).get('/health');
        if (response.status === 429) {
          rateLimitedCount++;
        }
      }

      // Some requests should be rate limited before reaching the handler
      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // Restore original rate limit
      if (originalRateLimit) {
        process.env.RATE_LIMIT_MAX = originalRateLimit;
      } else {
        delete process.env.RATE_LIMIT_MAX;
      }
      
      // Reload modules to restore original config
      jest.resetModules();
    });
  });
});
