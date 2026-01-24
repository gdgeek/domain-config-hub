/**
 * ErrorMiddleware 属性测试
 * 
 * 验证错误处理中间件的通用属性
 */

import fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
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

describe('ErrorMiddleware - Property Tests', () => {
  /**
   * Property 10: 错误响应格式一致性
   * 
   * **验证: 需求 4.4, 7.1**
   * 
   * 对于任意错误场景，响应应包含统一的 error 对象，包含 code 和 message 字段
   */
  describe('Property 10: 错误响应格式一致性', () => {
    // 创建 mock 请求和响应对象的辅助函数
    const createMockRequestResponse = () => {
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

      const mockRequest: Partial<Request> = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
      };

      const mockResponse: Partial<Response> = {
        status: statusMock,
        json: jsonMock,
      };

      const mockNext: NextFunction = jest.fn();

      return { mockRequest, mockResponse, mockNext, jsonMock, statusMock };
    };

    it('任意 ValidationError 都应该返回统一的错误格式', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息
          fc.string({ minLength: 1, maxLength: 200 }),
          // 生成任意的错误代码
          fc.string({ minLength: 1, maxLength: 50 }),
          // 生成可选的错误详情
          fc.option(
            fc.dictionary(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.anything()
            ),
            { nil: undefined }
          ),
          (message, code, details) => {
            const { mockRequest, mockResponse, mockNext, jsonMock, statusMock } =
              createMockRequestResponse();

            const error = new ValidationError(message, code, details);
            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证状态码
            expect(statusMock).toHaveBeenCalledWith(400);

            // 验证响应格式
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(typeof response.error.code).toBe('string');
            expect(typeof response.error.message).toBe('string');
            expect(response.error.code).toBe(code);
            expect(response.error.message).toBe(message);

            // 如果有 details，应该包含在响应中
            if (details) {
              expect(response.error).toHaveProperty('details');
              expect(response.error.details).toEqual(details);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意 NotFoundError 都应该返回统一的错误格式', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息
          fc.string({ minLength: 1, maxLength: 200 }),
          // 生成任意的错误代码
          fc.string({ minLength: 1, maxLength: 50 }),
          (message, code) => {
            const { mockRequest, mockResponse, mockNext, jsonMock, statusMock } =
              createMockRequestResponse();

            const error = new NotFoundError(message, code);
            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证状态码
            expect(statusMock).toHaveBeenCalledWith(404);

            // 验证响应格式
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(typeof response.error.code).toBe('string');
            expect(typeof response.error.message).toBe('string');
            expect(response.error.code).toBe(code);
            expect(response.error.message).toBe(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意 ConflictError 都应该返回统一的错误格式', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息
          fc.string({ minLength: 1, maxLength: 200 }),
          // 生成任意的错误代码
          fc.string({ minLength: 1, maxLength: 50 }),
          (message, code) => {
            const { mockRequest, mockResponse, mockNext, jsonMock, statusMock } =
              createMockRequestResponse();

            const error = new ConflictError(message, code);
            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证状态码
            expect(statusMock).toHaveBeenCalledWith(409);

            // 验证响应格式
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(typeof response.error.code).toBe('string');
            expect(typeof response.error.message).toBe('string');
            expect(response.error.code).toBe(code);
            expect(response.error.message).toBe(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意 DatabaseError 都应该返回统一的错误格式', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息
          fc.string({ minLength: 1, maxLength: 200 }),
          // 生成任意的错误代码
          fc.string({ minLength: 1, maxLength: 50 }),
          (message, code) => {
            const { mockRequest, mockResponse, mockNext, jsonMock, statusMock } =
              createMockRequestResponse();

            const originalError = new Error('Original database error');
            const error = new DatabaseError(message, code, originalError);
            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证状态码
            expect(statusMock).toHaveBeenCalledWith(500);

            // 验证响应格式
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(typeof response.error.code).toBe('string');
            expect(typeof response.error.message).toBe('string');
            expect(response.error.code).toBe(code);
            expect(response.error.message).toBe(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意未知错误都应该返回统一的错误格式', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息
          fc.string({ minLength: 1, maxLength: 200 }),
          (message) => {
            const { mockRequest, mockResponse, mockNext, jsonMock, statusMock } =
              createMockRequestResponse();

            const error = new Error(message);
            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证状态码
            expect(statusMock).toHaveBeenCalledWith(500);

            // 验证响应格式
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(typeof response.error.code).toBe('string');
            expect(typeof response.error.message).toBe('string');
            expect(response.error.code).toBe('INTERNAL_ERROR');
            expect(response.error.message).toBe(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('所有错误类型都应该返回包含 error.code 和 error.message 的响应', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息和代码
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          // 生成错误类型选择器
          fc.integer({ min: 0, max: 4 }),
          (message, code, errorType) => {
            const { mockRequest, mockResponse, mockNext, jsonMock, statusMock } =
              createMockRequestResponse();

            let error: Error;
            let expectedStatusCode: number;

            // 根据类型创建不同的错误
            switch (errorType) {
              case 0:
                error = new ValidationError(message, code);
                expectedStatusCode = 400;
                break;
              case 1:
                error = new NotFoundError(message, code);
                expectedStatusCode = 404;
                break;
              case 2:
                error = new ConflictError(message, code);
                expectedStatusCode = 409;
                break;
              case 3:
                error = new DatabaseError(message, code);
                expectedStatusCode = 500;
                break;
              default:
                error = new Error(message);
                expectedStatusCode = 500;
                break;
            }

            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证状态码
            expect(statusMock).toHaveBeenCalledWith(expectedStatusCode);

            // 验证响应格式一致性
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(typeof response.error.code).toBe('string');
            expect(typeof response.error.message).toBe('string');
            expect(response.error.code.length).toBeGreaterThan(0);
            expect(response.error.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('错误响应不应该包含除 error 之外的顶级字段', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息和代码
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          // 生成错误类型选择器
          fc.integer({ min: 0, max: 4 }),
          (message, code, errorType) => {
            const { mockRequest, mockResponse, mockNext, jsonMock } =
              createMockRequestResponse();

            let error: Error;

            // 根据类型创建不同的错误
            switch (errorType) {
              case 0:
                error = new ValidationError(message, code);
                break;
              case 1:
                error = new NotFoundError(message, code);
                break;
              case 2:
                error = new ConflictError(message, code);
                break;
              case 3:
                error = new DatabaseError(message, code);
                break;
              default:
                error = new Error(message);
                break;
            }

            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证响应只包含 error 字段
            const response = jsonMock.mock.calls[0][0];
            const topLevelKeys = Object.keys(response);
            expect(topLevelKeys).toEqual(['error']);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('error 对象必须包含 code 和 message，可选包含 details', () => {
      fc.assert(
        fc.property(
          // 生成任意的错误消息和代码
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          // 生成可选的错误详情
          fc.option(
            fc.dictionary(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.anything()
            ),
            { nil: undefined }
          ),
          (message, code, details) => {
            const { mockRequest, mockResponse, mockNext, jsonMock } =
              createMockRequestResponse();

            const error = new ValidationError(message, code, details);
            errorHandler(
              error,
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );

            // 验证 error 对象的字段
            const response = jsonMock.mock.calls[0][0];
            const errorKeys = Object.keys(response.error);

            // 必须包含 code 和 message
            expect(errorKeys).toContain('code');
            expect(errorKeys).toContain('message');

            // 如果有 details，应该包含；否则不应该包含
            if (details) {
              expect(errorKeys).toContain('details');
            } else {
              expect(errorKeys).not.toContain('details');
            }

            // 不应该有其他字段
            const validKeys = details ? ['code', 'message', 'details'] : ['code', 'message'];
            expect(errorKeys.sort()).toEqual(validKeys.sort());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
