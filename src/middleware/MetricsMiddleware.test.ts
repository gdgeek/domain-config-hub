/**
 * MetricsMiddleware 单元测试
 */

import { Request, Response, NextFunction } from 'express';
import { metricsMiddleware } from './MetricsMiddleware';
import {
  metricsRegistry,
  getMetrics,
  getMetricsContentType,
} from '../config/metrics';

describe('MetricsMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let finishCallback: () => void;

  beforeEach(() => {
    // 重置指标
    metricsRegistry.resetMetrics();

    // 创建 mock 对象
    mockRequest = {
      method: 'GET',
      path: '/api/v1/domains',
      route: {
        path: '/api/v1/domains',
      } as any,
    };

    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockResponse as Response;
      }),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    // 清理
    metricsRegistry.resetMetrics();
  });

  describe('metricsMiddleware', () => {
    it('should call next function', () => {
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should register finish event listener', () => {
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should increment request counter on finish', async () => {
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 触发 finish 事件
      finishCallback();

      // 获取指标
      const metrics = await getMetrics();

      // 验证指标包含请求计数
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/v1/domains"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should record request duration on finish', async () => {
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 等待一小段时间以确保有可测量的延迟
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 触发 finish 事件
      finishCallback();

      // 获取指标
      const metrics = await getMetrics();

      // 验证指标包含请求延迟
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/v1/domains"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should handle different HTTP methods', async () => {
      mockRequest.method = 'POST';

      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      finishCallback();

      const metrics = await getMetrics();

      expect(metrics).toContain('method="POST"');
    });

    it('should handle different status codes', async () => {
      mockResponse.statusCode = 404;

      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      finishCallback();

      const metrics = await getMetrics();

      expect(metrics).toContain('status_code="404"');
    });

    it('should handle error status codes', async () => {
      mockResponse.statusCode = 500;

      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      finishCallback();

      const metrics = await getMetrics();

      expect(metrics).toContain('status_code="500"');
    });

    it('should use path when route is not available', async () => {
      mockRequest = {
        ...mockRequest,
        route: undefined,
        path: '/custom/path',
      };

      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      finishCallback();

      const metrics = await getMetrics();

      expect(metrics).toContain('route="/custom/path"');
    });

    it('should track multiple requests', async () => {
      // 第一个请求
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      finishCallback();

      // 第二个请求
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      finishCallback();

      const metrics = await getMetrics();

      // 验证计数器增加
      expect(metrics).toContain('http_requests_total');
      // 计数应该是 2
      const counterMatch = metrics.match(/http_requests_total\{[^}]+\} (\d+)/);
      expect(counterMatch).toBeTruthy();
      if (counterMatch) {
        expect(parseInt(counterMatch[1])).toBe(2);
      }
    });
  });

  describe('getMetrics', () => {
    it('should return Prometheus format metrics', async () => {
      const metrics = await getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include metric definitions', async () => {
      // 触发一些指标
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      finishCallback();

      const metrics = await getMetrics();

      // 验证包含 HELP 和 TYPE 定义
      expect(metrics).toContain('# HELP http_requests_total');
      expect(metrics).toContain('# TYPE http_requests_total counter');
      expect(metrics).toContain('# HELP http_request_duration_seconds');
      expect(metrics).toContain('# TYPE http_request_duration_seconds histogram');
    });
  });

  describe('getMetricsContentType', () => {
    it('should return correct content type', () => {
      const contentType = getMetricsContentType();

      expect(contentType).toBeTruthy();
      expect(typeof contentType).toBe('string');
      // Prometheus 使用特定的内容类型
      expect(contentType).toContain('text/plain');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very fast requests', async () => {
      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 立即触发 finish
      finishCallback();

      const metrics = await getMetrics();

      // 应该仍然记录指标，即使延迟非常小
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
    });

    it('should handle requests with special characters in path', async () => {
      mockRequest = {
        ...mockRequest,
        path: '/api/v1/domains/example.com',
        route: undefined,
      };

      metricsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      finishCallback();

      const metrics = await getMetrics();

      expect(metrics).toContain('http_requests_total');
    });

    it('should handle concurrent requests', async () => {
      const requests = [];

      // 创建多个并发请求
      for (let i = 0; i < 5; i++) {
        const req = { ...mockRequest };
        const res: Partial<Response> = {
          ...mockResponse,
          on: jest.fn((event: string, callback: () => void): Response => {
            if (event === 'finish') {
              // 立即调用回调
              setTimeout(callback, 0);
            }
            return res as Response;
          }),
        };

        metricsMiddleware(req as Request, res as Response, nextFunction);
        requests.push(res);
      }

      // 等待所有请求完成
      await new Promise((resolve) => setTimeout(resolve, 50));

      const metrics = await getMetrics();

      // 验证所有请求都被计数
      const counterMatch = metrics.match(/http_requests_total\{[^}]+\} (\d+)/);
      expect(counterMatch).toBeTruthy();
      if (counterMatch) {
        expect(parseInt(counterMatch[1])).toBe(5);
      }
    });
  });
});
