/**
 * ErrorMiddleware 模块
 * 
 * 提供全局错误处理中间件和异步路由包装器
 * 
 * 需求: 7.1
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ValidationError } from '../errors/ValidationError';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
import { DatabaseError } from '../errors/DatabaseError';
import { logError } from '../config/logger';

/**
 * 异步请求处理器类型
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * 错误响应接口
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * 全局错误处理中间件
 * 
 * 捕获所有错误并返回标准化的错误响应
 * 
 * @param err - 错误对象
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express next 函数
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 记录错误日志
  logError(err, {
    requestId: (req as any).requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    },
  };

  let statusCode = 500;

  // 根据错误类型设置响应
  if (err instanceof ValidationError) {
    statusCode = 400;
    errorResponse.error.code = err.code;
    errorResponse.error.message = err.message;
    if (err.details) {
      errorResponse.error.details = err.details;
    }
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    errorResponse.error.code = err.code;
    errorResponse.error.message = err.message;
  } else if (err instanceof ConflictError) {
    statusCode = 409;
    errorResponse.error.code = err.code;
    errorResponse.error.message = err.message;
  } else if (err instanceof DatabaseError) {
    statusCode = 500;
    errorResponse.error.code = err.code;
    errorResponse.error.message = err.message;
  } else {
    // 未知错误类型
    errorResponse.error.message = err.message || '服务器内部错误';
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

/**
 * 异步路由包装器
 * 
 * 包装异步路由处理器，自动捕获异常并传递给错误处理中间件
 * 
 * @param fn - 异步请求处理器
 * @returns Express 请求处理器
 * 
 * @example
 * router.get('/domains/:domain', asyncHandler(async (req, res) => {
 *   const domain = await service.getByDomain(req.params.domain);
 *   res.json({ data: domain });
 * }));
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 导出错误类以便在其他模块中使用
export { ValidationError } from '../errors/ValidationError';
export { NotFoundError } from '../errors/NotFoundError';
export { ConflictError } from '../errors/ConflictError';
export { DatabaseError } from '../errors/DatabaseError';
