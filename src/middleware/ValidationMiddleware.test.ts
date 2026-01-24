/**
 * ValidationMiddleware 单元测试
 * 
 * 测试验证中间件的功能
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
} from './ValidationMiddleware';
import { ValidationError } from '../errors/ValidationError';

describe('ValidationMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateRequest', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0),
    });

    it('should pass validation with valid data', () => {
      mockRequest.body = { name: 'John', age: 25 };
      const middleware = validateRequest(schema, 'body');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John', age: 25 });
    });

    it('should apply default values from schema', () => {
      const schemaWithDefaults = Joi.object({
        name: Joi.string().required(),
        status: Joi.string().default('active'),
      });

      mockRequest.body = { name: 'John' };
      const middleware = validateRequest(schemaWithDefaults, 'body');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John', status: 'active' });
    });

    it('should convert types when convert option is enabled', () => {
      mockRequest.query = { page: '1', pageSize: '20' };
      const paginationSchema = Joi.object({
        page: Joi.number().integer(),
        pageSize: Joi.number().integer(),
      });

      const middleware = validateRequest(paginationSchema, 'query');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: 1, pageSize: 20 });
    });

    it('should strip unknown fields', () => {
      mockRequest.body = { name: 'John', age: 25, extra: 'field' };
      const middleware = validateRequest(schema, 'body');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John', age: 25 });
      expect(mockRequest.body).not.toHaveProperty('extra');
    });

    it('should fail validation with missing required field', () => {
      mockRequest.body = { age: 25 };
      const middleware = validateRequest(schema, 'body');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as ValidationError;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('请求数据验证失败');
      expect(error.details).toHaveProperty('errors');
    });

    it('should fail validation with invalid data type', () => {
      mockRequest.body = { name: 'John', age: 'invalid' };
      const middleware = validateRequest(schema, 'body');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as ValidationError;
      expect(error.details?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            type: expect.stringContaining('number'),
          }),
        ])
      );
    });

    it('should collect all validation errors (abortEarly: false)', () => {
      const strictSchema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        age: Joi.number().min(18).required(),
      });

      mockRequest.body = { name: '', email: 'invalid-email' };
      const middleware = validateRequest(strictSchema, 'body');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as ValidationError;
      const errors = error.details?.errors as Array<{ field: string }>;
      
      // Should have multiple errors
      expect(errors.length).toBeGreaterThan(1);
      
      // Check that we have errors for multiple fields
      const fields = errors.map(e => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('email');
      expect(fields).toContain('age');
    });

    it('should validate query parameters', () => {
      mockRequest.query = { search: 'test' };
      const querySchema = Joi.object({
        search: Joi.string().required(),
      });

      const middleware = validateRequest(querySchema, 'query');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ search: 'test' });
    });

    it('should validate path parameters', () => {
      mockRequest.params = { id: '123' };
      const paramsSchema = Joi.object({
        id: Joi.number().required(),
      });

      const middleware = validateRequest(paramsSchema, 'params');

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.params).toEqual({ id: 123 });
    });
  });

  describe('validateBody', () => {
    it('should validate request body', () => {
      const schema = Joi.object({
        title: Joi.string().required(),
      });

      mockRequest.body = { title: 'Test Title' };
      const middleware = validateBody(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ title: 'Test Title' });
    });

    it('should fail validation for invalid body', () => {
      const schema = Joi.object({
        title: Joi.string().required(),
      });

      mockRequest.body = {};
      const middleware = validateBody(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      const schema = Joi.object({
        page: Joi.number().default(1),
        pageSize: Joi.number().default(20),
      });

      mockRequest.query = { page: '2' };
      const middleware = validateQuery(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: 2, pageSize: 20 });
    });

    it('should fail validation for invalid query', () => {
      const schema = Joi.object({
        page: Joi.number().min(1).required(),
      });

      mockRequest.query = { page: '0' };
      const middleware = validateQuery(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateParams', () => {
    it('should validate path parameters', () => {
      const schema = Joi.object({
        domain: Joi.string().required(),
      });

      mockRequest.params = { domain: 'example.com' };
      const middleware = validateParams(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.params).toEqual({ domain: 'example.com' });
    });

    it('should fail validation for invalid params', () => {
      const schema = Joi.object({
        id: Joi.number().positive().required(),
      });

      mockRequest.params = { id: '-1' };
      const middleware = validateParams(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Error details format', () => {
    it('should format error details correctly', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        age: Joi.number().min(18).required(),
      });

      mockRequest.body = { email: 'invalid', age: 10 };
      const middleware = validateBody(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as ValidationError;
      
      expect(error.details).toHaveProperty('errors');
      const errors = error.details?.errors as Array<{
        field: string;
        message: string;
        type: string;
      }>;

      expect(Array.isArray(errors)).toBe(true);
      errors.forEach((err) => {
        expect(err).toHaveProperty('field');
        expect(err).toHaveProperty('message');
        expect(err).toHaveProperty('type');
        expect(typeof err.field).toBe('string');
        expect(typeof err.message).toBe('string');
        expect(typeof err.type).toBe('string');
      });
    });

    it('should handle nested field paths correctly', () => {
      const schema = Joi.object({
        user: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
        }).required(),
      });

      mockRequest.body = { user: { name: '' } };
      const middleware = validateBody(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as ValidationError;
      const errors = error.details?.errors as Array<{ field: string }>;

      // Should have errors with nested paths
      const fields = errors.map(e => e.field);
      expect(fields).toContain('user.name');
      expect(fields).toContain('user.email');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty body', () => {
      const schema = Joi.object({
        name: Joi.string().optional(),
      });

      mockRequest.body = {};
      const middleware = validateBody(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle null values when allowed', () => {
      const schema = Joi.object({
        title: Joi.string().allow(null),
      });

      mockRequest.body = { title: null };
      const middleware = validateBody(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body.title).toBeNull();
    });

    it('should handle empty strings when allowed', () => {
      const schema = Joi.object({
        description: Joi.string().allow(''),
      });

      mockRequest.body = { description: '' };
      const middleware = validateBody(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body.description).toBe('');
    });
  });
});
