/**
 * RequestIdMiddleware 模块
 * 
 * 为每个请求生成唯一的请求 ID，用于追踪和日志记录
 * 
 * 需求: 1.4, 7.2
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * 请求 ID 中间件
 * 
 * 为每个请求生成唯一的 UUID 作为请求 ID，并：
 * - 将请求 ID 添加到 req.requestId
 * - 将请求 ID 添加到响应头 X-Request-ID
 * 
 * 如果请求头中已包含 X-Request-ID，则使用该值
 * 
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express next 函数
 * 
 * @example
 * app.use(requestIdMiddleware);
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 从请求头获取现有的请求 ID，或生成新的 UUID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // 将请求 ID 添加到请求对象
  req.requestId = requestId;
  
  // 将请求 ID 添加到响应头
  res.setHeader('X-Request-ID', requestId);
  
  next();
}
