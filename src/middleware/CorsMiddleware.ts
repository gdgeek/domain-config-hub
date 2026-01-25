/**
 * CORS 中间件
 * 
 * 策略：
 * - GET 请求（只读）：允许所有跨域访问
 * - POST/PUT/DELETE 请求（写入）：只允许同源访问
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * CORS 中间件
 * 
 * 安全策略：
 * 1. GET 请求：允许跨域，对外提供只读数据
 * 2. POST/PUT/DELETE 请求：拒绝跨域，只允许本系统管理界面访问
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const method = req.method;

  // 记录请求来源
  logger.debug('CORS 请求', {
    method,
    origin,
    path: req.path,
    referer: req.headers.referer,
  });

  // GET 请求：允许所有跨域访问（只读接口）
  if (method === 'GET' || method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24小时

    // 处理 OPTIONS 预检请求
    if (method === 'OPTIONS') {
      logger.debug('处理 OPTIONS 预检请求', { origin, path: req.path });
      res.status(204).end();
      return;
    }

    next();
    return;
  }

  // POST/PUT/DELETE 请求：检查是否为跨域请求
  if (origin) {
    // 有 origin 头表示是跨域请求
    const requestHost = req.get('host');
    const originUrl = new URL(origin);
    const originHost = originUrl.host;

    // 检查是否同源
    if (originHost !== requestHost) {
      logger.warn('拒绝跨域写入请求', {
        method,
        origin,
        requestHost,
        path: req.path,
        ip: req.ip,
      });

      res.status(403).json({
        error: {
          code: 'CORS_FORBIDDEN',
          message: '写入操作不允许跨域访问',
        },
      });
      return;
    }
  }

  // 同源请求：允许通过
  logger.debug('允许同源写入请求', { method, origin, path: req.path });
  next();
}

/**
 * 严格的 CORS 中间件（用于管理员接口）
 * 完全禁止跨域访问
 */
export function strictCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin) {
    const requestHost = req.get('host');
    const originUrl = new URL(origin);
    const originHost = originUrl.host;

    if (originHost !== requestHost) {
      logger.warn('拒绝跨域管理员请求', {
        method: req.method,
        origin,
        requestHost,
        path: req.path,
        ip: req.ip,
      });

      res.status(403).json({
        error: {
          code: 'CORS_FORBIDDEN',
          message: '管理员接口不允许跨域访问',
        },
      });
      return;
    }
  }

  next();
}
