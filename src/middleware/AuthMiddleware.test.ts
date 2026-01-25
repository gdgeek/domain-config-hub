/**
 * AuthMiddleware 测试
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, corsMiddleware, generateToken, verifyToken, JwtPayload } from './AuthMiddleware';
import { config } from '../config/env';

describe('AuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/v1/domains',
      ip: '127.0.0.1',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('generateToken', () => {
    it('应该生成有效的 JWT 令牌', () => {
      const token = generateToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      // 验证令牌可以被解码
      const decoded = jwt.verify(token, process.env.JWT_SECRET || config.adminPassword) as JwtPayload;
      expect(decoded.role).toBe('admin');
    });
  });

  describe('verifyToken', () => {
    it('应该验证有效的令牌', () => {
      const token = generateToken();
      const payload = verifyToken(token);
      
      expect(payload).toBeTruthy();
      expect(payload?.role).toBe('admin');
    });

    it('应该拒绝无效的令牌', () => {
      const payload = verifyToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('应该拒绝过期的令牌', () => {
      // 创建一个已过期的令牌
      const expiredToken = jwt.sign(
        { role: 'admin' },
        process.env.JWT_SECRET || config.adminPassword,
        { expiresIn: '-1s' }
      );
      
      const payload = verifyToken(expiredToken);
      expect(payload).toBeNull();
    });
  });

  describe('authMiddleware', () => {
    describe('GET 请求', () => {
      it('应该允许 GET 请求无需认证', () => {
        mockRequest.method = 'GET';
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('OPTIONS 请求', () => {
      it('应该允许 OPTIONS 请求无需认证', () => {
        mockRequest.method = 'OPTIONS';
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('POST 请求', () => {
      beforeEach(() => {
        mockRequest.method = 'POST';
      });

      it('应该拒绝没有认证令牌的请求', () => {
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: {
            code: 'UNAUTHORIZED',
            message: '此操作需要管理员认证。请先登录获取令牌。',
          },
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('应该拒绝无效格式的认证令牌', () => {
        mockRequest.headers = { authorization: 'InvalidFormat' };
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: '无效的认证令牌格式。格式应为: Bearer <token>',
          },
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('应该拒绝无效的 JWT 令牌', () => {
        mockRequest.headers = { authorization: 'Bearer invalid-token' };
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: {
            code: 'INVALID_TOKEN',
            message: '无效或过期的认证令牌。请重新登录。',
          },
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('应该允许有效的 JWT 令牌', () => {
        const token = generateToken();
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect((mockRequest as any).user).toBeDefined();
        expect((mockRequest as any).user.role).toBe('admin');
      });
    });

    describe('PUT 请求', () => {
      it('应该要求认证', () => {
        mockRequest.method = 'PUT';
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('应该允许有效的令牌', () => {
        mockRequest.method = 'PUT';
        const token = generateToken();
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('DELETE 请求', () => {
      it('应该要求认证', () => {
        mockRequest.method = 'DELETE';
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('应该允许有效的令牌', () => {
        mockRequest.method = 'DELETE';
        const token = generateToken();
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });
  });

  describe('corsMiddleware', () => {
    it('应该设置 CORS 头', () => {
      mockRequest.method = 'GET';
      
      corsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('应该处理 OPTIONS 预检请求', () => {
      mockRequest.method = 'OPTIONS';
      mockRequest.headers = { origin: 'http://example.com' };
      
      corsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
