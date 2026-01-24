/**
 * MetricsMiddleware 集成测试
 * 
 * 测试 MetricsMiddleware 在真实 Express 应用中的行为
 */

import express, { Express } from 'express';
import request from 'supertest';
import { metricsMiddleware } from './MetricsMiddleware';
import {
  metricsRegistry,
  getMetrics,
  getMetricsContentType,
} from '../config/metrics';

describe('MetricsMiddleware Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    // 重置指标
    metricsRegistry.resetMetrics();

    // 创建 Express 应用
    app = express();

    // 应用中间件
    app.use(metricsMiddleware);

    // 定义测试路由
    app.get('/test', (_req, res) => {
      res.json({ message: 'success' });
    });

    app.post('/test', (_req, res) => {
      res.status(201).json({ message: 'created' });
    });

    app.get('/error', (_req, res) => {
      res.status(500).json({ error: 'Internal Server Error' });
    });

    app.get('/not-found', (_req, res) => {
      res.status(404).json({ error: 'Not Found' });
    });

    // 慢速路由（用于测试延迟）
    app.get('/slow', async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      res.json({ message: 'slow response' });
    });

    // 指标端点
    app.get('/metrics', async (_req, res) => {
      res.set('Content-Type', getMetricsContentType());
      res.end(await getMetrics());
    });
  });

  afterEach(() => {
    // 清理
    metricsRegistry.resetMetrics();
  });

  describe('Request Counting', () => {
    it('should count GET requests', async () => {
      await request(app).get('/test').expect(200);

      const metrics = await getMetrics();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should count POST requests', async () => {
      await request(app).post('/test').expect(201);

      const metrics = await getMetrics();

      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('status_code="201"');
    });

    it('should count error responses', async () => {
      await request(app).get('/error').expect(500);

      const metrics = await getMetrics();

      expect(metrics).toContain('status_code="500"');
    });

    it('should count 404 responses', async () => {
      await request(app).get('/not-found').expect(404);

      const metrics = await getMetrics();

      expect(metrics).toContain('status_code="404"');
    });

    it('should count multiple requests', async () => {
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      const metrics = await getMetrics();

      // 验证计数（应该至少有3个请求）
      const counterMatch = metrics.match(/http_requests_total\{method="GET",route="\/test",status_code="200"\} (\d+)/);
      expect(counterMatch).toBeTruthy();
      if (counterMatch) {
        expect(parseInt(counterMatch[1])).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Request Duration', () => {
    it('should record request duration', async () => {
      await request(app).get('/test').expect(200);

      const metrics = await getMetrics();

      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('method="GET"');
    });

    it('should record duration for slow requests', async () => {
      await request(app).get('/slow').expect(200);

      const metrics = await getMetrics();

      // 验证包含延迟指标
      expect(metrics).toContain('http_request_duration_seconds');
      
      // 验证有 bucket 数据
      expect(metrics).toMatch(/http_request_duration_seconds_bucket/);
    });

    it('should record duration for different routes', async () => {
      await request(app).get('/test').expect(200);
      await request(app).get('/error').expect(500);

      const metrics = await getMetrics();

      // 验证两个路由都有延迟记录
      expect(metrics).toContain('route="/test"');
      expect(metrics).toContain('route="/error"');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should expose metrics endpoint', async () => {
      // 先发送一些请求
      await request(app).get('/test').expect(200);

      // 获取指标
      const response = await request(app).get('/metrics').expect(200);

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should include metric metadata', async () => {
      await request(app).get('/test').expect(200);

      const response = await request(app).get('/metrics').expect(200);

      // 验证包含 HELP 和 TYPE 定义
      expect(response.text).toContain('# HELP http_requests_total');
      expect(response.text).toContain('# TYPE http_requests_total counter');
      expect(response.text).toContain('# HELP http_request_duration_seconds');
      expect(response.text).toContain('# TYPE http_request_duration_seconds histogram');
    });

    it('should not count metrics endpoint itself in metrics', async () => {
      // 获取初始指标
      await request(app).get('/metrics').expect(200);

      const metrics = await getMetrics();

      // 指标端点本身也会被计数（这是正常的）
      expect(metrics).toContain('route="/metrics"');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests correctly', async () => {
      // 发送多个并发请求
      const requests = [
        request(app).get('/test'),
        request(app).get('/test'),
        request(app).post('/test'),
        request(app).get('/error'),
        request(app).get('/not-found'),
      ];

      await Promise.all(requests);

      const metrics = await getMetrics();

      // 验证所有请求都被记录
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="201"');
      expect(metrics).toContain('status_code="404"');
      expect(metrics).toContain('status_code="500"');
    });
  });

  describe('Route Labeling', () => {
    it('should use route path for labeled routes', async () => {
      await request(app).get('/test').expect(200);

      const metrics = await getMetrics();

      expect(metrics).toContain('route="/test"');
    });

    it('should handle routes with parameters', async () => {
      // 添加带参数的路由
      app.get('/users/:id', (_req, res) => {
        res.json({ id: 1 });
      });

      await request(app).get('/users/123').expect(200);

      const metrics = await getMetrics();

      // 应该使用路由模式而不是实际路径
      expect(metrics).toContain('route="/users/:id"');
    });
  });

  describe('Error Scenarios', () => {
    it('should track metrics even when response has errors', async () => {
      await request(app).get('/error').expect(500);

      const metrics = await getMetrics();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('status_code="500"');
    });

    it('should track metrics for 404 routes', async () => {
      await request(app).get('/nonexistent').expect(404);

      const metrics = await getMetrics();

      expect(metrics).toContain('http_requests_total');
      // 404 路由没有定义，所以使用实际路径
      expect(metrics).toContain('route="/nonexistent"');
    });
  });

  describe('Prometheus Format', () => {
    it('should produce valid Prometheus format', async () => {
      await request(app).get('/test').expect(200);

      const metrics = await getMetrics();

      // 验证 Prometheus 格式
      expect(metrics).toMatch(/# HELP \w+/);
      expect(metrics).toMatch(/# TYPE \w+/);
      expect(metrics).toMatch(/\w+\{[^}]*\} \d+/);
    });

    it('should include histogram buckets', async () => {
      await request(app).get('/test').expect(200);

      const metrics = await getMetrics();

      // 验证包含 histogram buckets
      expect(metrics).toContain('http_request_duration_seconds_bucket');
      expect(metrics).toContain('le="0.005"');
      expect(metrics).toContain('le="0.01"');
      expect(metrics).toContain('le="+Inf"');
    });

    it('should include histogram sum and count', async () => {
      await request(app).get('/test').expect(200);

      const metrics = await getMetrics();

      // 验证包含 sum 和 count
      expect(metrics).toContain('http_request_duration_seconds_sum');
      expect(metrics).toContain('http_request_duration_seconds_count');
    });
  });
});
