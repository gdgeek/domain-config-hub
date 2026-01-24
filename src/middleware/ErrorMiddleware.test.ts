/**
 * ErrorMiddleware 单元测试
 * 
 * 测试错误处理中间件和异步路由包装器
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  asyncHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
} from './ErrorMiddleware';

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
  logError: jest.fn(),
}));

describe('ErrorMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('应该处理 ValidationError 并返回 400 状态码', () => {
      const error = new ValidationError('验证失败', 'VALIDATION_ERROR', {
        errors: [{ field: 'domain', message: '域名不能为空', type: 'string.empty' }],
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证失败',
          details: {
            errors: [{ field: 'domain', message: '域名不能为空', type: 'string.empty' }],
          },
        },
      });
    });

    it('应该处理 NotFoundError 并返回 404 状态码', () => {
      const error = new NotFoundError('资源不存在', 'NOT_FOUND');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: '资源不存在',
        },
      });
    });

    it('应该处理 ConflictError 并返回 409 状态码', () => {
      const error = new ConflictError('资源冲突', 'CONFLICT');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'CONFLICT',
          message: '资源冲突',
        },
      });
    });

    it('应该处理 DatabaseError 并返回 500 状态码', () => {
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('数据库错误', 'DATABASE_ERROR', originalError);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'DATABASE_ERROR',
          message: '数据库错误',
        },
      });
    });

    it('应该处理未知错误并返回 500 状态码', () => {
      const error = new Error('未知错误');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: '未知错误',
        },
      });
    });

    it('应该处理没有消息的错误', () => {
      const error = new Error();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
        },
      });
    });

    it('应该在处理 ValidationError 时不包含 details 如果没有提供', () => {
      const error = new ValidationError('验证失败');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证失败',
        },
      });
    });
  });

  describe('asyncHandler', () => {
    it('应该成功处理异步函数', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该捕获异步函数抛出的错误并传递给 next', async () => {
      const error = new Error('异步错误');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('应该捕获 ValidationError 并传递给 next', async () => {
      const error = new ValidationError('验证失败');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('应该捕获 NotFoundError 并传递给 next', async () => {
      const error = new NotFoundError('资源不存在');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('应该处理返回 Response 的异步函数', async () => {
      const asyncFn = jest.fn().mockResolvedValue(mockResponse);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
