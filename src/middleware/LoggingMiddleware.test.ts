/**
 * LoggingMiddleware 单元测试
 */

import { Request, Response, NextFunction } from 'express';
import { loggingMiddleware } from './LoggingMiddleware';
import { logger } from '../config/logger';

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    log: jest.fn(),
  },
}));

describe('LoggingMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let finishCallback: () => void;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      requestId: 'test-request-id',
      method: 'GET',
      url: '/api/v1/domains/example.com',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'user-agent') {
          return 'test-agent';
        }
        return undefined;
      }) as any,
    };

    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: (...args: any[]) => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockResponse as Response;
      }),
    };

    mockNext = jest.fn();
  });

  describe('loggingMiddleware', () => {
    it('应该记录请求日志', () => {
      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(logger.info).toHaveBeenCalledWith('Incoming request', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/domains/example.com',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('应该调用 next 函数', () => {
      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该监听响应完成事件', () => {
      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('应该在响应完成时记录响应日志（成功）', () => {
      mockResponse.statusCode = 200;

      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 触发 finish 事件
      finishCallback();

      expect(logger.log).toHaveBeenCalledWith('info', 'Request completed', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/domains/example.com',
        statusCode: 200,
        duration: expect.stringMatching(/^\d+ms$/),
        ip: '127.0.0.1',
      });
    });

    it('应该在响应完成时记录响应日志（错误）', () => {
      mockResponse.statusCode = 404;

      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 触发 finish 事件
      finishCallback();

      expect(logger.log).toHaveBeenCalledWith('warn', 'Request completed', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/domains/example.com',
        statusCode: 404,
        duration: expect.stringMatching(/^\d+ms$/),
        ip: '127.0.0.1',
      });
    });

    it('应该在响应完成时记录响应日志（服务器错误）', () => {
      mockResponse.statusCode = 500;

      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 触发 finish 事件
      finishCallback();

      expect(logger.log).toHaveBeenCalledWith('warn', 'Request completed', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/domains/example.com',
        statusCode: 500,
        duration: expect.stringMatching(/^\d+ms$/),
        ip: '127.0.0.1',
      });
    });

    it('应该记录包含请求 ID 的日志', () => {
      const customRequestId = 'custom-uuid-12345';
      mockRequest.requestId = customRequestId;

      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(logger.info).toHaveBeenCalledWith('Incoming request', 
        expect.objectContaining({
          requestId: customRequestId,
        })
      );

      finishCallback();

      expect(logger.log).toHaveBeenCalledWith('info', 'Request completed',
        expect.objectContaining({
          requestId: customRequestId,
        })
      );
    });

    it('应该记录响应时间', () => {
      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // 触发 finish 事件
      finishCallback();

      const logCall = (logger.log as jest.Mock).mock.calls[0];
      const logData = logCall[2];
      
      // 验证 duration 字段存在且格式正确
      expect(logData.duration).toMatch(/^\d+ms$/);
      
      // 提取数字部分
      const duration = parseInt(logData.duration.replace('ms', ''), 10);
      
      // 验证时间是合理的（应该很短）
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000); // 应该小于 1 秒
    });

    it('应该处理缺少 user-agent 的请求', () => {
      mockRequest.get = jest.fn(() => undefined) as any;

      loggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(logger.info).toHaveBeenCalledWith('Incoming request', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/domains/example.com',
        ip: '127.0.0.1',
        userAgent: undefined,
      });
    });

    it('应该处理不同的 HTTP 方法', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        jest.clearAllMocks();
        mockRequest.method = method;

        loggingMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(logger.info).toHaveBeenCalledWith('Incoming request',
          expect.objectContaining({
            method,
          })
        );
      });
    });

    it('应该处理不同的 URL 路径', () => {
      const urls = [
        '/api/v1/domains',
        '/api/v1/domains/example.com',
        '/api/v1/domains/id/123',
        '/health',
        '/metrics',
      ];

      urls.forEach((url) => {
        jest.clearAllMocks();
        mockRequest.url = url;

        loggingMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(logger.info).toHaveBeenCalledWith('Incoming request',
          expect.objectContaining({
            url,
          })
        );
      });
    });
  });
});
