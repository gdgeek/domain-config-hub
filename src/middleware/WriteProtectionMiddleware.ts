/**
 * 写保护中间件
 * 
 * 安全策略：
 * - GET 请求：公开访问（只读）
 * - POST/PUT/DELETE 请求：需要管理员认证
 * 
 * 注意：不依赖 CORS，因为 CORS 只能防御浏览器，无法防止直接 API 调用
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * 写保护中间件
 * 
 * 对于写操作（POST/PUT/DELETE），要求提供有效的管理员令牌
 */
export function writeProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method;

  // GET 和 OPTIONS 请求：允许公开访问
  if (method === 'GET' || method === 'OPTIONS') {
    next();
    return;
  }

  // POST/PUT/DELETE 请求：需要管理员认证
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logger.warn('写操作缺少认证令牌', {
      method,
      path: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '写操作需要管理员认证',
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
        code: 'INVALID_TOKEN',
        message: '无效的认证令牌格式',
      },
    });
    return;
  }

  const token = parts[1];

  // 验证令牌（简单验证：与管理员密码比对）
  // 生产环境应该使用 JWT 或其他更安全的方式
  if (token !== config.adminPassword) {
    logger.warn('无效的管理员令牌', {
      method,
      path: req.path,
      ip: req.ip,
    });

    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: '无效的管理员令牌',
      },
    });
    return;
  }

  // 认证通过
  logger.info('管理员写操作认证通过', {
    method,
    path: req.path,
    ip: req.ip,
  });

  next();
}

/**
 * 公开只读中间件
 * 
 * 设置 CORS 头，允许跨域读取
 * 注意：这只是为了方便浏览器访问，不是安全机制
 */
export function publicReadMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 只对 GET 请求设置 CORS
  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  next();
}
