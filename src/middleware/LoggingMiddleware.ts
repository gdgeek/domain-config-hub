/**
 * LoggingMiddleware 模块
 * 
 * 记录请求和响应日志，包含请求 ID 追踪
 * 
 * 需求: 7.3
 * - 7.3: WHEN 发生错误 THEN Domain_Config_Service SHALL 记录错误详情到日志文件
 * - 7.4: THE 日志 SHALL 使用结构化 JSON 格式并包含时间戳、级别、消息和上下文信息
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * 日志中间件
 * 
 * 记录每个请求的详细信息，包括：
 * - 请求 ID
 * - HTTP 方法
 * - URL
 * - 客户端 IP
 * - 响应状态码
 * - 响应时间
 * 
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express next 函数
 * 
 * @example
 * app.use(loggingMiddleware);
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 记录请求开始时间
  const startTime = Date.now();

  // 记录请求日志
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    // 记录响应日志
    logger.log(logLevel, 'Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}
