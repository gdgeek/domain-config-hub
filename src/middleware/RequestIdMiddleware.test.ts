/**
 * RequestIdMiddleware 单元测试
 * 
 * 测试请求 ID 中间件的功能
 */

import { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './RequestIdMiddleware';

describe('RequestIdMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('基本功能', () => {
    it('应该生成唯一的请求 ID', () => {
      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.requestId).toBeDefined();
      expect(typeof mockRequest.requestId).toBe('string');
      expect(mockRequest.requestId!.length).toBeGreaterThan(0);
    });

    it('应该将请求 ID 添加到响应头', () => {
      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        mockRequest.requestId
      );
    });

    it('应该调用 next 函数', () => {
      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('生成的请求 ID 应该是有效的 UUID 格式', () => {
      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(mockRequest.requestId).toMatch(uuidRegex);
    });
  });

  describe('请求头处理', () => {
    it('应该使用请求头中已存在的请求 ID', () => {
      const existingRequestId = 'existing-request-id-123';
      mockRequest.headers = {
        'x-request-id': existingRequestId,
      };

      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.requestId).toBe(existingRequestId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        existingRequestId
      );
    });

    it('应该在没有请求头时生成新的请求 ID', () => {
      mockRequest.headers = {};

      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.requestId).toBeDefined();
      expect(mockRequest.requestId).not.toBe('');
    });
  });

  describe('唯一性', () => {
    it('多次调用应该生成不同的请求 ID', () => {
      const requestIds = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const req: Partial<Request> = { headers: {} };
        const res: Partial<Response> = { setHeader: jest.fn() };
        const next = jest.fn();

        requestIdMiddleware(req as Request, res as Response, next);
        requestIds.add(req.requestId!);
      }

      // 所有生成的请求 ID 应该是唯一的
      expect(requestIds.size).toBe(100);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的请求头对象', () => {
      mockRequest.headers = {};

      expect(() => {
        requestIdMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).not.toThrow();

      expect(mockRequest.requestId).toBeDefined();
    });

    it('应该处理请求头中的其他字段', () => {
      mockRequest.headers = {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      };

      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.requestId).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('应该处理请求头中的空字符串请求 ID', () => {
      mockRequest.headers = {
        'x-request-id': '',
      };

      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 空字符串应该被视为假值，生成新的 UUID
      expect(mockRequest.requestId).toBeDefined();
      expect(mockRequest.requestId).not.toBe('');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(mockRequest.requestId).toMatch(uuidRegex);
    });
  });
});
