/**
 * ValidationMiddleware 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import fc from 'fast-check';
import {
  validateBody,
  validateQuery,
  validateParams,
} from './ValidationMiddleware';
import { ValidationError } from '../errors/ValidationError';

describe('ValidationMiddleware - Property Tests', () => {
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('Property: Valid data always passes validation', () => {
    /**
     * **Feature: domain-config-service, Property: Valid data always passes validation**
     * 
     * 对于任意符合 schema 定义的有效数据，验证中间件应该：
     * - 调用 next() 而不传递错误
     * - 将验证后的数据（包含默认值）设置到请求对象
     * 
     * **验证: 需求 4.4**
     */
    it('should always pass validation for valid string data', async () => {
      const schema = Joi.object({
        name: Joi.string().min(1).max(100).required(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (name) => {
            const mockRequest = {
              body: { name },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            // Should call next without error
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockNext).toHaveBeenCalledTimes(1);
            
            // Should not pass an error
            const callArg = mockNext.mock.calls[0][0];
            expect(callArg).toBeUndefined();

            // Should set validated data
            expect(mockRequest.body).toEqual({ name });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always pass validation for valid numeric data', async () => {
      const schema = Joi.object({
        age: Joi.number().integer().min(0).max(150).required(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 150 }),
          async (age) => {
            const mockRequest = {
              body: { age },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            const callArg = mockNext.mock.calls[0][0];
            expect(callArg).toBeUndefined();
            expect(mockRequest.body).toEqual({ age });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always pass validation for valid optional fields', async () => {
      const schema = Joi.object({
        title: Joi.string().max(255).allow(null, ''),
        description: Joi.string().max(255).allow(null, ''),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.string({ maxLength: 255 }), { nil: null }),
          fc.option(fc.string({ maxLength: 255 }), { nil: null }),
          async (title, description) => {
            const mockRequest = {
              body: { title, description },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            const callArg = mockNext.mock.calls[0][0];
            expect(callArg).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Invalid data always fails validation', () => {
    /**
     * **Feature: domain-config-service, Property: Invalid data always fails validation**
     * 
     * 对于任意不符合 schema 定义的无效数据，验证中间件应该：
     * - 调用 next() 并传递 ValidationError
     * - 错误包含标准化的错误详情
     * 
     * **验证: 需求 4.4**
     */
    it('should always fail validation for strings exceeding max length', async () => {
      const schema = Joi.object({
        name: Joi.string().max(10).required(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 11, maxLength: 100 }),
          async (name) => {
            const mockRequest = {
              body: { name },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            const error = mockNext.mock.calls[0][0] as ValidationError;
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.details).toHaveProperty('errors');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always fail validation for numbers outside range', async () => {
      const schema = Joi.object({
        age: Joi.number().integer().min(0).max(150).required(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 151, max: 1000 }),
          async (age) => {
            const mockRequest = {
              body: { age },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            const error = mockNext.mock.calls[0][0] as ValidationError;
            expect(error.code).toBe('VALIDATION_ERROR');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always fail validation for missing required fields', async () => {
      const schema = Joi.object({
        requiredField: Joi.string().required(),
        optionalField: Joi.string().optional(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.string(), { nil: undefined }),
          async (optionalField) => {
            const mockRequest = {
              body: { optionalField },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            const error = mockNext.mock.calls[0][0] as ValidationError;
            expect(error.code).toBe('VALIDATION_ERROR');
            
            const errors = error.details?.errors as Array<{ field: string }>;
            const fields = errors.map(e => e.field);
            expect(fields).toContain('requiredField');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Type conversion consistency', () => {
    /**
     * **Feature: domain-config-service, Property: Type conversion consistency**
     * 
     * 对于任意可转换的数据类型，验证中间件应该：
     * - 正确转换数据类型（如字符串转数字）
     * - 转换后的数据符合 schema 定义
     * 
     * **验证: 需求 4.4**
     */
    it('should consistently convert string numbers to integers', async () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).required(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          async (page) => {
            const mockRequest = {
              query: { page: String(page) },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateQuery(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            const callArg = mockNext.mock.calls[0][0];
            expect(callArg).toBeUndefined();
            
            // Should convert string to number
            expect(mockRequest.query).toEqual({ page });
            expect(typeof (mockRequest.query as any).page).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently apply default values', async () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        status: Joi.string().default('active'),
        priority: Joi.number().default(0),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (name) => {
            const mockRequest = {
              body: { name },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            
            // Should apply default values
            expect(mockRequest.body).toEqual({
              name,
              status: 'active',
              priority: 0,
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Unknown fields are stripped', () => {
    /**
     * **Feature: domain-config-service, Property: Unknown fields are stripped**
     * 
     * 对于任意包含未定义字段的数据，验证中间件应该：
     * - 移除所有未在 schema 中定义的字段
     * - 保留所有在 schema 中定义的字段
     * 
     * **验证: 需求 4.4**
     */
    it('should always strip unknown fields from body', async () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().optional(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.integer({ min: 0, max: 150 }), { nil: undefined }),
          fc.dictionary(fc.string(), fc.anything()),
          async (name, age, extraFields) => {
            const body: any = { name, ...extraFields };
            if (age !== undefined) {
              body.age = age;
            }

            const mockRequest = {
              body,
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            // If validation passes
            if (mockNext.mock.calls[0][0] === undefined) {
              // Should only have defined fields
              const resultKeys = Object.keys(mockRequest.body);
              expect(resultKeys.every(key => ['name', 'age'].includes(key))).toBe(true);
              expect(mockRequest.body.name).toBe(name);
              if (age !== undefined) {
                expect(mockRequest.body.age).toBe(age);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Error details format consistency', () => {
    /**
     * **Feature: domain-config-service, Property: Error details format consistency**
     * 
     * 对于任意验证失败的情况，错误详情应该：
     * - 包含 errors 数组
     * - 每个错误包含 field、message、type 字段
     * - 所有字段都是字符串类型
     * 
     * **验证: 需求 4.4**
     */
    it('should always format error details consistently', async () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        age: Joi.number().min(18).max(100).required(),
        name: Joi.string().min(2).max(50).required(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.anything(),
          fc.anything(),
          async (email, age, name) => {
            const mockRequest = {
              body: { email, age, name },
            } as Partial<Request>;

            mockNext.mockClear();
            const middleware = validateBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            const callArg = mockNext.mock.calls[0][0];
            
            // If validation failed
            if (callArg instanceof ValidationError) {
              const error = callArg as ValidationError;
              
              // Should have standard error structure
              expect(error.code).toBe('VALIDATION_ERROR');
              expect(error.message).toBe('请求数据验证失败');
              expect(error.details).toHaveProperty('errors');
              
              const errors = error.details?.errors as Array<any>;
              expect(Array.isArray(errors)).toBe(true);
              expect(errors.length).toBeGreaterThan(0);
              
              // Each error should have correct format
              errors.forEach((err) => {
                expect(err).toHaveProperty('field');
                expect(err).toHaveProperty('message');
                expect(err).toHaveProperty('type');
                expect(typeof err.field).toBe('string');
                expect(typeof err.message).toBe('string');
                expect(typeof err.type).toBe('string');
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Validation type independence', () => {
    /**
     * **Feature: domain-config-service, Property: Validation type independence**
     * 
     * 对于任意验证类型（body/query/params），验证行为应该一致：
     * - 相同的 schema 应该产生相同的验证结果
     * - 验证逻辑不依赖于数据来源
     * 
     * **验证: 需求 4.4**
     */
    it('should validate consistently across body, query, and params', async () => {
      const schema = Joi.object({
        value: Joi.string().min(1).max(50).required(),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (value) => {
            // Test body
            const bodyRequest = { body: { value } } as Partial<Request>;
            mockNext.mockClear();
            validateBody(schema)(bodyRequest as Request, mockResponse as Response, mockNext);
            const bodyResult = mockNext.mock.calls[0][0];

            // Test query
            const queryRequest = { query: { value } } as Partial<Request>;
            mockNext.mockClear();
            validateQuery(schema)(queryRequest as Request, mockResponse as Response, mockNext);
            const queryResult = mockNext.mock.calls[0][0];

            // Test params
            const paramsRequest = { params: { value } } as Partial<Request>;
            mockNext.mockClear();
            validateParams(schema)(paramsRequest as Request, mockResponse as Response, mockNext);
            const paramsResult = mockNext.mock.calls[0][0];

            // All should pass validation
            expect(bodyResult).toBeUndefined();
            expect(queryResult).toBeUndefined();
            expect(paramsResult).toBeUndefined();

            // All should have the same validated value
            expect(bodyRequest.body).toEqual({ value });
            expect(queryRequest.query).toEqual({ value });
            expect(paramsRequest.params).toEqual({ value });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
