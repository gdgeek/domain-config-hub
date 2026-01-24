/**
 * RequestIdMiddleware 属性测试
 * 
 * 验证请求 ID 中间件的通用属性
 */

import fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './RequestIdMiddleware';

describe('RequestIdMiddleware - Property Tests', () => {
  /**
   * Property 4: 请求 ID 存在且唯一
   * 
   * **验证: 需求 1.4, 7.2**
   * 
   * 对于任意请求，响应头中应包含 X-Request-ID，且多个请求的 ID 应互不相同
   */
  describe('Property 4: 请求 ID 存在且唯一', () => {
    it('任意请求都应该有请求 ID', () => {
      fc.assert(
        fc.property(
          // 生成任意的请求头对象
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string({ maxLength: 100 })
          ),
          (headers) => {
            const mockRequest: Partial<Request> = { headers };
            const mockResponse: Partial<Response> = {
              setHeader: jest.fn(),
            };
            const nextFunction: NextFunction = jest.fn();

            requestIdMiddleware(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // 请求对象应该有 requestId
            expect(mockRequest.requestId).toBeDefined();
            expect(typeof mockRequest.requestId).toBe('string');
            expect(mockRequest.requestId!.length).toBeGreaterThan(0);

            // 响应头应该包含 X-Request-ID
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-Request-ID',
              mockRequest.requestId
            );

            // next 函数应该被调用
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('多个请求的 ID 应该互不相同', () => {
      fc.assert(
        fc.property(
          // 生成一个数字，表示要创建的请求数量
          fc.integer({ min: 2, max: 50 }),
          (numRequests) => {
            const requestIds = new Set<string>();

            for (let i = 0; i < numRequests; i++) {
              const mockRequest: Partial<Request> = { headers: {} };
              const mockResponse: Partial<Response> = {
                setHeader: jest.fn(),
              };
              const nextFunction: NextFunction = jest.fn();

              requestIdMiddleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
              );

              requestIds.add(mockRequest.requestId!);
            }

            // 所有请求 ID 应该是唯一的
            expect(requestIds.size).toBe(numRequests);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('如果请求头包含 x-request-id，应该使用该值', () => {
      fc.assert(
        fc.property(
          // 生成任意的请求 ID 字符串
          fc.string({ minLength: 1, maxLength: 100 }),
          (existingRequestId) => {
            const mockRequest: Partial<Request> = {
              headers: {
                'x-request-id': existingRequestId,
              },
            };
            const mockResponse: Partial<Response> = {
              setHeader: jest.fn(),
            };
            const nextFunction: NextFunction = jest.fn();

            requestIdMiddleware(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // 应该使用请求头中的值
            expect(mockRequest.requestId).toBe(existingRequestId);
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
              'X-Request-ID',
              existingRequestId
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('生成的请求 ID 应该是有效的 UUID v4 格式', () => {
      fc.assert(
        fc.property(
          // 生成任意的请求头对象（不包含 x-request-id）
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }).filter(
              (key) => key.toLowerCase() !== 'x-request-id'
            ),
            fc.string({ maxLength: 100 })
          ),
          (headers) => {
            const mockRequest: Partial<Request> = { headers };
            const mockResponse: Partial<Response> = {
              setHeader: jest.fn(),
            };
            const nextFunction: NextFunction = jest.fn();

            requestIdMiddleware(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(mockRequest.requestId).toMatch(uuidRegex);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('请求对象和响应头中的请求 ID 应该一致', () => {
      fc.assert(
        fc.property(
          // 生成任意的请求头对象
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string({ maxLength: 100 })
          ),
          (headers) => {
            const mockRequest: Partial<Request> = { headers };
            let capturedRequestId: string | undefined;
            const setHeaderMock = jest.fn((name: string, value: string) => {
              if (name === 'X-Request-ID') {
                capturedRequestId = value;
              }
              return mockResponse as Response;
            });
            const mockResponse: Partial<Response> = {
              setHeader: setHeaderMock as any,
            };
            const nextFunction: NextFunction = jest.fn();

            requestIdMiddleware(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // 请求对象和响应头中的请求 ID 应该相同
            expect(mockRequest.requestId).toBe(capturedRequestId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
