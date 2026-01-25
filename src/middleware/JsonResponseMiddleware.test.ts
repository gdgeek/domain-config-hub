/**
 * JSON 响应中间件测试
 */

import { Request, Response, NextFunction } from 'express';
import { jsonResponseMiddleware } from './JsonResponseMiddleware';

describe('JsonResponseMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      statusCode: 200,
    };
    nextFunction = jest.fn();
  });

  it('应该调用 next()', () => {
    jsonResponseMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
  });

  it('应该重写 res.json 方法', () => {
    const originalJson = mockResponse.json;
    
    jsonResponseMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.json).not.toBe(originalJson);
  });

  describe('API 请求（非浏览器）', () => {
    beforeEach(() => {
      mockRequest.headers = {
        accept: 'application/json',
        'user-agent': 'curl/7.68.0',
      };
    });

    it('应该返回 JSON 格式', () => {
      jsonResponseMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const data = { message: 'test' };
      mockResponse.json!(data);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json; charset=utf-8'
      );
    });

    it('应该设置 X-Content-Type-Options', () => {
      jsonResponseMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const data = { message: 'test' };
      mockResponse.json!(data);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
    });
  });

  describe('浏览器请求', () => {
    beforeEach(() => {
      mockRequest.headers = {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      };
    });

    it('应该返回 HTML 格式', () => {
      jsonResponseMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const data = { message: 'test' };
      mockResponse.json!(data);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8'
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('应该设置 X-Content-Type-Options', () => {
      jsonResponseMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const data = { message: 'test' };
      mockResponse.json!(data);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
    });

    it('生成的 HTML 应该包含 JSON 数据', () => {
      jsonResponseMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const data = { message: 'test', value: 123 };
      mockResponse.json!(data);

      const sendCall = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sendCall).toContain('<!DOCTYPE html>');
      expect(sendCall).toContain('test');
      expect(sendCall).toContain('123');
    });
  });

  describe('明确请求 JSON 的浏览器', () => {
    beforeEach(() => {
      mockRequest.headers = {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      };
    });

    it('应该返回 JSON 而不是 HTML', () => {
      jsonResponseMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const data = { message: 'test' };
      mockResponse.json!(data);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json; charset=utf-8'
      );
      expect(mockResponse.send).not.toHaveBeenCalled();
    });
  });
});
