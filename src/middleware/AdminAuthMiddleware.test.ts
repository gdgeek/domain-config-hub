/**
 * AdminAuthMiddleware 单元测试
 */

import { Request, Response, NextFunction } from 'express';
import { adminAuthMiddleware } from './AdminAuthMiddleware';

jest.mock('../config/env', () => ({
  config: {
    adminPassword: 'test-password',
  },
}));

describe('AdminAuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('应该在提供正确 token 时调用 next', () => {
    mockRequest.headers = {
      authorization: 'Bearer test-password',
    };

    adminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('应该在未提供 Authorization 头时返回 401', () => {
    adminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供认证信息',
      },
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('应该在 Authorization 头格式错误时返回 401', () => {
    mockRequest.headers = {
      authorization: 'Basic test-password',
    };

    adminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供认证信息',
      },
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('应该在 token 错误时返回 401', () => {
    mockRequest.headers = {
      authorization: 'Bearer wrong-password',
    };

    adminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: '认证失败',
      },
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
