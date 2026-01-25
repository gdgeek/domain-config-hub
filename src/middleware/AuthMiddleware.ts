/**
 * 认证和授权中间件
 * 
 * 安全策略：
 * - GET 请求：公开访问，不需要认证
 * - POST/PUT/DELETE 请求：需要有效的 JWT 令牌
 * 
 * JWT 令牌通过 /api/v1/auth/login 接口获取
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * JWT 密钥（从环境变量获取，如果没有则使用管理员密码）
 */
const JWT_SECRET = process.env.JWT_SECRET || config.adminPassword;

/**
 * JWT 过期时间（默认 24 小时）
 */
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

/**
 * JWT 载荷接口
 */
export interface JwtPayload {
  role: 'admin';
  iat?: number;
  exp?: number;
}

/**
 * 生成 JWT 令牌
 */
export function generateToken(): string {
  const payload: JwtPayload = {
    role: 'admin',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string | number,
  } as jwt.SignOptions);
}

/**
 * 验证 JWT 令牌
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error: any) {
    logger.warn('JWT 令牌验证失败', { error: error.message });
    return null;
  }
}

/**
 * 认证中间件
 * 
 * 对于写操作（POST/PUT/DELETE），要求提供有效的 JWT 令牌
 * 对于读操作（GET），允许公开访问
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method;

  // GET 和 OPTIONS 请求：允许公开访问
  if (method === 'GET' || method === 'OPTIONS') {
    next();
    return;
  }

  // POST/PUT/DELETE 请求：需要认证
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logger.warn('写操作缺少认证令牌', {
      method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '此操作需要管理员认证。请先登录获取令牌。',
      },
    });
    return;
  }

  // 验证令牌格式：Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('无效的认证令牌格式', {
      method,
      path: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN_FORMAT',
        message: '无效的认证令牌格式。格式应为: Bearer <token>',
      },
    });
    return;
  }

  const token = parts[1];

  // 验证 JWT 令牌
  const payload = verifyToken(token);
  
  if (!payload) {
    logger.warn('无效或过期的 JWT 令牌', {
      method,
      path: req.path,
      ip: req.ip,
    });

    res.status(403).json({
      error: {
        code: 'INVALID_TOKEN',
        message: '无效或过期的认证令牌。请重新登录。',
      },
    });
    return;
  }

  // 认证通过
  logger.info('管理员认证通过', {
    method,
    path: req.path,
    ip: req.ip,
    role: payload.role,
  });

  // 将用户信息附加到请求对象
  (req as any).user = payload;

  next();
}

/**
 * CORS 中间件（用于公开只读接口）
 * 
 * 允许跨域访问 GET 请求
 * 注意：这只是为了方便浏览器访问，真正的安全由 authMiddleware 保证
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method;

  // 对所有请求设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时

  // OPTIONS 预检请求
  if (method === 'OPTIONS') {
    logger.debug('处理 CORS 预检请求', {
      origin: req.headers.origin,
      path: req.path,
    });
    res.status(204).end();
    return;
  }

  next();
}
