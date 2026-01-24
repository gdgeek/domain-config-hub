/**
 * ValidationMiddleware 集成测试
 * 
 * 测试验证中间件与实际 schema 的集成
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateBody,
  validateQuery,
  validateParams,
} from './ValidationMiddleware';
import {
  domainParamSchema,
  createDomainSchema,
  updateDomainSchema,
  paginationSchema,
  idParamSchema,
} from '../validation/schemas';
import { ValidationError } from '../errors/ValidationError';

describe('ValidationMiddleware - Integration Tests', () => {
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('Integration with domainParamSchema', () => {
    it('should validate valid domain parameter', () => {
      const mockRequest = {
        params: { domain: 'example.com' },
      } as Partial<Request>;

      const middleware = validateParams(domainParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.params).toEqual({ domain: 'example.com' });
    });

    it('should reject empty domain', () => {
      const mockRequest = {
        params: { domain: '' },
      } as Partial<Request>;

      const middleware = validateParams(domainParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject domain exceeding 255 characters', () => {
      const mockRequest = {
        params: { domain: 'a'.repeat(256) },
      } as Partial<Request>;

      const middleware = validateParams(domainParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Integration with createDomainSchema', () => {
    it('should validate valid domain creation data', () => {
      const mockRequest = {
        body: {
          domain: 'example.com',
          title: 'Example Site',
          author: 'John Doe',
          description: 'A test site',
          keywords: 'test, example',
          links: { home: 'https://example.com' },
        },
      } as Partial<Request>;

      const middleware = validateBody(createDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body.domain).toBe('example.com');
    });

    it('should accept null and empty string for optional fields', () => {
      const mockRequest = {
        body: {
          domain: 'example.com',
          title: null,
          author: '',
          description: null,
          keywords: '',
          links: null,
        },
      } as Partial<Request>;

      const middleware = validateBody(createDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject missing required domain field', () => {
      const mockRequest = {
        body: {
          title: 'Example Site',
        },
      } as Partial<Request>;

      const middleware = validateBody(createDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      const errors = error.details?.errors as Array<{ field: string }>;
      expect(errors.some(e => e.field === 'domain')).toBe(true);
    });

    it('should reject fields exceeding 255 characters', () => {
      const mockRequest = {
        body: {
          domain: 'example.com',
          title: 'a'.repeat(256),
        },
      } as Partial<Request>;

      const middleware = validateBody(createDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject invalid links field', () => {
      const mockRequest = {
        body: {
          domain: 'example.com',
          links: 'not an object',
        },
      } as Partial<Request>;

      const middleware = validateBody(createDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Integration with updateDomainSchema', () => {
    it('should validate valid update data', () => {
      const mockRequest = {
        body: {
          title: 'Updated Title',
          description: 'Updated description',
        },
      } as Partial<Request>;

      const middleware = validateBody(updateDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should accept empty body for partial updates', () => {
      const mockRequest = {
        body: {},
      } as Partial<Request>;

      const middleware = validateBody(updateDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject fields exceeding 255 characters', () => {
      const mockRequest = {
        body: {
          author: 'a'.repeat(256),
        },
      } as Partial<Request>;

      const middleware = validateBody(updateDomainSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Integration with paginationSchema', () => {
    it('should validate valid pagination parameters', () => {
      const mockRequest = {
        query: { page: '2', pageSize: '50' },
      } as Partial<Request>;

      const middleware = validateQuery(paginationSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: 2, pageSize: 50 });
    });

    it('should apply default values when parameters are missing', () => {
      const mockRequest = {
        query: {},
      } as Partial<Request>;

      const middleware = validateQuery(paginationSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: 1, pageSize: 20 });
    });

    it('should reject page less than 1', () => {
      const mockRequest = {
        query: { page: '0' },
      } as Partial<Request>;

      const middleware = validateQuery(paginationSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject pageSize greater than 100', () => {
      const mockRequest = {
        query: { pageSize: '101' },
      } as Partial<Request>;

      const middleware = validateQuery(paginationSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject non-numeric values', () => {
      const mockRequest = {
        query: { page: 'abc' },
      } as Partial<Request>;

      const middleware = validateQuery(paginationSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Integration with idParamSchema', () => {
    it('should validate valid ID parameter', () => {
      const mockRequest = {
        params: { id: '123' },
      } as Partial<Request>;

      const middleware = validateParams(idParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.params).toEqual({ id: 123 });
    });

    it('should reject negative ID', () => {
      const mockRequest = {
        params: { id: '-1' },
      } as Partial<Request>;

      const middleware = validateParams(idParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject zero ID', () => {
      const mockRequest = {
        params: { id: '0' },
      } as Partial<Request>;

      const middleware = validateParams(idParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject non-numeric ID', () => {
      const mockRequest = {
        params: { id: 'abc' },
      } as Partial<Request>;

      const middleware = validateParams(idParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('Error message localization', () => {
    it('should return Chinese error messages', () => {
      const mockRequest = {
        params: { domain: '' },
      } as Partial<Request>;

      const middleware = validateParams(domainParamSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      expect(error.message).toBe('请求数据验证失败');
      
      const errors = error.details?.errors as Array<{ message: string }>;
      // Should contain Chinese error message
      expect(errors.some(e => e.message.includes('域名'))).toBe(true);
    });
  });
});
